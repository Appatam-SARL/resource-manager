import { BadRequestException, Logger } from '@nestjs/common';
import { AuditAction, EntityStatus, UserStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../../database/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import type { MailService } from '../../mail/mail.service.js';
import type { RealtimeService } from '../../realtime/realtime.service.js';
import { PASSWORD_RESET } from '../constants/auth.constants.js';
import { PasswordResetService } from './password-reset.service.js';
import type { PasswordService } from './password.service.js';

type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  company: { status: EntityStatus };
};

type StoredToken = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  usedAt: Date | null;
  createdAt: Date;
};

type StoredRefreshToken = { id: string; userId: string; revokedAt: Date | null };

type TokenWhere = {
  id?: string;
  userId?: string;
  usedAt?: null;
  expiresAt?: { gt: Date };
  createdAt?: { gt: Date };
  attempts?: { lt: number };
};

function matchesToken(token: StoredToken, where: TokenWhere): boolean {
  if (where.id !== undefined && token.id !== where.id) return false;
  if (where.userId !== undefined && token.userId !== where.userId) return false;
  if (where.usedAt === null && token.usedAt !== null) return false;
  if (where.expiresAt && !(token.expiresAt > where.expiresAt.gt)) return false;
  if (where.createdAt && !(token.createdAt > where.createdAt.gt)) return false;
  if (where.attempts && !(token.attempts < where.attempts.lt)) return false;
  return true;
}

function byNewest(a: StoredToken, b: StoredToken): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/** In-memory tables honouring the filters used by the password reset flow. */
function createDatabase(users: StoredUser[]) {
  const tokens: StoredToken[] = [];
  const refreshTokens: StoredRefreshToken[] = [
    { id: 'rt-1', userId: 'user-1', revokedAt: null },
    { id: 'rt-2', userId: 'user-1', revokedAt: null },
    { id: 'rt-other', userId: 'user-2', revokedAt: null },
  ];
  let sequence = 0;
  let clock = new Date('2026-10-12T10:00:00.000Z');

  const prisma = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { email: string } }) =>
        users.find((user) => user.email === where.email) ?? null,
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: { passwordHash: string } }) => {
          const user = users.find((candidate) => candidate.id === where.id);
          if (user) user.passwordHash = data.passwordHash;
          return user;
        },
      ),
    },
    passwordResetToken: {
      findMany: vi.fn(async ({ where }: { where: TokenWhere }) =>
        tokens.filter((token) => matchesToken(token, where)).sort(byNewest),
      ),
      findFirst: vi.fn(
        async ({ where }: { where: TokenWhere }) =>
          tokens.filter((token) => matchesToken(token, where)).sort(byNewest)[0] ?? null,
      ),
      create: vi.fn(
        async ({ data }: { data: { userId: string; codeHash: string; expiresAt: Date } }) => {
          sequence += 1;
          const token: StoredToken = {
            id: `token-${sequence}`,
            attempts: 0,
            usedAt: null,
            createdAt: clock,
            ...data,
          };
          tokens.push(token);
          return token;
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: TokenWhere;
          data: { expiresAt?: Date; usedAt?: Date; attempts?: { increment: number } };
        }) => {
          const targets = tokens.filter((token) => matchesToken(token, where));
          for (const token of targets) {
            if (data.expiresAt) token.expiresAt = data.expiresAt;
            if (data.usedAt) token.usedAt = data.usedAt;
            if (data.attempts) token.attempts += data.attempts.increment;
          }
          return { count: targets.length };
        },
      ),
    },
    refreshToken: {
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { userId: string; revokedAt: null };
          data: { revokedAt: Date };
        }) => {
          const targets = refreshTokens.filter(
            (token) => token.userId === where.userId && token.revokedAt === null,
          );
          for (const token of targets) token.revokedAt = data.revokedAt;
          return { count: targets.length };
        },
      ),
    },
    $transaction: vi.fn(async (work: unknown): Promise<unknown> => {
      if (Array.isArray(work)) return Promise.all(work);
      return (work as (tx: unknown) => Promise<unknown>)(prisma);
    }),
  };

  return {
    prisma,
    tokens,
    refreshTokens,
    now: () => clock,
    advance: (ms: number) => {
      clock = new Date(clock.getTime() + ms);
      return clock;
    },
  };
}

