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
  ApiBearerAuth,
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
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto.js';
import { VehiclesService } from './vehicles.service.js';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les véhicules (périmètre organisationnel)' })
  @ApiOkResponse()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListVehiclesQueryDto,
  ) {
    return this.vehiclesService.list(user, query);
  }

  @Post()
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Créer un véhicule' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un véhicule' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.findById(id, user);
  }

  @Patch(':id')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un véhicule' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Changer le statut d’un véhicule' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.updateStatus(id, dto.status, user);
  }

  @Delete(':id')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({
    summary:
      'Supprimer un véhicule (ou le désactiver s’il a des réservations)',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.remove(id, user);
  }
}
