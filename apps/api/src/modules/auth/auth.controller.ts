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
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE, PASSWORD_RESET } from './constants/auth.constants.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import {
  AuthenticatedUserDto,
  AuthTokensResponseDto,
  MessageResponseDto,
} from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/password-reset.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthService } from './auth.service.js';
import { PasswordResetService } from './services/password-reset.service.js';
import type { AuthenticatedUser } from './types/authenticated-user.type.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

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

  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({
    default: {
      limit: AUTH_THROTTLE.FORGOT_PASSWORD_LIMIT,
      ttl: AUTH_THROTTLE.FORGOT_PASSWORD_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Demander un code de réinitialisation du mot de passe',
    description:
      'Réponse identique que le compte existe ou non. Si le compte est actif, un code à 6 chiffres valable 15 minutes est envoyé par email (1 demande par minute et 5 par heure au maximum par adresse).',
  })
  @ApiAcceptedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation échouée' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives' })
  forgotPassword(@Body() dto: ForgotPasswordDto): MessageResponseDto {
    // Not awaited: the response time must not reveal whether the account exists.
    void this.passwordResetService.requestPasswordReset(dto.email);
    return { message: PASSWORD_RESET.ACCEPTED_MESSAGE };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: AUTH_THROTTLE.RESET_PASSWORD_LIMIT,
      ttl: AUTH_THROTTLE.RESET_PASSWORD_TTL_MS,
    },
  })
  @ApiOperation({
    summary: 'Définir un nouveau mot de passe avec le code reçu par email',
    description:
      'Révoque toutes les sessions de l’utilisateur. Le code est invalidé après 5 essais erronés.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Code invalide ou expiré, ou mot de passe non conforme' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    await this.passwordResetService.resetPassword(dto.email, dto.code, dto.newPassword);
    return { message: PASSWORD_RESET.SUCCESS_MESSAGE };
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
