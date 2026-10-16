import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ExtendReservationDto } from './dto/extend-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
import { ReplaceReservationEquipmentsDto } from './dto/replace-reservation-equipments.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';
import { ReservationCompletionInterceptor } from './reservation-completion.interceptor.js';
import { ReservationsService } from './reservations.service.js';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('availability')
  @ApiOperation({ summary: 'Vérifier la disponibilité d’une ressource' })
  @ApiOkResponse()
  checkAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.reservationsService.checkAvailability(user, query);
  }

  @Get()
  @UseInterceptors(ReservationCompletionInterceptor)
  @ApiOperation({
    summary: 'Lister les réservations (périmètre organisationnel)',
  })
  @ApiOkResponse()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReservationsQueryDto,
  ) {
    return this.reservationsService.list(user, query);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une réservation' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.create(dto, user);
  }

  @Get(':id')
  @UseInterceptors(ReservationCompletionInterceptor)
  @ApiOperation({ summary: 'Détail d’une réservation' })
  @ApiOkResponse()
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une réservation en attente' })
  @ApiOkResponse()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.update(id, dto, user);
  }

  @Put(':id/equipments')
  @ApiOperation({
    summary: 'Remplacer les équipements d’une réservation',
    description:
      'Réservation en attente ou approuvée dont la date de début n’est pas atteinte (heure serveur). ' +
      'Réservé au demandeur ou à un responsable de son périmètre. Le stock est revérifié ; ' +
      'une réservation approuvée le reste et les responsables sont notifiés.',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse({
    description: 'Statut non modifiable, réservation commencée, équipement inactif ou incompatible.',
  })
  @ApiConflictResponse({ description: 'Stock insuffisant sur le créneau.' })
  replaceEquipments(
    @Param('id') id: string,
    @Body() dto: ReplaceReservationEquipmentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.replaceEquipments(id, dto, user);
  }

  @Post(':id/approve')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Approuver une réservation' })
  @ApiOkResponse()
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.approve(id, user);
  }

  @Post(':id/reject')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Rejeter une réservation' })
  @ApiOkResponse()
  reject(
    @Param('id') id: string,
    @Body() dto: RejectReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.reject(id, dto, user);
  }

  @Post(':id/extend')
  @ApiOperation({
    summary: 'Prolonger une réservation en attente ou approuvée',
    description:
      'Contrôle le périmètre, le statut, la ressource et les conflits sur la seule période ajoutée. Le statut est conservé.',
  })
  @ApiOkResponse()
  extend(
    @Param('id') id: string,
    @Body() dto: ExtendReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.extend(id, dto, user);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Annuler une réservation',
    description:
      'Seule une réservation en attente ou approuvée dont la date de début n’est pas encore atteinte ' +
      'peut être annulée, quel que soit le rôle (y compris administrateurs).',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse({
    description:
      'Statut non annulable, ou date de début atteinte : « Impossible d’annuler une réservation dont la date de début est passée. »',
  })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationsService.cancel(id, user);
  }
}
