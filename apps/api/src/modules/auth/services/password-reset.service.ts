import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AuditAction, EntityStatus, UserStatus } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { MailService } from '../../mail/mail.service.js';
import { RealtimeService } from '../../realtime/realtime.service.js';
import { PASSWORD_RESET } from '../constants/auth.constants.js';
import { PasswordService } from './password.service.js';

const HOUR_MS = 60 * 60 * 1000;

type EligibleUser = { id: string; email: string };

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly mailService: MailService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  /**
   * Never throws and never reveals whether the account exists: unknown, inactive
   * or rate-limited addresses are silently ignored.
   */
  async requestPasswordReset(email: string, now: Date = new Date()): Promise<void> {
    try {
      const user = await this.findEligibleUser(email);
      if (!user || (await this.isRateLimited(user.id, now))) return;

      const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const codeHash = await this.passwordService.hash(code);
      const expiresAt = new Date(
        now.getTime() + PASSWORD_RESET.CODE_VALIDITY_MINUTES * 60_000,
      );

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
          data: { expiresAt: now },
        }),
        this.prisma.passwordResetToken.create({
          data: { userId: user.id, codeHash, expiresAt },
        }),
      ]);

      await this.mailService.sendPasswordResetCode(
        user.email,
        code,
        PASSWORD_RESET.CODE_VALIDITY_MINUTES,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Password reset request failed: ${reason}`);
    }
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    now: Date = new Date(),
  ): Promise<void> {
    const user = await this.findEligibleUser(email);
    if (!user) throw this.invalidCode();

    const token = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (
      !token ||
      token.expiresAt <= now ||
      token.attempts >= PASSWORD_RESET.MAX_ATTEMPTS
    ) {
      throw this.invalidCode();
    }

    const codeValid = await this.passwordService.verify(token.codeHash, code);
    if (!codeValid) {
      await this.prisma.passwordResetToken.updateMany({
        where: { id: token.id, attempts: { lt: PASSWORD_RESET.MAX_ATTEMPTS } },
        data: { attempts: { increment: 1 } },
      });
      throw this.invalidCode();
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      // Claiming the code first makes a concurrent second use fail.
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          attempts: { lt: PASSWORD_RESET.MAX_ATTEMPTS },
        },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw this.invalidCode();

      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    this.realtime.disconnectUser(user.id);
    await this.audit.log({
      userId: user.id,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: user.id,
      metadata: { operation: 'PASSWORD_RESET' },
    });
  }

  private async findEligibleUser(email: string): Promise<EligibleUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        status: true,
        company: { select: { status: true } },
      },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      user.company.status !== EntityStatus.ACTIVE
    ) {
      return null;
    }
    return { id: user.id, email: user.email };
  }

  private async isRateLimited(userId: string, now: Date): Promise<boolean> {
    const recent = await this.prisma.passwordResetToken.findMany({
      where: { userId, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const latest = recent[0];
    if (latest && now.getTime() - latest.createdAt.getTime() < PASSWORD_RESET.MIN_INTERVAL_MS) {
      return true;
    }
    return recent.length >= PASSWORD_RESET.MAX_REQUESTS_PER_HOUR;
  }

  private invalidCode(): BadRequestException {
    return new BadRequestException(PASSWORD_RESET.INVALID_CODE_MESSAGE);
  }
}
