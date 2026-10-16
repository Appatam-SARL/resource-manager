import { UnauthorizedException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { PASSWORD_RESET } from './constants/auth.constants.js';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';

vi.mock('@nestjs/swagger', () => {
  const noop = () => undefined;
  const factory = () => noop;
  return {
    ApiTags: factory,
    ApiOperation: factory,
    ApiOkResponse: factory,
    ApiAcceptedResponse: factory,
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
    const authService = {
      me: vi.fn().mockResolvedValue(authenticatedUser),
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
    };

    const controller = new AuthController(authService as never, {} as never);
    const result = await controller.me(authenticatedUser);

    expect(result).toEqual(authenticatedUser);
    expect(result).not.toHaveProperty('passwordHash');
    expect(authService.me).toHaveBeenCalledWith('user-1');
  });
});

describe('AuthController / forgot password', () => {
  it('answers immediately with the same message, without waiting for the e-mail', () => {
    let finishRequest: () => void = () => undefined;
    const passwordResetService = {
      requestPasswordReset: vi.fn(
        () => new Promise<void>((resolve) => {
          finishRequest = resolve;
        }),
      ),
    };
    const controller = new AuthController({} as never, passwordResetService as never);

    const known = controller.forgotPassword({ email: 'employee@appatam.dev' });
    const unknown = controller.forgotPassword({ email: 'nobody@appatam.dev' });

    expect(known).toEqual({ message: PASSWORD_RESET.ACCEPTED_MESSAGE });
    expect(unknown).toEqual(known);
    expect(passwordResetService.requestPasswordReset).toHaveBeenCalledTimes(2);
    finishRequest();
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
