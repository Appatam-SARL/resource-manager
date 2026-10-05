import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { PasswordService } from './services/password.service.js';
import type { PrismaService } from '../../database/prisma.service.js';

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'employee@appatam.dev',
    passwordHash: 'hashed',
    firstName: 'Eden',
    lastName: 'Employee',
    role: Role.EMPLOYEE,
    status: UserStatus.ACTIVE,
    companyId: 'company-1',
    directionId: 'direction-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    company: { id: 'company-1', name: 'Appatam' },
    direction: { id: 'direction-1', name: 'Direction Technique' },
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    refreshToken: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let passwordService: { verify: ReturnType<typeof vi.fn>; hash: ReturnType<typeof vi.fn> };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };
  let configService: { getOrThrow: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    passwordService = {
      verify: vi.fn(),
      hash: vi.fn(),
    };
    jwtService = {
      signAsync: vi.fn().mockResolvedValue('access-token'),
    };
    configService = {
      getOrThrow: vi.fn((key: string) => {
        const values: Record<string, string> = {
          'jwt.accessSecret': 'test-access-secret-min-32-characters!!',
          'jwt.accessExpiresIn': '15m',
          'jwt.refreshSecret': 'test-refresh-secret-min-32-characters!',
          'jwt.refreshExpiresIn': '7d',
        };
        return values[key];
      }),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      passwordService as unknown as PasswordService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService,
    );
  });

  it('logs in with valid credentials and returns tokens + user without secrets', async () => {
    prisma.user.findUnique.mockResolvedValue(buildUser());
    passwordService.verify.mockResolvedValue(true);
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login('employee@appatam.dev', 'Password123!');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(result.refreshToken.length).toBeGreaterThan(20);
    expect(result.user.email).toBe('employee@appatam.dev');
    expect(result.user.direction?.name).toBe('Direction Technique');
    expect(result).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result)).not.toContain('hashed');
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String),
        }),
      }),
    );
    expect(prisma.refreshToken.create.mock.calls[0][0].data.tokenHash).not.toBe(
      result.refreshToken,
    );
  });

  it('rejects unknown email with generic message', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('missing@example.com', 'Password123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    try {
      await service.login('missing@example.com', 'Password123!');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).toBe(
        'Identifiants invalides.',
      );
    }
  });

  it('rejects wrong password with generic message', async () => {
    prisma.user.findUnique.mockResolvedValue(buildUser());
    passwordService.verify.mockResolvedValue(false);

    try {
      await service.login('employee@appatam.dev', 'wrong');
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).message).toBe(
        'Identifiants invalides.',
      );
    }
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({ status: UserStatus.INACTIVE }),
    );

    await expect(
      service.login('employee@appatam.dev', 'Password123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(passwordService.verify).not.toHaveBeenCalled();
  });

  it('returns profile for /me', async () => {
    prisma.user.findUnique.mockResolvedValue(buildUser());

    const profile = await service.me('user-1');

    expect(profile.id).toBe('user-1');
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile.company.name).toBe('Appatam');
  });

  it('supports users without direction', async () => {
    prisma.user.findUnique.mockResolvedValue(
      buildUser({
        role: Role.MANAGER,
        directionId: null,
        direction: null,
      }),
    );
    passwordService.verify.mockResolvedValue(true);
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.login(
      'manager.company@entrepriseb.dev',
      'Password123!',
    );

    expect(result.user.directionId).toBeNull();
    expect(result.user.direction).toBeNull();
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        directionId: null,
        companyId: 'company-1',
      }),
      expect.any(Object),
    );
  });

  it('refreshes tokens with rotation and revokes the old one', async () => {
    const user = buildUser();
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: user.id,
      tokenHash: 'abc',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
      user,
    });
    prisma.refreshToken.update.mockResolvedValue({});
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.refresh('raw-refresh-token');

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBeTypeOf('string');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('rejects expired refresh tokens', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'abc',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      createdAt: new Date(),
      user: buildUser(),
    });
    prisma.refreshToken.update.mockResolvedValue({});

    await expect(service.refresh('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects revoked refresh tokens', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'abc',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      user: buildUser(),
    });

    await expect(service.refresh('revoked-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('logout revokes an existing refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      revokedAt: null,
    });
    prisma.refreshToken.update.mockResolvedValue({});

    const result = await service.logout('raw-refresh-token');

    expect(result.message).toBe('Déconnexion effectuée.');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('logout is idempotent when token is unknown', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    const result = await service.logout('unknown');

    expect(result.message).toBe('Déconnexion effectuée.');
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });
});
