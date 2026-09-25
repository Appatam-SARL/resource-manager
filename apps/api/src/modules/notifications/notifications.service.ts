import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import {
  paginate,
  paginationArgs,
  type PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../database/prisma.service.js';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
    });
  }

  async createManyForUsers(
    userIds: string[],
    payload: Omit<CreateNotificationInput, 'userId'>,
  ) {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return { count: 0 };

    return this.prisma.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType ?? null,
        entityId: payload.entityId ?? null,
      })),
    });
  }

  async listForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Prisma.NotificationGetPayload<object>>> {
    const where: Prisma.NotificationWhereInput = { userId };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...paginationArgs(page, limit),
      }),
    ]);
    return paginate(data, total, page, limit);
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification introuvable.');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez consulter que vos propres notifications.',
      );
    }
    if (notification.readAt) {
      return notification;
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
