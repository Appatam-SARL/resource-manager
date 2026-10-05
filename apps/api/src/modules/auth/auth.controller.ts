import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE } from './constants/auth.constants.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import {
  AuthenticatedUserDto,
  AuthTokensResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: AUTH_THROTTLE.LOGIN_LIMIT,
      ttl: AUTH_THROTTLE.LOGIN_TTL_MS,
    },
  })
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiBadRequestResponse({ description: 'Validation échouée' })
  @ApiUnauthorizedResponse({ description: 'Identifiants invalides' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler les tokens (rotation)' })
  @ApiOkResponse({ type: AuthTokensResponseDto })
  @ApiBadRequestResponse({ description: 'Validation échouée' })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Révoquer le refresh token' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation échouée' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l’utilisateur authentifié' })
  @ApiOkResponse({ type: AuthenticatedUserDto })
  @ApiUnauthorizedResponse({ description: 'JWT manquant ou invalide' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
