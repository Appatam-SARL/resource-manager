import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { EquipmentAvailabilityQueryDto } from './dto/equipment-availability-query.dto.js';
import { ListEquipmentsQueryDto } from './dto/list-equipments-query.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';
import { UpdateEquipmentStatusDto } from './dto/update-equipment-status.dto.js';
import { EquipmentAvailabilityService } from './equipment-availability.service.js';
import { EquipmentsService } from './equipments.service.js';

@ApiTags('Equipments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipments')
export class EquipmentsController {
  constructor(
    private readonly equipmentsService: EquipmentsService,
    private readonly availabilityService: EquipmentAvailabilityService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lister le catalogue d’équipements du Groupe',
    description: 'Hors GROUP_ADMIN, seuls les équipements disponibles sont listés.',
  })
  @ApiOkResponse()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEquipmentsQueryDto,
  ) {
    return this.equipmentsService.list(user, query);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Quantités disponibles des équipements sur un créneau',
    description:
      'Équipements disponibles et compatibles avec le type de ressource. Seules les quantités sont exposées, jamais les réservations qui les consomment.',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse({ description: 'Créneau invalide.' })
  availability(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: EquipmentAvailabilityQueryDto,
  ) {
    return this.availabilityService.getAvailability(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un équipement' })
  @ApiOkResponse()
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.equipmentsService.findById(id, user);
  }

  @Post()
  @Roles(Role.GROUP_ADMIN)
  @ApiOperation({ summary: 'Créer un équipement (GROUP_ADMIN)' })
  @ApiCreatedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({ description: 'Nom déjà utilisé.' })
  create(
    @Body() dto: CreateEquipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equipmentsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.GROUP_ADMIN)
  @ApiOperation({ summary: 'Modifier un équipement (GROUP_ADMIN)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({
    description:
      'Nom déjà utilisé, stock inférieur aux unités engagées ou périmètre incompatible avec des réservations à venir.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equipmentsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.GROUP_ADMIN)
  @ApiOperation({ summary: 'Changer le statut d’un équipement (GROUP_ADMIN)' })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.equipmentsService.updateStatus(id, dto.status, user);
  }

  @Delete(':id')
  @Roles(Role.GROUP_ADMIN)
  @ApiOperation({
    summary: 'Supprimer un équipement (GROUP_ADMIN)',
    description: 'Refusé si l’équipement figure dans une réservation : le mettre hors service.',
  })
  @ApiOkResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse({ description: 'Équipement utilisé par des réservations.' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.equipmentsService.remove(id, user);
  }
}
