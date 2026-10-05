import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, type Notification } from '@prisma/client';
import {
  paginate,
  paginationArgs,
  type PaginatedResult,
} from '../../common/dto/pagination.dto.js';
import { PrismaService } from '../../database/prisma.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';
import { PushTokensService } from './push-tokens.service.js';
import { ExpoPushService } from './push/expo-push.service.js';
import type {
  ExpoPushMessage,
  PushChannelId,
  PushNotificationData,
} from './push/expo-push.types.js';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
};

const RESERVATION_NOTIFICATION_TYPES: ReadonlySet<NotificationType> = new Set([
  NotificationType.RESERVATION_CREATED,
  NotificationType.RESERVATION_APPROVED,
  NotificationType.RESERVATION_REJECTED,
  NotificationType.RESERVATION_CANCELLED,
  NotificationType.RESERVATION_EXTENDED,
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushTokens: PushTokensService,
    private readonly expoPush: ExpoPushService,
    private readonly realtime: RealtimeService,
  ) {}

  async createForUser(input: CreateNotificationInput) {
    const { userId, ...payload } = input;
    const [notification] = await this.createManyForUsers([userId], payload);
    return notification;
  }

  /**
   * Persists one notification per user (source of truth), then publishes it on
   * the WebSocket and triggers the push transport in the background.
   * A transport failure never fails the caller.
   */
  async createManyForUsers(
    userIds: string[],
    payload: Omit<CreateNotificationInput, 'userId'>,
  ): Promise<Notification[]> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return [];

    const notifications = await this.prisma.notification.createManyAndReturn({
      data: uniqueIds.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        entityType: payload.entityType ?? null,
        entityId: payload.entityId ?? null,
      })),
    });

    this.realtime.publishNotifications(notifications);

    void this.sendPushForNotifications(notifications).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Push dispatch failed: ${reason}`);
    });

    return notifications;
  }

  /** Sends the push for already-persisted notifications to every active device. */
  async sendPushForNotifications(notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) return;

    const userIds = [...new Set(notifications.map((n) => n.userId))];
    const tokens = await this.pushTokens.findActiveForUsers(userIds);
    if (tokens.length === 0) return;

    const tokensByUser = new Map<string, string[]>();
    for (const { userId, token } of tokens) {
      tokensByUser.set(userId, [...(tokensByUser.get(userId) ?? []), token]);
    }

    const messages: ExpoPushMessage[] = notifications.flatMap((notification) =>
      (tokensByUser.get(notification.userId) ?? []).map((token) =>
        this.buildPushMessage(notification, token),
      ),
    );
    if (messages.length === 0) return;

    const results = await this.expoPush.send(messages);

    const invalidTokens = results
      .filter(
        (r) =>
          r.ticket.status === 'error' &&
          r.ticket.details?.error === 'DeviceNotRegistered',
      )
      .map((r) => r.token);
    if (invalidTokens.length > 0) {
      const count = await this.pushTokens.deactivateTokens([
        ...new Set(invalidTokens),
      ]);
      this.logger.log(`Deactivated ${count} unregistered push token(s)`);
    }

    const sent = results.filter((r) => r.ticket.status === 'ok').length;
    this.logger.debug(`Push notifications sent: ${sent}/${results.length}`);
  }

  private buildPushMessage(
    notification: Notification,
    token: string,
  ): ExpoPushMessage {
    const isReservation = RESERVATION_NOTIFICATION_TYPES.has(notification.type);
    const data: PushNotificationData = {
      type: notification.type,
      notificationId: notification.id,
    };
    if (notification.entityType === 'Reservation' && notification.entityId) {
      data.reservationId = notification.entityId;
    }
    const channelId: PushChannelId = isReservation ? 'reservation' : 'general';

    return {
      to: token,
      title: notification.title,
      body: notification.body,
      data,
      sound: 'default',
      channelId,
      priority: 'high',
    };
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

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
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
