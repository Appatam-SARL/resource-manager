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
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto.js';

const companySelect = {
  id: true,
  groupId: true,
  name: true,
  code: true,
  status: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      directions: true,
      users: true,
      vehicles: true,
      meetingRooms: true,
    },
  },
} satisfies Prisma.CompanySelect;

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListCompaniesQueryDto, actor: AuthenticatedUser) {
    const scope = this.accessScope.companyWhere(actor);
    const where: Prisma.CompanyWhereInput = {
      ...scope,
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
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        select: companySelect,
        orderBy: { name: 'asc' },
        ...paginationArgs(query.page, query.limit),
      }),
    ]);

    return paginate(data, total, query.page, query.limit);
  }

  async create(dto: CreateCompanyDto, actor: AuthenticatedUser) {
    const group = await this.prisma.group.findUnique({
      where: { id: dto.groupId },
      select: { id: true },
    });
    if (!group) {
      throw new BadRequestException('Groupe introuvable.');
    }

    const company = await this.prisma.company.create({
      data: {
        groupId: dto.groupId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        status: EntityStatus.ACTIVE,
      },
      select: companySelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.CREATE,
      entity: 'Company',
      entityId: company.id,
      metadata: { name: company.name, code: company.code },
    });

    return company;
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: companySelect,
    });
    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }
    this.accessScope.assertCanAccessCompany(actor, company.id);
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actor: AuthenticatedUser) {
    const existing = await this.requireCompany(id);
    this.accessScope.assertCanManageCompany(actor, existing.id);

    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      select: companySelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'Company',
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
    dto: UpdateCompanyStatusDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.requireCompany(id);
    this.accessScope.assertCanManageCompany(actor, existing.id);

    const updated = await this.prisma.company.update({
      where: { id },
      data: { status: dto.status },
      select: companySelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'Company',
      entityId: id,
      metadata: { from: existing.status, to: dto.status },
    });

    return updated;
  }

  private async requireCompany(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!company) {
      throw new NotFoundException('Entreprise introuvable.');
    }
    return company;
  }
}
