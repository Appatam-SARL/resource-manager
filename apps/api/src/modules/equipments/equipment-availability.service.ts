import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ReservationStatus,
  ResourceStatus,
  ResourceType,
} from '@prisma/client';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { EquipmentAvailabilityQueryDto } from './dto/equipment-availability-query.dto.js';
import {
  computePeakUsage,
  isScopeCompatible,
  scopesForResourceType,
  type EquipmentUsageInterval,
} from './equipment-usage.js';

/** Same blocking statuses as the resources: CANCELLED, REJECTED and COMPLETED free the stock. */
export const EQUIPMENT_BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
];

export type RequestedEquipment = { equipmentId: string; quantity: number };

/** Lets clients tell an equipment shortage apart from a resource slot conflict (both are 409). */
export const EQUIPMENT_UNAVAILABLE_ERROR_CODE = 'EQUIPMENT_UNAVAILABLE';

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  [ResourceType.VEHICLE]: 'un véhicule',
  [ResourceType.ROOM]: 'une salle',
};

@Injectable()
export class EquipmentAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
  ) {}

  /**
   * Bookable equipment for a slot. Only quantities are exposed: never the requester,
   * the subject or the identity of the reservations consuming the stock.
   */
  async getAvailability(actor: AuthenticatedUser, query: EquipmentAvailabilityQueryDto) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Dates invalides.');
    }
    if (!(startAt < endAt)) {
      throw new BadRequestException(
        'La date/heure de début doit être antérieure à la date/heure de fin.',
      );
    }
    if (query.excludeReservationId) {
      await this.assertCanViewReservation(actor, query.excludeReservationId);
    }

    const equipments = await this.prisma.equipment.findMany({
      where: {
        status: ResourceStatus.AVAILABLE,
        scope: { in: scopesForResourceType(query.resourceType) },
      },
      select: {
        id: true,
        name: true,
        description: true,
        scope: true,
        quantity: true,
      },
      orderBy: { name: 'asc' },
    });

    const available = await this.computeAvailableQuantities(this.prisma, {
      equipments,
      startAt,
      endAt,
      excludeReservationId: query.excludeReservationId,
    });

    return equipments.map((equipment) => ({
      ...equipment,
      availableQuantity: available.get(equipment.id) ?? 0,
    }));
  }

  /**
   * Must run inside the reservation transaction: takes one advisory lock per equipment
   * (sorted ids, so concurrent transactions always lock in the same order), then checks
   * existence, status, scope and the stock left on [startAt, endAt[.
   */
  async assertEquipmentsBookable(
    tx: Prisma.TransactionClient,
    input: {
      resourceType: ResourceType;
      startAt: Date;
      endAt: Date;
      items: RequestedEquipment[];
      excludeReservationId?: string;
    },
  ): Promise<void> {
    if (input.items.length === 0) return;

    const ids = [...new Set(input.items.map((item) => item.equipmentId))];
    await this.lockEquipments(tx, ids);

    const equipments = await tx.equipment.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, quantity: true, scope: true, status: true },
    });
    const byId = new Map(equipments.map((equipment) => [equipment.id, equipment]));

    for (const item of input.items) {
      const equipment = byId.get(item.equipmentId);
      if (!equipment) {
        throw new NotFoundException('Équipement introuvable.');
      }
      if (equipment.status !== ResourceStatus.AVAILABLE) {
        throw new BadRequestException(
          `L’équipement « ${equipment.name} » n’est pas disponible (maintenance ou hors service).`,
        );
      }
      if (!isScopeCompatible(equipment.scope, input.resourceType)) {
        throw new BadRequestException(
          `L’équipement « ${equipment.name} » ne peut pas être demandé pour ${RESOURCE_TYPE_LABELS[input.resourceType]}.`,
        );
      }
    }

    const available = await this.computeAvailableQuantities(tx, {
      equipments,
      startAt: input.startAt,
      endAt: input.endAt,
      excludeReservationId: input.excludeReservationId,
    });

    for (const item of input.items) {
      const equipment = byId.get(item.equipmentId)!;
      const left = available.get(equipment.id) ?? 0;
      if (item.quantity > left) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: EQUIPMENT_UNAVAILABLE_ERROR_CODE,
          message: `Équipement indisponible sur ce créneau : ${equipment.name} (${left} disponible(s)).`,
        });
      }
    }
  }

  /** Units of one equipment used at the busiest moment from `from` onwards (open-ended). */
  async getPeakCommittedFrom(
    client: Prisma.TransactionClient,
    equipmentId: string,
    from: Date,
  ): Promise<number> {
    const usage = await this.findUsageIntervals(client, [equipmentId], from, null);
    return computePeakUsage(usage.get(equipmentId) ?? [], from, null);
  }

  /** Serializes stock checks per equipment; `hashtext` keeps PostgreSQL < 11 compatibility. */
  async lockEquipments(tx: Prisma.TransactionClient, equipmentIds: string[]): Promise<void> {
    const sorted = [...new Set(equipmentIds)].sort();
    for (const id of sorted) {
      const lockKey = `equipment:${id}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    }
  }

  private async computeAvailableQuantities(
    client: Prisma.TransactionClient,
    input: {
      equipments: { id: string; quantity: number }[];
      startAt: Date;
      endAt: Date;
      excludeReservationId?: string;
    },
  ): Promise<Map<string, number>> {
    const usage = await this.findUsageIntervals(
      client,
      input.equipments.map((equipment) => equipment.id),
      input.startAt,
      input.endAt,
      input.excludeReservationId,
    );
    return new Map(
      input.equipments.map((equipment) => {
        const peak = computePeakUsage(
          usage.get(equipment.id) ?? [],
          input.startAt,
          input.endAt,
        );
        return [equipment.id, Math.max(0, equipment.quantity - peak)];
      }),
    );
  }

  private async findUsageIntervals(
    client: Prisma.TransactionClient,
    equipmentIds: string[],
    startAt: Date,
    endAt: Date | null,
    excludeReservationId?: string,
  ): Promise<Map<string, EquipmentUsageInterval[]>> {
    const result = new Map<string, EquipmentUsageInterval[]>();
    if (equipmentIds.length === 0) return result;

    const rows = await client.reservationEquipment.findMany({
      where: {
        equipmentId: { in: equipmentIds },
        reservation: {
          status: { in: EQUIPMENT_BLOCKING_STATUSES },
          endAt: { gt: startAt },
          ...(endAt ? { startAt: { lt: endAt } } : {}),
          ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        },
      },
      select: {
        equipmentId: true,
        quantity: true,
        reservation: { select: { startAt: true, endAt: true } },
      },
    });

    for (const row of rows) {
      const intervals = result.get(row.equipmentId) ?? [];
      intervals.push({
        startAt: row.reservation.startAt,
        endAt: row.reservation.endAt,
        quantity: row.quantity,
      });
      result.set(row.equipmentId, intervals);
    }
    return result;
  }

  private async assertCanViewReservation(
    actor: AuthenticatedUser,
    reservationId: string,
  ): Promise<void> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { companyId: true, directionId: true, userId: true },
    });
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable.');
    }
    if (!this.accessScope.canViewReservation(actor, reservation)) {
      throw new ForbiddenException('Accès refusé à cette réservation.');
    }
  }
}
