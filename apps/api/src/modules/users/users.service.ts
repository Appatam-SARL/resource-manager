import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  EntityStatus,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import {
  paginate,
  paginationArgs,
} from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { PasswordService } from '../auth/services/password.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  companyId: true,
  directionId: true,
  createdAt: true,
  updatedAt: true,
  company: { select: { id: true, name: true } },
  direction: { select: { id: true, name: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessScope: AccessScopeService,
    private readonly passwordService: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async me(actor: AuthenticatedUser) {
    return this.findById(actor.id, actor);
  }

  async list(query: ListUsersQueryDto, actor: AuthenticatedUser) {
    const where = this.buildListWhere(query, actor);
    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        ...paginationArgs(query.page, query.limit),
      }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  async findById(id: string, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    this.assertCanViewUser(actor, user);
    return user;
  }

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    this.accessScope.assertCanManageCompany(actor, dto.companyId);
    this.assertCanAssignRole(actor, dto.role);

    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });
    if (!company) throw new NotFoundException('Entreprise introuvable.');
    if (company.status !== EntityStatus.ACTIVE) {
      throw new BadRequestException(
        'Impossible de créer un utilisateur sur une entreprise inactive.',
      );
    }

    await this.assertDirectionBelongsToCompany(
      dto.directionId ?? null,
      dto.companyId,
    );

    const passwordHash = await this.passwordService.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          companyId: dto.companyId,
          directionId: dto.directionId ?? null,
          status: UserStatus.ACTIVE,
        },
        select: userSelect,
      });
      await this.audit.log({
        userId: actor.id,
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      });
      return user;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Cet email est déjà utilisé.');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable.');
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    if (dto.role) this.assertCanAssignRole(actor, dto.role);

    const directionId =
      dto.directionId !== undefined ? dto.directionId : existing.directionId;
    await this.assertDirectionBelongsToCompany(
      directionId,
      existing.companyId,
    );

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await this.passwordService.hash(dto.password);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        directionId:
          dto.directionId !== undefined ? dto.directionId : undefined,
        ...(passwordHash ? { passwordHash } : {}),
        ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
      },
      select: userSelect,
    });

    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      metadata: {
        email: dto.email,
        role: dto.role,
        directionId: dto.directionId,
      },
    });
    return user;
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Utilisateur introuvable.');
    this.accessScope.assertCanManageCompany(actor, existing.companyId);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: userSelect,
    });
    await this.audit.log({
      userId: actor.id,
      action: AuditAction.STATUS_CHANGE,
      entity: 'User',
      entityId: id,
      metadata: { status: dto.status },
    });
    return user;
  }

  private buildListWhere(
    query: ListUsersQueryDto,
    actor: AuthenticatedUser,
  ): Prisma.UserWhereInput {
    if (actor.role === Role.EMPLOYEE) {
      return { id: actor.id };
    }

    const companyId = this.accessScope.resolveCompanyFilter(
      actor,
      query.companyId,
    );

    return {
      ...(companyId ? { companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: query.role } : {}),
      ...(query.directionId ? { directionId: query.directionId } : {}),
      ...(actor.role === Role.MANAGER && actor.directionId && !query.directionId
        ? {
            OR: [
              { directionId: actor.directionId },
              { directionId: null },
              { id: actor.id },
            ],
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private assertCanViewUser(
    actor: AuthenticatedUser,
    user: { id: string; companyId: string; directionId: string | null },
  ) {
    if (actor.role === Role.GROUP_ADMIN) return;
    if (actor.role === Role.EMPLOYEE && actor.id !== user.id) {
      throw new ForbiddenException('Accès refusé.');
    }
    this.accessScope.assertCanAccessCompany(actor, user.companyId);
    if (
      actor.role === Role.MANAGER &&
      actor.directionId &&
      user.directionId &&
      user.directionId !== actor.directionId &&
      user.id !== actor.id
    ) {
      throw new ForbiddenException('Accès refusé à cette direction.');
    }
  }

  private assertCanAssignRole(actor: AuthenticatedUser, role: Role) {
    if (actor.role === Role.GROUP_ADMIN) return;
    if (actor.role === Role.COMPANY_ADMIN && role !== Role.GROUP_ADMIN) return;
    throw new ForbiddenException(
      'Vous ne pouvez pas attribuer ce rôle.',
    );
  }

  private async assertDirectionBelongsToCompany(
    directionId: string | null,
    companyId: string,
  ) {
    if (!directionId) return;
    const direction = await this.prisma.direction.findUnique({
      where: { id: directionId },
    });
    if (!direction) {
      throw new NotFoundException('Direction introuvable.');
    }
    if (direction.companyId !== companyId) {
      throw new BadRequestException(
        'La direction n’appartient pas à l’entreprise indiquée.',
      );
    }
  }
}
