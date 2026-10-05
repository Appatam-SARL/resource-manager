import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  EntityStatus,
  Prisma,
  ReservationStatus,
  ResourceStatus,
  ResourceType,
  Role,
  UserStatus,
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
import { reservationNotificationMessages } from '../notifications/notification-messages.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { REALTIME_EVENTS } from '../realtime/realtime.constants.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import type { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import type { CalendarQueryDto } from './dto/availability-query.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import type { ExtendReservationDto } from './dto/extend-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';

const BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
];

const EXTENDABLE_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
];

const MAX_EXTENSION_MS = 24 * 60 * 60 * 1000;

const notificationDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Abidjan',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatNotificationDateTime(date: Date): string {
  return notificationDateFormatter.format(date);
}

const reservationSelect = {
  id: true,
  companyId: true,
  userId: true,
  directionId: true,
  resourceType: true,
  vehicleId: true,
  roomId: true,
  startAt: true,
  endAt: true,
  destination: true,
  missionReason: true,
  passengerCount: true,
  meetingSubject: true,
  participantCount: true,
  comment: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  company: { select: { id: true, name: true } },
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      directionId: true,
    },
  },
  direction: { select: { id: true, name: true } },
  vehicle: {
    select: {
      id: true,
      companyId: true,
      registrationNumber: true,
      brand: true,
      model: true,
      seats: true,
      status: true,
      company: { select: { id: true, name: true } },
    },
  },
  room: {
    select: {
      id: true,
      companyId: true,
      name: true,
      location: true,
      capacity: true,
      status: true,
      company: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ReservationSelect;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  async checkAvailability(actor: AuthenticatedUser, query: AvailabilityQueryDto) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    this.assertValidRange(startAt, endAt, { allowPast: true });

    const { companyId } = await this.resolveResourceCompany(
      query.resourceType,
      query.resourceId,
    );

    const conflicts = await this.findConflicts({
      resourceType: query.resourceType,
      vehicleId:
        query.resourceType === ResourceType.VEHICLE ? query.resourceId : null,
      roomId: query.resourceType === ResourceType.ROOM ? query.resourceId : null,
      startAt,
      endAt,
    });

    return {
      available: conflicts.length === 0,
      companyId,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      startAt,
      endAt,
      conflicts: conflicts.map((c) => ({
        id: c.id,
        status: c.status,
        startAt: c.startAt,
        endAt: c.endAt,
      })),
    };
  }

  async list(actor: AuthenticatedUser, query: ListReservationsQueryDto) {
    const scopeWhere = this.accessScope.reservationListWhere(actor, {
      companyId: query.companyId,
      directionId: query.directionId,
      userId: query.userId,
    });

    const where: Prisma.ReservationWhereInput = {
      AND: [
        scopeWhere,
        {
          ...(query.status ? { status: query.status } : {}),
          ...(query.resourceType ? { resourceType: query.resourceType } : {}),
          ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
          ...(query.roomId ? { roomId: query.roomId } : {}),
        },
      ],
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.reservation.count({ where }),
      this.prisma.reservation.findMany({
        where,
        select: reservationSelect,
        orderBy: { startAt: 'desc' },
        ...paginationArgs(query.page, query.limit),
      }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async calendar(actor: AuthenticatedUser, query: CalendarQueryDto) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    if (!(startDate < endDate)) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin.',
      );
    }

    const scopeWhere = this.accessScope.reservationListWhere(actor, {
      companyId: query.companyId,
      directionId: query.directionId,
    });

    const resourceFilter: Prisma.ReservationWhereInput = {};
    if (query.resourceType === ResourceType.VEHICLE && query.resourceId) {
      resourceFilter.resourceType = ResourceType.VEHICLE;
      resourceFilter.vehicleId = query.resourceId;
    } else if (query.resourceType === ResourceType.ROOM && query.resourceId) {
      resourceFilter.resourceType = ResourceType.ROOM;
      resourceFilter.roomId = query.resourceId;
    } else if (query.resourceType) {
      resourceFilter.resourceType = query.resourceType;
    }

    const where: Prisma.ReservationWhereInput = {
      AND: [
        scopeWhere,
        resourceFilter,
        {
          startAt: { lt: endDate },
          endAt: { gt: startDate },
          status: {
            in: [
              ReservationStatus.PENDING,
              ReservationStatus.APPROVED,
              ReservationStatus.COMPLETED,
            ],
          },
        },
      ],
    };

    const reservations = await this.prisma.reservation.findMany({
      where,
      select: {
        id: true,
        status: true,
        resourceType: true,
        vehicleId: true,
        roomId: true,
        companyId: true,
        startAt: true,
        endAt: true,
        destination: true,
        meetingSubject: true,
        userId: true,
        user: { select: { firstName: true, lastName: true } },
        vehicle: { select: { registrationNumber: true, brand: true, model: true } },
        room: { select: { name: true, location: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    return reservations.map((r) => {
      const isVehicle = r.resourceType === ResourceType.VEHICLE;
      return {
        id: r.id,
        title: isVehicle
          ? r.vehicle?.registrationNumber ??
            r.destination ??
            'Réservation véhicule'
          : r.room?.name ?? r.meetingSubject ?? 'Réservation salle',
        start: r.startAt.toISOString(),
        end: r.endAt.toISOString(),
        status: r.status,
        resourceType: r.resourceType,
        resourceId: isVehicle ? r.vehicleId : r.roomId,
        companyId: r.companyId,
        resourceName: isVehicle
          ? r.vehicle
            ? `${r.vehicle.brand} ${r.vehicle.model}`
            : 'Véhicule'
          : r.room?.name ?? 'Salle de réunion',
        resourceDetail: isVehicle
          ? r.vehicle?.registrationNumber ?? null
          : r.room?.location ?? null,
        context: (isVehicle ? r.destination : r.meetingSubject) ?? null,
        userId: r.userId,
        requesterName: `${r.user.firstName} ${r.user.lastName}`.trim(),
      };
    });
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      select: reservationSelect,
    });
    if (!reservation) {
      throw new NotFoundException('Réservation introuvable.');
    }
    this.assertCanViewReservation(actor, reservation);
    return reservation;
  }

  async create(dto: CreateReservationDto, actor: AuthenticatedUser) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    this.assertValidRange(startAt, endAt);

    if (dto.resourceType === ResourceType.VEHICLE) {
      return this.createVehicleReservation(dto, actor, startAt, endAt);
    }
    return this.createRoomReservation(dto, actor, startAt, endAt);
  }

  async update(
    id: string,
    dto: UpdateReservationDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.findById(id, actor);

    if (existing.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Seule une réservation en attente peut être modifiée.',
      );
    }
    const canEdit =
      this.accessScope.canModifyOwnReservation(actor, existing.userId) ||
      this.accessScope.canApproveReservation(actor, existing);
    if (!canEdit) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à modifier cette réservation.',
      );
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    this.assertValidRange(startAt, endAt);

    if (existing.resourceType === ResourceType.VEHICLE) {
      const passengerCount =
        dto.passengerCount ?? existing.passengerCount ?? undefined;
      if (passengerCount === undefined) {
        throw new BadRequestException('Le nombre de passagers est requis.');
      }
      const seats = existing.vehicle?.seats;
      if (seats !== undefined && passengerCount > seats) {
        throw new BadRequestException(
          `Le nombre de passagers ne peut pas dépasser ${seats} place(s).`,
        );
      }
    } else {
      const participantCount =
        dto.participantCount ?? existing.participantCount ?? undefined;
      if (participantCount === undefined) {
        throw new BadRequestException(
          'Le nombre de participants est requis.',
        );
      }
      const capacity = existing.room?.capacity;
      if (capacity !== undefined && participantCount > capacity) {
        throw new BadRequestException(
          `Le nombre de participants ne peut pas dépasser la capacité (${capacity}).`,
        );
      }
    }

    const reservation = await this.withResourceLock(existing, async (tx) => {
      await this.assertNoConflict(
        {
          resourceType: existing.resourceType,
          vehicleId: existing.vehicleId,
          roomId: existing.roomId,
          startAt,
          endAt,
          excludeId: id,
        },
        tx,
      );

      return tx.reservation.update({
      where: { id },
      data: {
        startAt,
        endAt,
        ...(dto.destination !== undefined
          ? { destination: dto.destination.trim() }
          : {}),
        ...(dto.missionReason !== undefined
          ? { missionReason: dto.missionReason.trim() }
          : {}),
        ...(dto.passengerCount !== undefined
          ? { passengerCount: dto.passengerCount }
          : {}),
        ...(dto.meetingSubject !== undefined
          ? { meetingSubject: dto.meetingSubject.trim() }
          : {}),
        ...(dto.participantCount !== undefined
          ? { participantCount: dto.participantCount }
          : {}),
        ...(dto.comment !== undefined
          ? { comment: dto.comment?.trim() || null }
          : {}),
      },
      select: reservationSelect,
      });
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'Reservation',
      entityId: id,
      metadata: {
        before: existing,
        after: toPlainJson(dto),
      },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_UPDATED,
      reservation,
      { availabilityChanged: true },
    );

    return reservation;
  }

  async approve(id: string, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);
    this.assertCanApprove(actor, existing);
    if (existing.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Seule une réservation en attente peut être approuvée.',
      );
    }

    await this.assertNoConflict({
      resourceType: existing.resourceType,
      vehicleId: existing.vehicleId,
      roomId: existing.roomId,
      startAt: existing.startAt,
      endAt: existing.endAt,
      excludeId: id,
    });

    const reservation = await this.transitionStatus(
      id,
      [ReservationStatus.PENDING],
      { status: ReservationStatus.APPROVED },
      'Cette réservation a déjà été traitée.',
    );

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.APPROVE,
      entity: 'Reservation',
      entityId: id,
      metadata: { companyId: existing.companyId },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_APPROVED,
      reservation,
      { availabilityChanged: false },
    );

    await this.notifications.createManyForUsers([existing.userId], {
      ...reservationNotificationMessages.approved(),
      entityType: 'Reservation',
      entityId: id,
    });

    return reservation;
  }

  async reject(
    id: string,
    dto: RejectReservationDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.findById(id, actor);
    this.assertCanApprove(actor, existing);
    if (existing.status !== ReservationStatus.PENDING) {
      throw new BadRequestException(
        'Seule une réservation en attente peut être rejetée.',
      );
    }

    const rejectionReason = dto.rejectionReason.trim();
    if (rejectionReason.length < 3) {
      throw new BadRequestException(
        'Le motif de rejet doit contenir au moins 3 caractères.',
      );
    }

    const reservation = await this.transitionStatus(
      id,
      [ReservationStatus.PENDING],
      { status: ReservationStatus.REJECTED, rejectionReason },
      'Cette réservation a déjà été traitée.',
    );

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.REJECT,
      entity: 'Reservation',
      entityId: id,
      metadata: { companyId: existing.companyId, rejectionReason },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_REJECTED,
      reservation,
      { availabilityChanged: true },
    );

    await this.notifications.createManyForUsers([existing.userId], {
      ...reservationNotificationMessages.rejected(rejectionReason),
      entityType: 'Reservation',
      entityId: id,
    });

    return reservation;
  }

  async cancel(id: string, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);

    const canCancel =
      this.accessScope.canModifyOwnReservation(actor, existing.userId) ||
      this.accessScope.canApproveReservation(actor, existing);

    if (!canCancel) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à annuler cette réservation.',
      );
    }

    if (
      existing.status !== ReservationStatus.PENDING &&
      existing.status !== ReservationStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Seule une réservation en attente ou approuvée peut être annulée.',
      );
    }

    const reservation = await this.transitionStatus(
      id,
      [ReservationStatus.PENDING, ReservationStatus.APPROVED],
      { status: ReservationStatus.CANCELLED },
      'Cette réservation a déjà été traitée.',
    );

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CANCEL,
      entity: 'Reservation',
      entityId: id,
      metadata: {
        companyId: existing.companyId,
        previousStatus: existing.status,
      },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_CANCELLED,
      reservation,
      { availabilityChanged: true },
    );

    if (actor.id !== existing.userId) {
      await this.notifications.createManyForUsers([existing.userId], {
        ...reservationNotificationMessages.cancelledForOwner(),
        entityType: 'Reservation',
        entityId: id,
      });
    }
    const approverIds = (
      await this.findCompanyApproverIds(existing.companyId)
    ).filter((approverId) => approverId !== actor.id && approverId !== existing.userId);
    await this.notifications.createManyForUsers(approverIds, {
      ...reservationNotificationMessages.cancelledForApprovers(),
      entityType: 'Reservation',
      entityId: id,
    });

    return reservation;
  }

  /**
   * Extends an open reservation: only the additional period [endAt, newEndAt)
   * is checked for conflicts, the business status is kept unchanged.
   */
  async extend(id: string, dto: ExtendReservationDto, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);

    const canExtend =
      this.accessScope.canModifyOwnReservation(actor, existing.userId) ||
      this.accessScope.canApproveReservation(actor, existing);
    if (!canExtend) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à prolonger cette réservation.',
      );
    }

    if (!EXTENDABLE_STATUSES.includes(existing.status)) {
      throw new BadRequestException(
        'Seule une réservation en attente ou approuvée peut être prolongée.',
      );
    }

    const now = new Date();
    if (existing.endAt <= now) {
      throw new BadRequestException(
        'Cette réservation est terminée et ne peut plus être prolongée.',
      );
    }

    const newEndAt = new Date(dto.newEndAt);
    if (Number.isNaN(newEndAt.getTime())) {
      throw new BadRequestException('Dates invalides.');
    }
    if (newEndAt <= existing.endAt) {
      throw new BadRequestException(
        'La nouvelle heure de fin doit être postérieure à la fin actuelle.',
      );
    }
    if (newEndAt.getTime() - existing.endAt.getTime() > MAX_EXTENSION_MS) {
      throw new BadRequestException(
        'Une prolongation ne peut pas dépasser 24 heures.',
      );
    }

    const resource = await this.getReservationResourceState(existing);
    this.assertManagingCompanyActive(resource.companyStatus);
    this.assertResourceAvailable(resource.status, resource.kindLabel);

    const { count } = await this.withResourceLock(existing, async (tx) => {
      await this.assertNoConflict(
        {
          resourceType: existing.resourceType,
          vehicleId: existing.vehicleId,
          roomId: existing.roomId,
          startAt: existing.endAt,
          endAt: newEndAt,
          excludeId: id,
        },
        tx,
      );

      // Guard on the current end and status so concurrent changes cannot be overwritten.
      return tx.reservation.updateMany({
        where: {
          id,
          status: { in: EXTENDABLE_STATUSES },
          endAt: existing.endAt,
        },
        data: { endAt: newEndAt },
      });
    });
    if (count === 0) {
      throw new ConflictException(
        'Cette réservation a été modifiée entre-temps. Actualisez et réessayez.',
      );
    }
    const reservation = await this.prisma.reservation.findUniqueOrThrow({
      where: { id },
      select: reservationSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'Reservation',
      entityId: id,
      metadata: {
        operation: 'EXTEND',
        companyId: existing.companyId,
        previousEndAt: existing.endAt.toISOString(),
        newEndAt: newEndAt.toISOString(),
      },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_EXTENDED,
      reservation,
      { availabilityChanged: true },
    );

    const newEndLabel = formatNotificationDateTime(newEndAt);
    if (actor.id !== existing.userId) {
      await this.notifications.createManyForUsers([existing.userId], {
        ...reservationNotificationMessages.extendedForOwner(newEndLabel),
        entityType: 'Reservation',
        entityId: id,
      });
    }
    const approverIds = (
      await this.findCompanyApproverIds(existing.companyId)
    ).filter((approverId) => approverId !== actor.id && approverId !== existing.userId);
    await this.notifications.createManyForUsers(approverIds, {
      ...reservationNotificationMessages.extendedForApprovers(resource.label, newEndLabel),
      entityType: 'Reservation',
      entityId: id,
    });

    return reservation;
  }

  private async getReservationResourceState(reservation: {
    resourceType: ResourceType;
    vehicleId: string | null;
    roomId: string | null;
  }): Promise<{
    status: ResourceStatus;
    companyStatus: EntityStatus;
    kindLabel: string;
    label: string;
  }> {
    if (reservation.resourceType === ResourceType.VEHICLE && reservation.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: reservation.vehicleId },
        select: {
          status: true,
          registrationNumber: true,
          company: { select: { status: true } },
        },
      });
      if (!vehicle) throw new NotFoundException('Véhicule introuvable.');
      return {
        status: vehicle.status,
        companyStatus: vehicle.company.status,
        kindLabel: 'véhicule',
        label: `le véhicule ${vehicle.registrationNumber}`,
      };
    }
    if (reservation.resourceType === ResourceType.ROOM && reservation.roomId) {
      const room = await this.prisma.meetingRoom.findUnique({
        where: { id: reservation.roomId },
        select: { status: true, name: true, company: { select: { status: true } } },
      });
      if (!room) throw new NotFoundException('Salle de réunion introuvable.');
      return {
        status: room.status,
        companyStatus: room.company.status,
        kindLabel: 'salle',
        label: `la salle ${room.name}`,
      };
    }
    throw new BadRequestException('Ressource de la réservation introuvable.');
  }

  private async createVehicleReservation(
    dto: CreateReservationDto,
    actor: AuthenticatedUser,
    startAt: Date,
    endAt: Date,
  ) {
    if (!dto.vehicleId) {
      throw new BadRequestException('Le véhicule est requis.');
    }
    if (!dto.destination?.trim()) {
      throw new BadRequestException('La destination est requise.');
    }
    if (!dto.missionReason?.trim()) {
      throw new BadRequestException('Le motif de la mission est requis.');
    }
    if (dto.passengerCount === undefined) {
      throw new BadRequestException('Le nombre de passagers est requis.');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
      select: {
        id: true,
        companyId: true,
        seats: true,
        status: true,
        registrationNumber: true,
        company: { select: { id: true, status: true, name: true } },
      },
    });
    if (!vehicle) {
      throw new NotFoundException('Véhicule introuvable.');
    }

    await this.assertRequesterCompanyActive(actor);
    this.assertManagingCompanyActive(vehicle.company.status);
    this.assertResourceAvailable(vehicle.status, 'véhicule');

    if (dto.passengerCount > vehicle.seats) {
      throw new BadRequestException(
        `Le nombre de passagers ne peut pas dépasser ${vehicle.seats} place(s).`,
      );
    }

    const target = {
      resourceType: ResourceType.VEHICLE,
      vehicleId: vehicle.id,
      roomId: null,
    };
    const destination = dto.destination.trim();
    const missionReason = dto.missionReason.trim();
    const passengerCount = dto.passengerCount;
    const reservation = await this.withResourceLock(target, async (tx) => {
      await this.assertNoConflict({ ...target, startAt, endAt }, tx);

      return tx.reservation.create({
        data: {
          companyId: actor.companyId,
          userId: actor.id,
          directionId: actor.directionId,
          resourceType: ResourceType.VEHICLE,
          vehicleId: vehicle.id,
          startAt,
          endAt,
          destination,
          missionReason,
          passengerCount,
          comment: dto.comment?.trim() || null,
          status: ReservationStatus.PENDING,
        },
        select: reservationSelect,
      });
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Reservation',
      entityId: reservation.id,
      metadata: {
        resourceType: ResourceType.VEHICLE,
        vehicleId: vehicle.id,
        companyId: actor.companyId,
        resourceCompanyId: vehicle.companyId,
      },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_CREATED,
      reservation,
      { availabilityChanged: true },
    );

    await this.notifyReservationCreated(
      actor,
      actor.companyId,
      reservation.id,
      `le véhicule ${vehicle.registrationNumber}`,
    );

    return reservation;
  }

  private async createRoomReservation(
    dto: CreateReservationDto,
    actor: AuthenticatedUser,
    startAt: Date,
    endAt: Date,
  ) {
    if (!dto.roomId) {
      throw new BadRequestException('La salle est requise.');
    }
    if (!dto.meetingSubject?.trim()) {
      throw new BadRequestException("L'objet de la réunion est requis.");
    }
    if (dto.participantCount === undefined) {
      throw new BadRequestException('Le nombre de participants est requis.');
    }

    const room = await this.prisma.meetingRoom.findUnique({
      where: { id: dto.roomId },
      select: {
        id: true,
        companyId: true,
        capacity: true,
        status: true,
        name: true,
        company: { select: { id: true, status: true, name: true } },
      },
    });
    if (!room) {
      throw new NotFoundException('Salle de réunion introuvable.');
    }

    await this.assertRequesterCompanyActive(actor);
    this.assertManagingCompanyActive(room.company.status);
    this.assertResourceAvailable(room.status, 'salle');

    if (dto.participantCount > room.capacity) {
      throw new BadRequestException(
        `Le nombre de participants ne peut pas dépasser la capacité (${room.capacity}).`,
      );
    }

    const target = {
      resourceType: ResourceType.ROOM,
      vehicleId: null,
      roomId: room.id,
    };
    const meetingSubject = dto.meetingSubject.trim();
    const participantCount = dto.participantCount;
    const reservation = await this.withResourceLock(target, async (tx) => {
      await this.assertNoConflict({ ...target, startAt, endAt }, tx);

      return tx.reservation.create({
        data: {
          companyId: actor.companyId,
          userId: actor.id,
          directionId: actor.directionId,
          resourceType: ResourceType.ROOM,
          roomId: room.id,
          startAt,
          endAt,
          meetingSubject,
          participantCount,
          comment: dto.comment?.trim() || null,
          status: ReservationStatus.PENDING,
        },
        select: reservationSelect,
      });
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Reservation',
      entityId: reservation.id,
      metadata: {
        resourceType: ResourceType.ROOM,
        roomId: room.id,
        companyId: actor.companyId,
        resourceCompanyId: room.companyId,
      },
    });

    this.realtime.publishReservation(
      REALTIME_EVENTS.RESERVATION_CREATED,
      reservation,
      { availabilityChanged: true },
    );

    await this.notifyReservationCreated(
      actor,
      actor.companyId,
      reservation.id,
      `la salle ${room.name}`,
    );

    return reservation;
  }

  /** Vehicles and rooms are shared by the Group: any member may check their availability. */
  private async resolveResourceCompany(
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<{ companyId: string }> {
    if (resourceType === ResourceType.VEHICLE) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: resourceId },
        select: { companyId: true },
      });
      if (!vehicle) {
        throw new NotFoundException('Véhicule introuvable.');
      }
      return { companyId: vehicle.companyId };
    }

    const room = await this.prisma.meetingRoom.findUnique({
      where: { id: resourceId },
      select: { companyId: true },
    });
    if (!room) {
      throw new NotFoundException('Salle de réunion introuvable.');
    }
    return { companyId: room.companyId };
  }

  private assertValidRange(
    startAt: Date,
    endAt: Date,
    options: { allowPast?: boolean } = {},
  ): void {
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Dates invalides.');
    }
    if (!(startAt < endAt)) {
      throw new BadRequestException(
        'La date/heure de début doit être antérieure à la date/heure de fin.',
      );
    }
    if (!options.allowPast) {
      const oneMinuteAgo = new Date(Date.now() - 60_000);
      if (startAt < oneMinuteAgo) {
        throw new BadRequestException(
          'La date de début ne peut pas être antérieure de plus d’une minute.',
        );
      }
    }
  }

  private async assertRequesterCompanyActive(actor: AuthenticatedUser): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: actor.companyId },
      select: { status: true },
    });
    if (company?.status !== EntityStatus.ACTIVE) {
      throw new BadRequestException(
        'Impossible de créer une réservation pour une entreprise inactive.',
      );
    }
  }

  private assertManagingCompanyActive(status: EntityStatus): void {
    if (status !== EntityStatus.ACTIVE) {
      throw new BadRequestException(
        'Cette ressource est gérée par une entreprise inactive et ne peut pas être réservée.',
      );
    }
  }

  private assertResourceAvailable(
    status: ResourceStatus,
    label: string,
  ): void {
    if (status !== ResourceStatus.AVAILABLE) {
      throw new BadRequestException(
        `Ce ${label} n’est pas disponible pour une nouvelle réservation.`,
      );
    }
  }

  private assertCanViewReservation(
    actor: AuthenticatedUser,
    reservation: {
      companyId: string;
      directionId: string | null;
      userId: string;
    },
  ): void {
    if (!this.accessScope.canViewReservation(actor, reservation)) {
      throw new ForbiddenException('Accès refusé à cette réservation.');
    }
  }

  private assertCanApprove(
    actor: AuthenticatedUser,
    reservation: {
      companyId: string;
      directionId: string | null;
      userId: string;
    },
  ): void {
    if (!this.accessScope.canApproveReservation(actor, reservation)) {
      throw new ForbiddenException(
        'Vous n’êtes pas autorisé à traiter cette réservation.',
      );
    }
  }

  /** Exposed for unit tests — overlap on PENDING/APPROVED only. */
  async findConflicts(
    input: {
      resourceType: ResourceType;
      vehicleId: string | null;
      roomId: string | null;
      startAt: Date;
      endAt: Date;
      excludeId?: string;
    },
    client: Prisma.TransactionClient = this.prisma,
  ) {
    const resourceWhere: Prisma.ReservationWhereInput =
      input.resourceType === ResourceType.VEHICLE
        ? { vehicleId: input.vehicleId! }
        : { roomId: input.roomId! };

    return client.reservation.findMany({
      where: {
        ...resourceWhere,
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: input.endAt },
        endAt: { gt: input.startAt },
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
      },
    });
  }

  private async assertNoConflict(
    input: {
      resourceType: ResourceType;
      vehicleId: string | null;
      roomId: string | null;
      startAt: Date;
      endAt: Date;
      excludeId?: string;
    },
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const conflicts = await this.findConflicts(input, client);
    if (conflicts.length > 0) {
      throw new ConflictException(
        'La ressource n’est pas disponible sur ce créneau (conflit avec une réservation existante).',
      );
    }
  }

  /**
   * Serializes "conflict check + write" per resource with a transaction-scoped
   * PostgreSQL advisory lock: two concurrent requests on the same resource cannot
   * both pass the conflict check. The lock is released at commit or rollback.
   */
  private async withResourceLock<T>(
    target: {
      resourceType: ResourceType;
      vehicleId: string | null;
      roomId: string | null;
    },
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const resourceId =
      target.resourceType === ResourceType.VEHICLE
        ? target.vehicleId
        : target.roomId;
    const lockKey = `reservation:${target.resourceType}:${resourceId ?? ''}`;
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
      return work(tx);
    });
  }

  private async findCompanyApproverIds(companyId: string): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        OR: [
          {
            companyId,
            role: { in: [Role.COMPANY_ADMIN, Role.MANAGER] },
          },
          { role: Role.GROUP_ADMIN },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async notifyReservationCreated(
    actor: AuthenticatedUser,
    companyId: string,
    reservationId: string,
    resourceLabel: string,
  ): Promise<void> {
    await this.notifications.createManyForUsers([actor.id], {
      ...reservationNotificationMessages.createdForRequester(),
      entityType: 'Reservation',
      entityId: reservationId,
    });

    const approverIds = (await this.findCompanyApproverIds(companyId)).filter(
      (approverId) => approverId !== actor.id,
    );
    await this.notifications.createManyForUsers(approverIds, {
      ...reservationNotificationMessages.createdForApprovers(resourceLabel),
      entityType: 'Reservation',
      entityId: reservationId,
    });
  }

  /**
   * Atomic status transition: the WHERE on the current status guarantees that
   * concurrent calls produce a single transition (and a single notification).
   */
  private async transitionStatus(
    id: string,
    fromStatuses: ReservationStatus[],
    data: Prisma.ReservationUpdateManyMutationInput,
    alreadyProcessedMessage: string,
  ) {
    const { count } = await this.prisma.reservation.updateMany({
      where: { id, status: { in: fromStatuses } },
      data,
    });
    if (count === 0) {
      throw new ConflictException(alreadyProcessedMessage);
    }
    return this.prisma.reservation.findUniqueOrThrow({
      where: { id },
      select: reservationSelect,
    });
  }
}
