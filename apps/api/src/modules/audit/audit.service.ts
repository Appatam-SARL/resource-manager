import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma, Role } from '@prisma/client';
import { paginate, paginationArgs } from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

export type AuditListQuery = {
  page: number;
  limit: number;
  entity?: string;
  action?: AuditAction;
  userId?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditListQuery, actor: AuthenticatedUser) {
    const where: Prisma.AuditLogWhereInput = {
      ...this.scopeWhere(actor),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(query.page, query.limit),
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              companyId: true,
            },
          },
        },
      }),
    ]);
    return paginate(data, total, query.page, query.limit);
  }

  /**
   * Audit logs carry no company, so a Company admin only sees the actions performed
   * by users of their own company (those users can only act within that company).
   * Group admins are attached to a company too but act on the whole Group: their logs,
   * like logs without author (system, anonymous), stay visible to Group admins only.
   */
  scopeWhere(actor: AuthenticatedUser): Prisma.AuditLogWhereInput {
    if (actor.role === Role.GROUP_ADMIN) return {};
    return {
      user: { is: { companyId: actor.companyId, role: { not: Role.GROUP_ADMIN } } },
    };
  }

  async log(input: {
    userId?: string | null;
    action: AuditAction;
    entity: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    // Never persist secrets
    const metadata = this.sanitize(input.metadata);
    return this.prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata,
      },
    });
  }

  private sanitize(
    metadata?: Prisma.InputJsonValue,
  ): Prisma.InputJsonValue | undefined {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return metadata;
    }
    const clone = { ...(metadata as Record<string, unknown>) };
    delete clone.password;
    delete clone.passwordHash;
    delete clone.refreshToken;
    delete clone.accessToken;
    delete clone.tokenHash;
    return clone as Prisma.InputJsonValue;
  }
}
