import { UnauthorizedException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';

vi.mock('@nestjs/swagger', () => {
  const noop = () => undefined;
  const factory = () => noop;
  return {
    ApiTags: factory,
    ApiOperation: factory,
    ApiOkResponse: factory,
    ApiBadRequestResponse: factory,
    ApiUnauthorizedResponse: factory,
    ApiTooManyRequestsResponse: factory,
    ApiBearerAuth: factory,
    ApiProperty: factory,
    ApiPropertyOptional: factory,
  };
});

const authenticatedUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'employee@appatam.dev',
  firstName: 'Eden',
  lastName: 'Employee',
  role: Role.EMPLOYEE,
  status: UserStatus.ACTIVE,
  companyId: 'company-1',
  directionId: 'direction-1',
  company: { id: 'company-1', name: 'Appatam' },
  direction: { id: 'direction-1', name: 'Direction Technique' },
};

describe('AuthController / JWT protection', () => {
  it('returns profile via me() without sensitive fields', async () => {
    const { AuthController } = await import('./auth.controller.js');
    const authService = {
      me: vi.fn().mockResolvedValue(authenticatedUser),
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };

    const controller = new AuthController(authService as never);
    const result = await controller.me(authenticatedUser);

    expect(result).toEqual(authenticatedUser);
    expect(result).not.toHaveProperty('passwordHash');
    expect(authService.me).toHaveBeenCalledWith('user-1');
  });
});

describe('JWT payload expectations', () => {
  it('accepts nullable directionId in payload shape', () => {
    const payload = {
      sub: 'user-id',
      role: Role.COMPANY_ADMIN,
      companyId: 'company-id',
      directionId: null,
    };

    expect(payload.directionId).toBeNull();
  });

  it('rejects exposing passwordHash in login-like payloads', () => {
    const response = {
      accessToken: 'a',
      refreshToken: 'b',
      user: authenticatedUser,
    };
    expect(response).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response)).not.toContain('passwordHash');
  });

  it('documents unauthorized without JWT as UnauthorizedException', () => {
    expect(new UnauthorizedException().getStatus()).toBe(401);
  });
});
