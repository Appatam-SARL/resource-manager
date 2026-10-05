import { PushPlatform } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service.js';
import { PushTokensService } from './push-tokens.service.js';

describe('PushTokensService', () => {
  let service: PushTokensService;
  let prisma: {
    userPushToken: {
      upsert: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    prisma = {
      userPushToken: {
        upsert: vi.fn().mockResolvedValue({ id: 'pt-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new PushTokensService(prisma as unknown as PrismaService);
  });

  it('binds the token to the authenticated user and reactivates it', async () => {
    await service.register('user-1', {
      token: 'ExponentPushToken[abc]',
      platform: PushPlatform.ANDROID,
      deviceName: '  Pixel 8 ',
    });

    expect(prisma.userPushToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'ExponentPushToken[abc]' },
        create: expect.objectContaining({
          userId: 'user-1',
          platform: PushPlatform.ANDROID,
          deviceName: 'Pixel 8',
          isActive: true,
        }),
        update: expect.objectContaining({ userId: 'user-1', isActive: true }),
      }),
    );
  });

  it('upserts by token so other devices of the user are kept (multi-device)', async () => {
    await service.register('user-1', {
      token: 'ExponentPushToken[phone]',
      platform: PushPlatform.ANDROID,
    });
    await service.register('user-1', {
      token: 'ExponentPushToken[tablet]',
      platform: PushPlatform.IOS,
    });

    expect(prisma.userPushToken.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.userPushToken.updateMany).not.toHaveBeenCalled();
  });

  it('only deactivates a token owned by the current user', async () => {
    prisma.userPushToken.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.unregister('user-2', 'ExponentPushToken[abc]');

    expect(result).toEqual({ deactivated: 0 });
    expect(prisma.userPushToken.updateMany).toHaveBeenCalledWith({
      where: { token: 'ExponentPushToken[abc]', userId: 'user-2', isActive: true },
      data: { isActive: false },
    });
  });

  it('returns no token without querying when there is no user', async () => {
    await expect(service.findActiveForUsers([])).resolves.toEqual([]);
    expect(prisma.userPushToken.findMany).not.toHaveBeenCalled();
  });

  it('queries only active tokens of the given users', async () => {
    await service.findActiveForUsers(['user-1', 'user-2']);
    expect(prisma.userPushToken.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ['user-1', 'user-2'] }, isActive: true },
      select: { userId: true, token: true },
    });
  });
});
