import { UnauthorizedException } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { actors } from '../../../test/fixtures/organization.js';
import type { RealtimeAuthService } from './realtime-auth.service.js';
import { REALTIME_ERROR_CODES, REALTIME_MAX_CONNECTIONS_PER_USER } from './realtime.constants.js';
import { RealtimeGateway } from './realtime.gateway.js';
import type { RealtimeService } from './realtime.service.js';
import type { RealtimeSocketData } from './realtime.types.js';

function makeSocket(openSockets = 0) {
  const fetchSockets = vi.fn().mockResolvedValue(Array.from({ length: openSockets }));
  const socket = {
    id: 'socket-1',
    handshake: { auth: { token: 'jwt' }, headers: {} },
    data: {} as RealtimeSocketData,
    nsp: { in: vi.fn(() => ({ fetchSockets })) },
    join: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
  };
  return socket;
}

describe('RealtimeGateway', () => {
  let realtimeAuth: { authenticate: ReturnType<typeof vi.fn> };
  let realtime: { bindServer: ReturnType<typeof vi.fn> };
  let gateway: RealtimeGateway;

  beforeEach(() => {
    vi.useFakeTimers();
    realtimeAuth = {
      authenticate: vi.fn().mockResolvedValue({
        user: actors.managerTech,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      }),
    };
    realtime = { bindServer: vi.fn() };
    gateway = new RealtimeGateway(
      realtimeAuth as unknown as RealtimeAuthService,
      realtime as unknown as RealtimeService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handshake authentication', () => {
    it('attaches the user resolved from the token to the socket', async () => {
      const socket = makeSocket();

      await gateway.authenticateHandshake(socket as unknown as Socket);

      expect(socket.data.user).toEqual(actors.managerTech);
      expect(socket.data.expiryTimer).toBeDefined();
    });

    it('refuses the connection with a structured UNAUTHORIZED error when authentication fails', async () => {
      realtimeAuth.authenticate.mockRejectedValue(new UnauthorizedException('jwt expired'));
      const socket = makeSocket();

      await expect(gateway.authenticateHandshake(socket as unknown as Socket)).rejects.toMatchObject({
        data: { code: REALTIME_ERROR_CODES.UNAUTHORIZED, message: 'Authentification requise.' },
      });
      expect(socket.data.user).toBeUndefined();
    });

    it('does not leak the internal authentication reason to the client', async () => {
      realtimeAuth.authenticate.mockRejectedValue(new Error('invalid signature (secret mismatch)'));

      const error = await gateway.authenticateHandshake(makeSocket() as unknown as Socket).catch((e: unknown) => e);

      expect(JSON.stringify((error as { data: unknown }).data)).not.toContain('secret');
    });

    it('refuses a connection beyond the per-user limit', async () => {
      const socket = makeSocket(REALTIME_MAX_CONNECTIONS_PER_USER);

      await expect(gateway.authenticateHandshake(socket as unknown as Socket)).rejects.toMatchObject({
        data: { code: REALTIME_ERROR_CODES.TOO_MANY_CONNECTIONS },
      });
      expect(socket.nsp.in).toHaveBeenCalledWith(`user:${actors.managerTech.id}`);
    });

    it('closes the socket when the access token expires so the client reconnects with a fresh one', async () => {
      const socket = makeSocket();
      await gateway.authenticateHandshake(socket as unknown as Socket);

      vi.advanceTimersByTime(15 * 60_000);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('connection', () => {
    it('joins only the rooms derived from the authenticated user', async () => {
      const socket = makeSocket();
      socket.data.user = actors.managerTech;

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.join).toHaveBeenCalledWith([
        `user:${actors.managerTech.id}`,
        'group:members',
        `direction:${actors.managerTech.directionId}:reservations`,
      ]);
    });

    it('drops a socket that reached the connection hook without authenticated user', async () => {
      const socket = makeSocket();

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('disconnection', () => {
    it('clears the expiry timer and the user reference', async () => {
      const socket = makeSocket();
      await gateway.authenticateHandshake(socket as unknown as Socket);

      gateway.handleDisconnect(socket as unknown as Socket, 'transport close');
      vi.advanceTimersByTime(15 * 60_000);

      expect(socket.data.expiryTimer).toBeUndefined();
      expect(socket.data.user).toBeUndefined();
      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });
});
