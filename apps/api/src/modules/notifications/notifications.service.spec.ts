import { NotificationType, type Notification } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import type { RealtimeService } from '../realtime/realtime.service.js';
import { NotificationsService } from './notifications.service.js';
import type { PushTokensService } from './push-tokens.service.js';
import type { ExpoPushService } from './push/expo-push.service.js';
import type { ExpoPushMessage } from './push/expo-push.types.js';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: overrides.id ?? 'notif-1',
    userId: overrides.userId ?? 'user-1',
    type: overrides.type ?? NotificationType.RESERVATION_APPROVED,
    title: overrides.title ?? 'Réservation approuvée',
    body: overrides.body ?? 'Votre réservation a été approuvée.',
    entityType: overrides.entityType ?? 'Reservation',
    entityId: overrides.entityId ?? 'res-1',
    readAt: overrides.readAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-09-28T10:00:00Z'),
  };
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      createManyAndReturn: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
  };
  let pushTokens: {
    findActiveForUsers: ReturnType<typeof vi.fn>;
    deactivateTokens: ReturnType<typeof vi.fn>;
  };
  let expoPush: { send: ReturnType<typeof vi.fn> };
  let realtime: { publishNotifications: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      notification: {
        createManyAndReturn: vi.fn(),
        count: vi.fn(),
      },
    };
    pushTokens = {
      findActiveForUsers: vi.fn().mockResolvedValue([]),
      deactivateTokens: vi.fn().mockResolvedValue(0),
    };
    expoPush = { send: vi.fn().mockResolvedValue([]) };
    realtime = { publishNotifications: vi.fn() };

    service = new NotificationsService(
      prisma as unknown as PrismaService,
      pushTokens as unknown as PushTokensService,
      expoPush as unknown as ExpoPushService,
      realtime as unknown as RealtimeService,
    );
  });

  describe('createManyForUsers', () => {
    it('persists one notification per unique user (source of truth)', async () => {
      const created = [makeNotification({ userId: 'user-1' })];
      prisma.notification.createManyAndReturn.mockResolvedValue(created);

      const result = await service.createManyForUsers(['user-1', 'user-1'], {
        type: NotificationType.RESERVATION_APPROVED,
        title: 'Réservation approuvée',
        body: 'Votre réservation a été approuvée.',
        entityType: 'Reservation',
        entityId: 'res-1',
      });

      expect(result).toEqual(created);
      expect(prisma.notification.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ userId: 'user-1', entityId: 'res-1' }),
        ],
      });
    });

    it('does nothing when there is no recipient', async () => {
      await expect(
        service.createManyForUsers([], {
          type: NotificationType.RESERVATION_CANCELLED,
          title: 't',
          body: 'b',
        }),
      ).resolves.toEqual([]);
      expect(prisma.notification.createManyAndReturn).not.toHaveBeenCalled();
      expect(realtime.publishNotifications).not.toHaveBeenCalled();
    });

    it('publishes notification.created in real time once persisted', async () => {
      const created = [makeNotification({ userId: 'user-1' }), makeNotification({ id: 'notif-2', userId: 'user-2' })];
      prisma.notification.createManyAndReturn.mockResolvedValue(created);

      await service.createManyForUsers(['user-1', 'user-2'], {
        type: NotificationType.RESERVATION_APPROVED,
        title: 'Réservation approuvée',
        body: 'Votre réservation a été approuvée.',
      });

      expect(realtime.publishNotifications).toHaveBeenCalledWith(created);
    });

    it('publishes nothing when persistence fails', async () => {
      prisma.notification.createManyAndReturn.mockRejectedValue(new Error('db down'));

      await expect(
        service.createManyForUsers(['user-1'], {
          type: NotificationType.RESERVATION_APPROVED,
          title: 't',
          body: 'b',
        }),
      ).rejects.toThrow('db down');
      expect(realtime.publishNotifications).not.toHaveBeenCalled();
    });

    it('never fails the caller when the push transport fails', async () => {
      prisma.notification.createManyAndReturn.mockResolvedValue([
        makeNotification(),
      ]);
      pushTokens.findActiveForUsers.mockResolvedValue([
        { userId: 'user-1', token: 'ExponentPushToken[a]' },
      ]);
      expoPush.send.mockRejectedValue(new Error('Expo down'));

      await expect(
        service.createManyForUsers(['user-1'], {
          type: NotificationType.RESERVATION_APPROVED,
          title: 'Réservation approuvée',
          body: 'Votre réservation a été approuvée.',
        }),
      ).resolves.toHaveLength(1);
      await flushPromises();
      expect(expoPush.send).toHaveBeenCalled();
    });
  });

  describe('sendPushForNotifications', () => {
    it('skips Expo when the user has no active device', async () => {
      await service.sendPushForNotifications([makeNotification()]);
      expect(expoPush.send).not.toHaveBeenCalled();
    });

    it('sends to every active device with a minimal payload', async () => {
      pushTokens.findActiveForUsers.mockResolvedValue([
        { userId: 'user-1', token: 'ExponentPushToken[android]' },
        { userId: 'user-1', token: 'ExponentPushToken[ios]' },
      ]);

      await service.sendPushForNotifications([makeNotification()]);

      const messages = expoPush.send.mock.calls[0][0] as ExpoPushMessage[];
      expect(messages.map((m) => m.to)).toEqual([
        'ExponentPushToken[android]',
        'ExponentPushToken[ios]',
      ]);
      expect(messages[0]).toMatchObject({
        title: 'Réservation approuvée',
        channelId: 'reservation',
        data: {
          type: NotificationType.RESERVATION_APPROVED,
          notificationId: 'notif-1',
          reservationId: 'res-1',
        },
      });
      expect(Object.keys(messages[0].data).sort()).toEqual([
        'notificationId',
        'reservationId',
        'type',
      ]);
    });

    it('only targets the devices of the notified user', async () => {
      pushTokens.findActiveForUsers.mockResolvedValue([
        { userId: 'user-1', token: 'ExponentPushToken[u1]' },
        { userId: 'user-2', token: 'ExponentPushToken[u2]' },
      ]);

      await service.sendPushForNotifications([
        makeNotification({ id: 'n1', userId: 'user-1' }),
      ]);

      const messages = expoPush.send.mock.calls[0][0] as ExpoPushMessage[];
      expect(messages).toHaveLength(1);
      expect(messages[0].to).toBe('ExponentPushToken[u1]');
    });

    it('deactivates only unregistered tokens and keeps valid devices', async () => {
      pushTokens.findActiveForUsers.mockResolvedValue([
        { userId: 'user-1', token: 'ExponentPushToken[valid]' },
        { userId: 'user-1', token: 'ExponentPushToken[gone]' },
      ]);
      expoPush.send.mockResolvedValue([
        { token: 'ExponentPushToken[valid]', ticket: { status: 'ok', id: 't1' } },
        {
          token: 'ExponentPushToken[gone]',
          ticket: {
            status: 'error',
            message: 'not registered',
            details: { error: 'DeviceNotRegistered' },
          },
        },
      ]);

      await service.sendPushForNotifications([makeNotification()]);

      expect(pushTokens.deactivateTokens).toHaveBeenCalledWith([
        'ExponentPushToken[gone]',
      ]);
    });

    it('keeps tokens on transient errors', async () => {
      pushTokens.findActiveForUsers.mockResolvedValue([
        { userId: 'user-1', token: 'ExponentPushToken[a]' },
      ]);
      expoPush.send.mockResolvedValue([
        {
          token: 'ExponentPushToken[a]',
          ticket: { status: 'error', message: 'TimeoutError' },
        },
      ]);

      await service.sendPushForNotifications([makeNotification()]);

      expect(pushTokens.deactivateTokens).not.toHaveBeenCalled();
    });
  });

  it('counts unread notifications of the current user only', async () => {
    prisma.notification.count.mockResolvedValue(4);
    await expect(service.countUnread('user-1')).resolves.toEqual({ count: 4 });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
    });
  });
});
