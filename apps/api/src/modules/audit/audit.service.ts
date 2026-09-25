import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

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
