import { Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import {
  MAX_TIMER_DELAY_MS,
  REALTIME_ERROR_CODES,
  REALTIME_MAX_CONNECTIONS_PER_USER,
  REALTIME_NAMESPACE,
  type RealtimeErrorCode,
} from './realtime.constants.js';
import {
  RealtimeAuthService,
  type RealtimeSession,
} from './realtime-auth.service.js';
import { getUserRooms, realtimeRooms } from './realtime-rooms.js';
import { RealtimeService } from './realtime.service.js';
import type {
  RealtimeConnectErrorData,
  RealtimeSocketData,
} from './realtime.types.js';

type ConnectError = Error & { data: RealtimeConnectErrorData };

function connectError(code: RealtimeErrorCode, message: string): ConnectError {
  const error = new Error(message) as ConnectError;
  error.data = { code, message };
  return error;
}

function socketData(socket: Socket): RealtimeSocketData {
  return socket.data as RealtimeSocketData;
}

/**
 * Transport only: authenticates the handshake, joins the rooms derived from the
 * user and cleans up on disconnect. It exposes no client → server message, so
 * no client can subscribe to someone else's data; business rules stay in services.
 * CORS and frame limits are set by RealtimeIoAdapter.
 */
@WebSocketGateway({ namespace: REALTIME_NAMESPACE })
export class RealtimeGateway
  implements OnGatewayInit<Namespace>, OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket>
{
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtimeAuth: RealtimeAuthService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(namespace: Namespace): void {
    this.realtime.bindServer(namespace);
    namespace.use((socket, next) => {
      void this.authenticateHandshake(socket).then(
        () => next(),
        (error: ConnectError) => next(error),
      );
    });
  }

  async authenticateHandshake(socket: Socket): Promise<void> {
    let session: RealtimeSession;
    try {
      session = await this.realtimeAuth.authenticate(socket.handshake);
    } catch {
      this.logger.warn(`WebSocket authentication failed (socket ${socket.id})`);
      throw connectError(
        REALTIME_ERROR_CODES.UNAUTHORIZED,
        'Authentification requise.',
      );
    }

    const openSockets = await socket.nsp
      .in(realtimeRooms.user(session.user.id))
      .fetchSockets();
    if (openSockets.length >= REALTIME_MAX_CONNECTIONS_PER_USER) {
      this.logger.warn(
        `WebSocket authorization failed: too many connections (user ${session.user.id}, socket ${socket.id})`,
      );
      throw connectError(
        REALTIME_ERROR_CODES.TOO_MANY_CONNECTIONS,
        'Trop de connexions simultanées pour ce compte.',
      );
    }

    const data = socketData(socket);
    data.user = session.user;
    if (session.expiresAt) {
      const delay = Math.min(
        Math.max(session.expiresAt.getTime() - Date.now(), 0),
        MAX_TIMER_DELAY_MS,
      );
      // The client reconnects with a refreshed token.
      data.expiryTimer = setTimeout(() => socket.disconnect(true), delay);
      data.expiryTimer.unref();
    }
  }

  async handleConnection(socket: Socket): Promise<void> {
    const user = socketData(socket).user;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    await socket.join(getUserRooms(user));
    this.logger.log(
      `WebSocket connected (socket ${socket.id}, user ${user.id}, role ${user.role})`,
    );
  }

  handleDisconnect(socket: Socket, reason?: string): void {
    const data = socketData(socket);
    if (data.expiryTimer) {
      clearTimeout(data.expiryTimer);
      data.expiryTimer = undefined;
    }
    this.logger.log(
      `WebSocket disconnected (socket ${socket.id}, user ${data.user?.id ?? 'anonymous'}, reason ${reason ?? 'unknown'})`,
    );
    data.user = undefined;
  }
}
