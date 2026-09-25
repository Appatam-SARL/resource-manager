import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '@prisma/client';

@Injectable()
export class GroupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getCurrent() {
    const group = await this.prisma.group.findFirst({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { companies: true } },
      },
    });
    if (!group) {
      throw new NotFoundException('Groupe introuvable.');
    }
    return group;
  }

  async findById(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { companies: true } },
      },
    });
    if (!group) {
      throw new NotFoundException('Groupe introuvable.');
    }
    return group;
  }

  async update(id: string, dto: UpdateGroupDto, actor: AuthenticatedUser) {
    await this.findById(id);
    const updated = await this.prisma.group.update({
      where: { id },
      data: { name: dto.name },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await this.audit.log({
      userId: actor.id,
      action: AuditAction.UPDATE,
      entity: 'Group',
      entityId: id,
      metadata: { name: dto.name },
    });
    return updated;
  }
}
