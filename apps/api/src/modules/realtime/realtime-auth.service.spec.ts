import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actors } from '../../../test/fixtures/organization.js';
import type { AuthService } from '../auth/auth.service.js';
import type { JwtPayload } from '../auth/types/authenticated-user.type.js';
import { RealtimeAuthService } from './realtime-auth.service.js';

const SECRET = 'test-access-secret-with-at-least-32-chars';
const user = actors.employeeA;
const payload: JwtPayload = {
  sub: user.id,
  role: user.role,
  companyId: user.companyId,
  directionId: user.directionId,
};

function handshake(auth: Record<string, unknown>, authorization?: string) {
  return { auth, headers: authorization ? { authorization } : {} };
}

describe('RealtimeAuthService', () => {
  const jwtService = new JwtService({ secret: SECRET });
  const configService = {
    getOrThrow: vi.fn().mockReturnValue(SECRET),
  } as unknown as ConfigService;
  let authService: { me: ReturnType<typeof vi.fn> };
  let service: RealtimeAuthService;

  beforeEach(() => {
    authService = { me: vi.fn().mockResolvedValue(user) };
    service = new RealtimeAuthService(
      jwtService,
      configService,
      authService as unknown as AuthService,
    );
  });

  it('authenticates a valid access token and reloads the user from the database', async () => {
    const token = await jwtService.signAsync(payload, { expiresIn: '15m' });

    const session = await service.authenticate(handshake({ token }));

    expect(authService.me).toHaveBeenCalledWith(user.id);
    expect(session.user).toEqual(user);
    expect(session.expiresAt?.getTime()).toBeGreaterThan(Date.now());
  });

  it('accepts the REST convention "Authorization: Bearer" for non-browser clients', async () => {
    const token = await jwtService.signAsync(payload, { expiresIn: '15m' });

    await expect(service.authenticate(handshake({}, `Bearer ${token}`))).resolves.toMatchObject({ user });
  });

  it('takes the user id from the token, never from client-provided fields', async () => {
    const token = await jwtService.signAsync(payload, { expiresIn: '15m' });

    await service.authenticate({ auth: { token, userId: actors.groupAdmin.id }, headers: {} });

    expect(authService.me).toHaveBeenCalledWith(user.id);
  });

  it('refuses a connection without token', async () => {
    await expect(service.authenticate(handshake({}))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.me).not.toHaveBeenCalled();
  });

  it('refuses an invalid or tampered token', async () => {
    const forged = await new JwtService({ secret: 'another-secret-with-at-least-32-chars!!' }).signAsync(payload);

    await expect(service.authenticate(handshake({ token: 'not-a-jwt' }))).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.authenticate(handshake({ token: forged }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses an expired token', async () => {
    const expired = await jwtService.signAsync({
      ...payload,
      exp: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(service.authenticate(handshake({ token: expired }))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.me).not.toHaveBeenCalled();
  });

  it('refuses a deleted or deactivated user (AuthService.me rejects)', async () => {
    const token = await jwtService.signAsync(payload, { expiresIn: '15m' });
    authService.me.mockRejectedValue(new UnauthorizedException());

    await expect(service.authenticate(handshake({ token }))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
