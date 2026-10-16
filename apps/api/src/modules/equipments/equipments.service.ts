import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  EquipmentScope,
  Prisma,
  ResourceStatus,
  ResourceType,
} from '@prisma/client';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import {
  paginate,
  paginationArgs,
} from '../../common/dto/pagination.dto.js';
import { toPlainJson } from '../../common/utils/to-plain-json.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { ListEquipmentsQueryDto } from './dto/list-equipments-query.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';
import {
  EQUIPMENT_BLOCKING_STATUSES,
  EquipmentAvailabilityService,
} from './equipment-availability.service.js';
import { isScopeCompatible } from './equipment-usage.js';

const equipmentSelect = {
  id: true,
  name: true,
  description: true,
  quantity: true,
  scope: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.EquipmentSelect;

const NAME_TAKEN_MESSAGE = 'Un équipement porte déjà ce nom.';

/** Group-wide catalogue: only a GROUP_ADMIN administers it (explicit business rule). */
@Injectable()
export class EquipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly audit: AuditService,
    private readonly availability: EquipmentAvailabilityService,
  ) {}

  async list(actor: AuthenticatedUser, query: ListEquipmentsQueryDto) {
    const isGroupAdmin = this.accessScope.isGroupAdmin(actor);
    const status = isGroupAdmin ? query.status : ResourceStatus.AVAILABLE;
    const search = query.search?.trim();

    const where: Prisma.EquipmentWhereInput = {
      ...(status ? { status } : {}),
      ...(query.scope ? { scope: query.scope } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.equipment.count({ where }),
      this.prisma.equipment.findMany({
        where,
        select: equipmentSelect,
        orderBy: { name: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      select: equipmentSelect,
    });
    const visible =
      equipment &&
      (this.accessScope.isGroupAdmin(actor) ||
        equipment.status === ResourceStatus.AVAILABLE);
    if (!visible) {
      throw new NotFoundException('Équipement introuvable.');
    }
    return equipment;
  }

  async create(dto: CreateEquipmentDto, actor: AuthenticatedUser) {
    this.assertGroupAdmin(actor);
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    const equipment = await this.prisma.equipment
      .create({
        data: {
          name,
          description: dto.description?.trim() || null,
          quantity: dto.quantity,
          scope: dto.scope,
        },
        select: equipmentSelect,
      })
      .catch((error: unknown) => this.rethrowNameConflict(error));

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Equipment',
      entityId: equipment.id,
      metadata: {
        name: equipment.name,
        quantity: equipment.quantity,
        scope: equipment.scope,
      },
    });

    return equipment;
  }

  async update(id: string, dto: UpdateEquipmentDto, actor: AuthenticatedUser) {
    this.assertGroupAdmin(actor);
    const existing = await this.findById(id, actor);
    const name = dto.name?.trim();
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      await this.assertNameAvailable(name, id);
    }

    const equipment = await this.prisma.$transaction(async (tx) => {
      // Same lock as the reservation checks: no booking can slip in between the check and the write.
      await this.availability.lockEquipments(tx, [id]);

      if (dto.quantity !== undefined && dto.quantity < existing.quantity) {
        const committed = await this.availability.getPeakCommittedFrom(tx, id, new Date());
        if (dto.quantity < committed) {
          throw new ConflictException(
            `Impossible de réduire le stock à ${dto.quantity} : ${committed} unité(s) sont déjà engagées sur des réservations à venir.`,
          );
        }
      }
      if (dto.scope !== undefined && dto.scope !== existing.scope) {
        await this.assertScopeKeepsFutureReservations(tx, id, dto.scope);
      }

      return tx.equipment
        .update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(dto.description !== undefined
              ? { description: dto.description?.trim() || null }
              : {}),
            ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
            ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
          },
          select: equipmentSelect,
        })
        .catch((error: unknown) => this.rethrowNameConflict(error));
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'Equipment',
      entityId: id,
      metadata: {
        before: {
          name: existing.name,
          description: existing.description,
          quantity: existing.quantity,
          scope: existing.scope,
        },
        after: toPlainJson(dto),
      },
    });

    return equipment;
  }

  async updateStatus(id: string, status: ResourceStatus, actor: AuthenticatedUser) {
    this.assertGroupAdmin(actor);
    const existing = await this.findById(id, actor);

    const equipment = await this.prisma.equipment.update({
      where: { id },
      data: { status },
      select: equipmentSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'Equipment',
      entityId: id,
      metadata: { from: existing.status, to: status },
    });

    return equipment;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    this.assertGroupAdmin(actor);
    const existing = await this.findById(id, actor);

    const usageCount = await this.prisma.reservationEquipment.count({
      where: { equipmentId: id },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        'Cet équipement figure dans des réservations : mettez-le hors service plutôt que de le supprimer.',
      );
    }

    await this.prisma.equipment.delete({ where: { id } });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.DELETE,
      entity: 'Equipment',
      entityId: id,
      metadata: { name: existing.name },
    });

    return { deleted: true, message: 'Équipement supprimé.' };
  }

  private assertGroupAdmin(actor: AuthenticatedUser): void {
    if (!this.accessScope.isGroupAdmin(actor)) {
      throw new ForbiddenException(
        'Seul un administrateur Groupe peut gérer le catalogue d’équipements.',
      );
    }
  }

  private async assertNameAvailable(name: string, excludeId?: string): Promise<void> {
    const duplicate = await this.prisma.equipment.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(NAME_TAKEN_MESSAGE);
    }
  }

  private rethrowNameConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(NAME_TAKEN_MESSAGE);
    }
    throw error;
  }

  /** A new scope must stay compatible with the upcoming reservations that use the equipment. */
  private async assertScopeKeepsFutureReservations(
    tx: Prisma.TransactionClient,
    equipmentId: string,
    scope: EquipmentScope,
  ): Promise<void> {
    const incompatibleTypes = [ResourceType.ROOM, ResourceType.VEHICLE].filter(
      (type) => !isScopeCompatible(scope, type),
    );
    if (incompatibleTypes.length === 0) return;

    const blocking = await tx.reservationEquipment.count({
      where: {
        equipmentId,
        reservation: {
          status: { in: EQUIPMENT_BLOCKING_STATUSES },
          endAt: { gt: new Date() },
          resourceType: { in: incompatibleTypes },
        },
      },
    });
    if (blocking > 0) {
      throw new ConflictException(
        'Des réservations à venir utilisent cet équipement avec un type de ressource que le nouveau périmètre exclut.',
      );
    }
  }
}
