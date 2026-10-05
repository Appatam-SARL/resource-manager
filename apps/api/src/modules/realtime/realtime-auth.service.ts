import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';
import { AUTH_ERROR_MESSAGES } from '../auth/constants/auth.constants.js';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../auth/types/authenticated-user.type.js';

type SocketHandshake = Pick<Socket['handshake'], 'auth' | 'headers'>;

export type RealtimeSession = {
  user: AuthenticatedUser;
  /** Access token expiry: the socket is closed at that time. */
  expiresAt: Date | null;
};

/**
 * Same access token as REST (`Authorization: Bearer`), same secret, same user
 * reload as JwtStrategy: a deleted or deactivated user is refused.
 */
@Injectable()
export class RealtimeAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  /** `handshake.auth.token` first, then the `Authorization` header (non-browser clients). */
  extractToken(handshake: SocketHandshake): string | null {
    const authToken: unknown = handshake.auth?.token;
    const raw =
      typeof authToken === 'string' ? authToken : handshake.headers.authorization;
    if (typeof raw !== 'string') return null;
    const token = raw.replace(/^Bearer\s+/i, '').trim();
    return token.length > 0 ? token : null;
  }

  async authenticate(handshake: SocketHandshake): Promise<RealtimeSession> {
    const token = this.extractToken(handshake);
    if (!token) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
    }

    let payload: JwtPayload & { exp?: number };
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload & { exp?: number }>(
        token,
        { secret: this.configService.getOrThrow<string>('jwt.accessSecret') },
      );
    } catch {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
    }

    const user = await this.authService.me(payload.sub);
    return {
      user,
      expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
    };
  }
}
