import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { AUTH_ERROR_MESSAGES } from './constants/auth.constants.js';
import { toAuthenticatedUser } from './mappers/user.mapper.js';
import { PasswordService } from './services/password.service.js';
import type {
  AuthLoginResponse,
  AuthenticatedUser,
  JwtPayload,
} from './types/authenticated-user.type.js';

const userOrgInclude = {
  company: { select: { id: true, name: true } },
  direction: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthLoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: userOrgInclude,
    });

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.ACCOUNT_INACTIVE);
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const authenticatedUser = toAuthenticatedUser(user);
    const tokens = await this.issueTokenPair(authenticatedUser);

    return {
      ...tokens,
      user: authenticatedUser,
    };
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userOrgInclude,
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.UNAUTHORIZED);
    }

    return toAuthenticatedUser(user);
  }

  async refresh(rawRefreshToken: string): Promise<AuthLoginResponse> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: userOrgInclude },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
      if (stored && !stored.revokedAt) {
        await this.prisma.refreshToken.update({
          where: { id: stored.id },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    if (stored.user.status !== UserStatus.ACTIVE) {
      await this.revokeRefreshTokenById(stored.id);
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    await this.revokeRefreshTokenById(stored.id);

    const authenticatedUser = toAuthenticatedUser(stored.user);
    const tokens = await this.issueTokenPair(authenticatedUser);

    return {
      ...tokens,
      user: authenticatedUser,
    };
  }

  async logout(rawRefreshToken: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (stored && !stored.revokedAt) {
      await this.revokeRefreshTokenById(stored.id);
    }

    return { message: 'Déconnexion effectuée.' };
  }

  private async issueTokenPair(user: AuthenticatedUser) {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  private async signAccessToken(user: AuthenticatedUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      companyId: user.companyId,
      directionId: user.directionId,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.configService.getOrThrow<string>(
        'jwt.accessExpiresIn',
      ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const rawToken = randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresIn = this.configService.getOrThrow<string>(
      'jwt.refreshExpiresIn',
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.computeExpiryDate(expiresIn),
      },
    });

    return rawToken;
  }

  private async revokeRefreshTokenById(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private computeExpiryDate(expiresIn: string): Date {
    const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
    if (!match) {
      throw new Error(
        `Invalid JWT_REFRESH_EXPIRES_IN format: ${expiresIn}. Use e.g. 7d, 24h, 60m.`,
      );
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };

    return new Date(Date.now() + amount * multipliers[unit]);
  }
}
