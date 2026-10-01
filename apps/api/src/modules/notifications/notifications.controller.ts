import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { RegisterPushTokenDto } from './dto/register-push-token.dto.js';
import { NotificationsService } from './notifications.service.js';
import { PushTokensService } from './push-tokens.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Authentification requise.' })
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushTokensService: PushTokensService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes notifications' })
  @ApiOkResponse({ description: 'Liste paginée, les plus récentes en premier.' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.listForUser(
      user.id,
      query.page,
      query.limit,
    );
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de mes notifications non lues' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { count: { type: 'number', example: 3 } } },
  })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.countUnread(user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marquer toutes mes notifications comme lues' })
  @ApiOkResponse({
    schema: { type: 'object', properties: { updated: { type: 'number' } } },
  })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiOkResponse({ description: 'Notification mise à jour.' })
  @ApiNotFoundResponse({ description: 'Notification introuvable.' })
  @ApiForbiddenResponse({ description: 'Notification d’un autre utilisateur.' })
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('push-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enregistrer le jeton Expo Push de cet appareil',
    description:
      'Associe le jeton à l’utilisateur du JWT. Plusieurs appareils peuvent être actifs pour un même utilisateur.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        platform: { type: 'string', enum: ['ANDROID', 'IOS'] },
        isActive: { type: 'boolean' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Jeton ou plateforme invalide.' })
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushTokensService.register(user.id, dto);
  }

  @Delete('push-tokens/:token')
  @ApiOperation({
    summary: 'Désactiver le jeton Expo Push de cet appareil',
    description:
      'Idempotent. Seul un jeton appartenant à l’utilisateur authentifié peut être désactivé.',
  })
  @ApiParam({
    name: 'token',
    description: 'Jeton Expo Push encodé pour URL.',
  })
  @ApiOkResponse({
    schema: { type: 'object', properties: { deactivated: { type: 'number' } } },
  })
  unregisterPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
  ) {
    return this.pushTokensService.unregister(user.id, token);
  }
}
