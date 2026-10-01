import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
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
import { RealtimeService } from '../realtime/realtime.service.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';

const roomSelect = {
  id: true,
  companyId: true,
  name: true,
  location: true,
  capacity: true,
  status: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  company: { select: { id: true, name: true } },
} satisfies Prisma.MeetingRoomSelect;

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(actor: AuthenticatedUser, query: ListRoomsQueryDto) {
    const companyId = this.accessScope.resolveCompanyFilter(
      actor,
      query.companyId,
    );

    const where: Prisma.MeetingRoomWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { location: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.meetingRoom.count({ where }),
      this.prisma.meetingRoom.findMany({
        where,
        select: roomSelect,
        orderBy: { name: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const room = await this.prisma.meetingRoom.findUnique({
      where: { id },
      select: roomSelect,
    });
    if (!room) {
      throw new NotFoundException('Salle de réunion introuvable.');
    }
    this.accessScope.assertCanAccessCompany(actor, room.companyId);
    return room;
  }

  async create(dto: CreateRoomDto, actor: AuthenticatedUser) {
    this.accessScope.assertCanManageCompany(actor, dto.companyId);
    await this.assertCompanyExists(dto.companyId);

    const room = await this.prisma.meetingRoom.create({
      data: {
        companyId: dto.companyId,
        name: dto.name.trim(),
        location: dto.location?.trim() || null,
        capacity: dto.capacity,
        description: dto.description?.trim() || null,
      },
      select: roomSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'MeetingRoom',
      entityId: room.id,
      metadata: { companyId: room.companyId, name: room.name },
    });

    this.realtime.publishResourceCreated(ResourceType.ROOM, room);
    return room;
  }

  async update(id: string, dto: UpdateRoomDto, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const room = await this.prisma.meetingRoom.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.location !== undefined
          ? { location: dto.location?.trim() || null }
          : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
      },
      select: roomSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'MeetingRoom',
      entityId: id,
      metadata: {
        before: existing,
        after: toPlainJson(dto),
      },
    });

    this.realtime.publishResourceUpdated(ResourceType.ROOM, room);
    return room;
  }

  async updateStatus(
    id: string,
    status: ResourceStatus,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.findById(id, actor);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const room = await this.prisma.meetingRoom.update({
      where: { id },
      data: { status },
      select: roomSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'MeetingRoom',
      entityId: id,
      metadata: { from: existing.status, to: status },
    });

    this.realtime.publishResourceAvailability(
      ResourceType.ROOM,
      room,
      'STATUS_CHANGED',
    );
    return room;
  }

  async remove(id: string, actor: AuthenticatedUser) {
    const existing = await this.findById(id, actor);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const reservationCount = await this.prisma.reservation.count({
      where: { roomId: id },
    });

    if (reservationCount > 0) {
      const room = await this.prisma.meetingRoom.update({
        where: { id },
        data: { status: ResourceStatus.OUT_OF_SERVICE },
        select: roomSelect,
      });

      await this.audit.log({
        userId: actor.id,
        action: AuditAction.STATUS_CHANGE,
        entity: 'MeetingRoom',
        entityId: id,
        metadata: {
          reason: 'soft_deactivate_has_reservations',
          from: existing.status,
          to: ResourceStatus.OUT_OF_SERVICE,
        },
      });

      this.realtime.publishResourceAvailability(
        ResourceType.ROOM,
        room,
        'STATUS_CHANGED',
      );
      return {
        deleted: false,
        deactivated: true,
        room,
        message:
          'La salle possède des réservations : elle a été mise hors service.',
      };
    }

    await this.prisma.meetingRoom.delete({ where: { id } });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.DELETE,
      entity: 'MeetingRoom',
      entityId: id,
      metadata: { name: existing.name, companyId: existing.companyId },
    });

    this.realtime.publishResourceDeleted(ResourceType.ROOM, existing);
    return {
      deleted: true,
      deactivated: false,
      message: 'Salle de réunion supprimée.',
    };
  }

  private async assertCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }
  }
}