function makeUser(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: 'user-1',
    email: 'employee@appatam.dev',
    passwordHash: 'hashed:OldPassword1!',
    status: UserStatus.ACTIVE,
    company: { status: EntityStatus.ACTIVE },
    ...overrides,
  };
}

describe('PasswordResetService', () => {
  let db: ReturnType<typeof createDatabase>;
  let users: StoredUser[];
  let mail: { sendPasswordResetCode: ReturnType<typeof vi.fn> };
  let audit: { log: ReturnType<typeof vi.fn> };
  let realtime: { disconnectUser: ReturnType<typeof vi.fn> };
  let service: PasswordResetService;
  let loggerError: ReturnType<typeof vi.spyOn>;

  const passwordService = {
    hash: vi.fn(async (plain: string) => `hashed:${plain}`),
    verify: vi.fn(async (hash: string, plain: string) => hash === `hashed:${plain}`),
  };

  function lastSentCode(): string {
    const call = mail.sendPasswordResetCode.mock.calls.at(-1);
    if (!call) throw new Error('no code sent');
    return call[1] as string;
  }

  async function requestCode(email = 'employee@appatam.dev'): Promise<void> {
    await service.requestPasswordReset(email, db.now());
  }

  function reset(code: string, newPassword = 'NewPassword1!', email = 'employee@appatam.dev') {
    return service.resetPassword(email, code, newPassword, db.now());
  }

  beforeEach(() => {
    users = [
      makeUser(),
      makeUser({ id: 'user-2', email: 'inactive@appatam.dev', status: UserStatus.INACTIVE }),
      makeUser({
        id: 'user-3',
        email: 'closed-company@appatam.dev',
        company: { status: EntityStatus.INACTIVE },
      }),
    ];
    db = createDatabase(users);
    mail = { sendPasswordResetCode: vi.fn().mockResolvedValue(undefined) };
    audit = { log: vi.fn().mockResolvedValue(undefined) };
    realtime = { disconnectUser: vi.fn() };
    loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    service = new PasswordResetService(
      db.prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      mail as unknown as MailService,
      audit as unknown as AuditService,
      realtime as unknown as RealtimeService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('sends a 6-digit code to an active account and stores only its hash', async () => {
      await requestCode();

      expect(mail.sendPasswordResetCode).toHaveBeenCalledWith(
        'employee@appatam.dev',
        expect.stringMatching(/^\d{6}$/),
        PASSWORD_RESET.CODE_VALIDITY_MINUTES,
      );
      const code = lastSentCode();
      expect(db.tokens).toHaveLength(1);
      expect(passwordService.hash).toHaveBeenCalledWith(code);
      expect(db.tokens[0]?.codeHash).toBe(`hashed:${code}`);
      expect(db.tokens[0]).not.toHaveProperty('code');
      expect(db.tokens[0]?.expiresAt.getTime() - db.now().getTime()).toBe(15 * 60_000);
    });

    it.each([
      ['unknown e-mail', 'nobody@appatam.dev'],
      ['inactive user', 'inactive@appatam.dev'],
      ['inactive company', 'closed-company@appatam.dev'],
    ])('silently ignores an %s (same outcome, no e-mail)', async (_label, email) => {
      await expect(service.requestPasswordReset(email, db.now())).resolves.toBeUndefined();
      expect(mail.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(db.tokens).toHaveLength(0);
    });

    it('allows one request per minute and five per hour per e-mail', async () => {
      await requestCode();
      await requestCode();
      expect(mail.sendPasswordResetCode).toHaveBeenCalledTimes(1);

      for (let i = 0; i < 6; i += 1) {
        db.advance(61_000);
        await requestCode();
      }
      expect(mail.sendPasswordResetCode).toHaveBeenCalledTimes(5);
    });

    it('a new request invalidates the previous code', async () => {
      await requestCode();
      const firstCode = lastSentCode();
      db.advance(61_000);
      await requestCode();
      const secondCode = lastSentCode();

      if (firstCode !== secondCode) {
        await expect(reset(firstCode)).rejects.toThrow(PASSWORD_RESET.INVALID_CODE_MESSAGE);
      }
      expect(db.tokens[0]?.expiresAt.getTime()).toBeLessThanOrEqual(db.now().getTime());
      await expect(reset(secondCode)).resolves.toBeUndefined();
    });

    it('never throws when the e-mail cannot be sent, and never logs the code', async () => {
      mail.sendPasswordResetCode.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(requestCode()).resolves.toBeUndefined();

      const code = lastSentCode();
      const logged = loggerError.mock.calls.flat().join(' ');
      expect(logged).toContain('SMTP down');
      expect(logged).not.toContain(code);
    });
  });

  describe('resetPassword', () => {
    it('changes the password, marks the code used and revokes every session', async () => {
      await requestCode();

      await reset(lastSentCode(), 'NewPassword1!');

      expect(users[0]?.passwordHash).toBe('hashed:NewPassword1!');
      expect(db.tokens[0]?.usedAt).toEqual(db.now());
      expect(
        db.refreshTokens.filter((token) => token.userId === 'user-1').every((token) => token.revokedAt),
      ).toBe(true);
      expect(db.refreshTokens.find((token) => token.id === 'rt-other')?.revokedAt).toBeNull();
      expect(realtime.disconnectUser).toHaveBeenCalledWith('user-1');
    });

    it('audits the reset without the code or the password', async () => {
      await requestCode();
      const code = lastSentCode();

      await reset(code, 'NewPassword1!');

      expect(audit.log).toHaveBeenCalledWith({
        userId: 'user-1',
        action: AuditAction.UPDATE,
        entity: 'User',
        entityId: 'user-1',
        metadata: { operation: 'PASSWORD_RESET' },
      });
      const audited = JSON.stringify(audit.log.mock.calls);
      expect(audited).not.toContain(code);
      expect(audited).not.toContain('NewPassword1!');
    });

    it('rejects a wrong code with the generic message and counts the attempt', async () => {
      await requestCode();
      const wrong = lastSentCode() === '000000' ? '111111' : '000000';

      await expect(reset(wrong)).rejects.toThrow(new BadRequestException(PASSWORD_RESET.INVALID_CODE_MESSAGE));
      expect(db.tokens[0]?.attempts).toBe(1);
      expect(users[0]?.passwordHash).toBe('hashed:OldPassword1!');
    });

    it('rejects an expired code', async () => {
      await requestCode();
      const code = lastSentCode();
      db.advance(15 * 60_000);

      await expect(reset(code)).rejects.toThrow(PASSWORD_RESET.INVALID_CODE_MESSAGE);
      expect(users[0]?.passwordHash).toBe('hashed:OldPassword1!');
    });

    it('rejects a code that was already used', async () => {
      await requestCode();
      const code = lastSentCode();
      await reset(code, 'NewPassword1!');

      await expect(reset(code, 'AnotherPassword1!')).rejects.toThrow(
        PASSWORD_RESET.INVALID_CODE_MESSAGE,
      );
      expect(users[0]?.passwordHash).toBe('hashed:NewPassword1!');
    });

    it('refuses the 6th attempt even with the right code', async () => {
      await requestCode();
      const code = lastSentCode();
      const wrong = code === '000000' ? '111111' : '000000';

      for (let i = 0; i < PASSWORD_RESET.MAX_ATTEMPTS; i += 1) {
        await expect(reset(wrong)).rejects.toThrow(PASSWORD_RESET.INVALID_CODE_MESSAGE);
      }

      await expect(reset(code)).rejects.toThrow(PASSWORD_RESET.INVALID_CODE_MESSAGE);
      expect(users[0]?.passwordHash).toBe('hashed:OldPassword1!');
    });

    it.each([
      ['unknown e-mail', 'nobody@appatam.dev'],
      ['inactive user', 'inactive@appatam.dev'],
    ])('gives the same generic error for an %s', async (_label, email) => {
      await expect(reset('123456', 'NewPassword1!', email)).rejects.toThrow(
        new BadRequestException(PASSWORD_RESET.INVALID_CODE_MESSAGE),
      );
    });
  });
});
