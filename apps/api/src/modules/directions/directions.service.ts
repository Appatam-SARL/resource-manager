import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, EntityStatus, Prisma } from '@prisma/client';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import {
  paginate,
  paginationArgs,
} from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateDirectionDto } from './dto/create-direction.dto.js';
import { ListDirectionsQueryDto } from './dto/list-directions-query.dto.js';
import { UpdateDirectionDto } from './dto/update-direction.dto.js';
import { UpdateDirectionStatusDto } from './dto/update-direction-status.dto.js';

const directionSelect = {
  id: true,
  companyId: true,
  name: true,
  code: true,
  status: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
    },
  },
  _count: {
    select: { users: true },
  },
} satisfies Prisma.DirectionSelect;

@Injectable()
export class DirectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListDirectionsQueryDto, actor: AuthenticatedUser) {
    const companyId = this.accessScope.resolveCompanyFilter(
      actor,
      query.companyId,
    );

    const where: Prisma.DirectionWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.direction.count({ where }),
      this.prisma.direction.findMany({
        where,
        select: directionSelect,
        orderBy: { name: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async create(dto: CreateDirectionDto, actor: AuthenticatedUser) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
      select: { id: true, status: true },
    });
    if (!company) {
      throw new BadRequestException('Entreprise introuvable.');
    }
    this.accessScope.assertCanManageCompany(actor, company.id);

    const direction = await this.prisma.direction.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        status: EntityStatus.ACTIVE,
      },
      select: directionSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Direction',
      entityId: direction.id,
      metadata: {
        name: direction.name,
        code: direction.code,
        companyId: direction.companyId,
      },
    });

    return direction;
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const direction = await this.prisma.direction.findUnique({
      where: { id },
      select: directionSelect,
    });
    if (!direction) {
      throw new NotFoundException('Direction introuvable.');
    }
    this.accessScope.assertCanAccessCompany(actor, direction.companyId);
    return direction;
  }

  async update(id: string, dto: UpdateDirectionDto, actor: AuthenticatedUser) {
    const existing = await this.requireDirection(id);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const updated = await this.prisma.direction.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      select: directionSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'Direction',
      entityId: id,
      metadata: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });

    return updated;
  }

  async updateStatus(
    id: string,
    dto: UpdateDirectionStatusDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.requireDirection(id);
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const updated = await this.prisma.direction.update({
      where: { id },
      data: { status: dto.status },
      select: directionSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'Direction',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
    });

    return updated;
  }

  private async requireDirection(id: string) {
    const direction = await this.prisma.direction.findUnique({
      where: { id },
      select: { id: true, companyId: true, status: true },
    });
    if (!direction) {
      throw new NotFoundException('Direction introuvable.');
    }
    return direction;
  }
}
