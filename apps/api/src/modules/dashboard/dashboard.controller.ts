import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DashboardService } from './dashboard.service.js';

class DashboardReservationsQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Résumé tableau de bord (scopé selon le rôle)',
  })
  @ApiOkResponse()
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getSummary(user);
  }

  @Get('reservations')
  @ApiOperation({
    summary: 'Réservations récentes du périmètre',
  })
  @ApiOkResponse()
  getReservations(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DashboardReservationsQueryDto,
  ) {
    return this.dashboardService.getReservations(user, query.limit);
  }

  @Get('resources')
  @ApiOperation({
    summary: 'Ressources du périmètre (véhicules et salles)',
  })
  @ApiOkResponse()
  getResources(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboardService.getResources(user);
  }
}
