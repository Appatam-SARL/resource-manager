import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { RegisterPushTokenDto } from './dto/register-push-token.dto.js';

export type ActivePushToken = { userId: string; token: string };

@Injectable()
export class PushTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers the device token for the authenticated user.
   * A token identifies one device: if it was linked to another account
   * (shared device, re-login), it is re-assigned to the current user.
   * Other devices of the user are left untouched (multi-device).
   */
  async register(userId: string, dto: RegisterPushTokenDto) {
    const now = new Date();
    const deviceName = dto.deviceName?.trim() || null;
    const saved = await this.prisma.userPushToken.upsert({
      where: { token: dto.token },
      create: {
        userId,
        token: dto.token,
        platform: dto.platform,
        deviceName,
        isActive: true,
        lastUsedAt: now,
      },
      update: {
        userId,
        platform: dto.platform,
        deviceName,
        isActive: true,
        lastUsedAt: now,
      },
      select: { id: true, platform: true, isActive: true, updatedAt: true },
    });
    return saved;
  }

  /** Deactivates the token only if it belongs to the authenticated user. */
  async unregister(userId: string, token: string) {
    const result = await this.prisma.userPushToken.updateMany({
      where: { token, userId, isActive: true },
      data: { isActive: false },
    });
    return { deactivated: result.count };
  }

  async findActiveForUsers(userIds: string[]): Promise<ActivePushToken[]> {
    if (userIds.length === 0) return [];
    return this.prisma.userPushToken.findMany({
      where: { userId: { in: userIds }, isActive: true },
      select: { userId: true, token: true },
    });
  }

  async deactivateTokens(tokens: string[]): Promise<number> {
    if (tokens.length === 0) return 0;
    const result = await this.prisma.userPushToken.updateMany({
      where: { token: { in: tokens } },
      data: { isActive: false },
    });
    return result.count;
  }
}
