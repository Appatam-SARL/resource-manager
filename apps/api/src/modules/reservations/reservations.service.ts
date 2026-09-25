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
  NotificationType,
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
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import type { CalendarQueryDto } from './dto/availability-query.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';

const BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.PENDING,
  ReservationStatus.APPROVED,
];

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
      registrationNumber: true,
      brand: true,
      model: true,
      seats: true,
      status: true,
    },
  },
  room: {
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      status: true,
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
  ) {}

  async checkAvailability(actor: AuthenticatedUser, query: AvailabilityQueryDto) {
    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    this.assertValidRange(startAt, endAt, { allowPast: true });

    const { companyId } = await this.resolveResourceForAccess(
      actor,
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
        vehicle: { select: { registrationNumber: true } },
        room: { select: { name: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    return reservations.map((r) => ({
      id: r.id,
      title:
        r.resourceType === ResourceType.VEHICLE
          ? r.vehicle?.registrationNumber ??
            r.destination ??
            'Réservation véhicule'
          : r.room?.name ?? r.meetingSubject ?? 'Réservation salle',
      start: r.startAt.toISOString(),
      end: r.endAt.toISOString(),
      status: r.status,
      resourceType: r.resourceType,
      resourceId:
        r.resourceType === ResourceType.VEHICLE ? r.vehicleId : r.roomId,
      companyId: r.companyId,
    }));
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

    await this.assertNoConflict({
      resourceType: existing.resourceType,
      vehicleId: existing.vehicleId,
      roomId: existing.roomId,
      startAt,
      endAt,
      excludeId: id,
    });

    const reservation = await this.prisma.reservation.update({
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

    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.APPROVED },
      select: reservationSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.APPROVE,
      entity: 'Reservation',
      entityId: id,
      metadata: { companyId: existing.companyId },
    });

    await this.notifications.createManyForUsers([existing.userId], {
      type: NotificationType.RESERVATION_APPROVED,
      title: 'Réservation approuvée',
      body: 'Votre demande de réservation a été approuvée.',
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

    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        status: ReservationStatus.REJECTED,
        rejectionReason,
      },
      select: reservationSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.REJECT,
      entity: 'Reservation',
      entityId: id,
      metadata: { companyId: existing.companyId, rejectionReason },
    });

    await this.notifications.createManyForUsers([existing.userId], {
      type: NotificationType.RESERVATION_REJECTED,
      title: 'Réservation rejetée',
      body: `Votre demande de réservation a été rejetée : ${rejectionReason}`,
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

    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
      select: reservationSelect,
    });

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

    const notifyIds = new Set<string>();
    if (actor.id !== existing.userId) {
      notifyIds.add(existing.userId);
    }
    const managers = await this.findCompanyApproverIds(existing.companyId);
    for (const mid of managers) {
      if (mid !== actor.id) notifyIds.add(mid);
    }

    await this.notifications.createManyForUsers([...notifyIds], {
      type: NotificationType.RESERVATION_CANCELLED,
      title: 'Réservation annulée',
      body: 'Une réservation a été annulée.',
      entityType: 'Reservation',
      entityId: id,
    });

    return reservation;
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

    this.accessScope.assertCanAccessCompany(actor, vehicle.companyId);
    this.assertCompanyActive(vehicle.company.status);
    this.assertResourceAvailable(vehicle.status, 'véhicule');

    if (dto.passengerCount > vehicle.seats) {
      throw new BadRequestException(
        `Le nombre de passagers ne peut pas dépasser ${vehicle.seats} place(s).`,
      );
    }

    await this.assertNoConflict({
      resourceType: ResourceType.VEHICLE,
      vehicleId: vehicle.id,
      roomId: null,
      startAt,
      endAt,
    });

    const reservation = await this.prisma.reservation.create({
      data: {
        companyId: vehicle.companyId,
        userId: actor.id,
        directionId: actor.directionId,
        resourceType: ResourceType.VEHICLE,
        vehicleId: vehicle.id,
        startAt,
        endAt,
        destination: dto.destination.trim(),
        missionReason: dto.missionReason.trim(),
        passengerCount: dto.passengerCount,
        comment: dto.comment?.trim() || null,
        status: ReservationStatus.PENDING,
      },
      select: reservationSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Reservation',
      entityId: reservation.id,
      metadata: {
        resourceType: ResourceType.VEHICLE,
        vehicleId: vehicle.id,
        companyId: vehicle.companyId,
      },
    });

    await this.notifyCompanyApprovers(vehicle.companyId, {
      type: NotificationType.RESERVATION_CREATED,
      title: 'Nouvelle réservation de véhicule',
      body: `Une demande de réservation a été créée pour le véhicule ${vehicle.registrationNumber}.`,
      entityType: 'Reservation',
      entityId: reservation.id,
    });

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

    this.accessScope.assertCanAccessCompany(actor, room.companyId);
    this.assertCompanyActive(room.company.status);
    this.assertResourceAvailable(room.status, 'salle');

    if (dto.participantCount > room.capacity) {
      throw new BadRequestException(
        `Le nombre de participants ne peut pas dépasser la capacité (${room.capacity}).`,
      );
    }

    await this.assertNoConflict({
      resourceType: ResourceType.ROOM,
      vehicleId: null,
      roomId: room.id,
      startAt,
      endAt,
    });

    const reservation = await this.prisma.reservation.create({
      data: {
        companyId: room.companyId,
        userId: actor.id,
        directionId: actor.directionId,
        resourceType: ResourceType.ROOM,
        roomId: room.id,
        startAt,
        endAt,
        meetingSubject: dto.meetingSubject.trim(),
        participantCount: dto.participantCount,
        comment: dto.comment?.trim() || null,
        status: ReservationStatus.PENDING,
      },
      select: reservationSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Reservation',
      entityId: reservation.id,
      metadata: {
        resourceType: ResourceType.ROOM,
        roomId: room.id,
        companyId: room.companyId,
      },
    });

    await this.notifyCompanyApprovers(room.companyId, {
      type: NotificationType.RESERVATION_CREATED,
      title: 'Nouvelle réservation de salle',
      body: `Une demande de réservation a été créée pour la salle ${room.name}.`,
      entityType: 'Reservation',
      entityId: reservation.id,
    });

    return reservation;
  }

  private async resolveResourceForAccess(
    actor: AuthenticatedUser,
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
      this.accessScope.assertCanAccessCompany(actor, vehicle.companyId);
      return { companyId: vehicle.companyId };
    }

    const room = await this.prisma.meetingRoom.findUnique({
      where: { id: resourceId },
      select: { companyId: true },
    });
    if (!room) {
      throw new NotFoundException('Salle de réunion introuvable.');
    }
    this.accessScope.assertCanAccessCompany(actor, room.companyId);
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

  private assertCompanyActive(status: EntityStatus): void {
    if (status !== EntityStatus.ACTIVE) {
      throw new BadRequestException(
        'Impossible de créer une réservation pour une entreprise inactive.',
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
    if (actor.role === Role.GROUP_ADMIN) return;
    if (actor.role === Role.COMPANY_ADMIN) {
      if (actor.companyId !== reservation.companyId) {
        throw new ForbiddenException('Accès refusé à cette réservation.');
      }
      return;
    }
    if (actor.role === Role.MANAGER) {
      if (actor.companyId !== reservation.companyId) {
        throw new ForbiddenException('Accès refusé à cette réservation.');
      }
      if (!actor.directionId) return;
      if (
        reservation.directionId === actor.directionId ||
        reservation.userId === actor.id
      ) {
        return;
      }
      throw new ForbiddenException('Accès refusé à cette réservation.');
    }
    if (reservation.userId !== actor.id) {
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
  async findConflicts(input: {
    resourceType: ResourceType;
    vehicleId: string | null;
    roomId: string | null;
    startAt: Date;
    endAt: Date;
    excludeId?: string;
  }) {
    const resourceWhere: Prisma.ReservationWhereInput =
      input.resourceType === ResourceType.VEHICLE
        ? { vehicleId: input.vehicleId! }
        : { roomId: input.roomId! };

    return this.prisma.reservation.findMany({
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

  private async assertNoConflict(input: {
    resourceType: ResourceType;
    vehicleId: string | null;
    roomId: string | null;
    startAt: Date;
    endAt: Date;
    excludeId?: string;
  }): Promise<void> {
    const conflicts = await this.findConflicts(input);
    if (conflicts.length > 0) {
      throw new ConflictException(
        'La ressource n’est pas disponible sur ce créneau (conflit avec une réservation existante).',
      );
    }
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

  private async notifyCompanyApprovers(
    companyId: string,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      entityType: string;
      entityId: string;
    },
  ): Promise<void> {
    const ids = await this.findCompanyApproverIds(companyId);
    await this.notifications.createManyForUsers(ids, payload);
  }
}
