import {
  Body,
  Controller,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { DirectionsService } from './directions.service.js';
import { CreateDirectionDto } from './dto/create-direction.dto.js';
import { ListDirectionsQueryDto } from './dto/list-directions-query.dto.js';
import { UpdateDirectionDto } from './dto/update-direction.dto.js';
import { UpdateDirectionStatusDto } from './dto/update-direction-status.dto.js';

@ApiTags('Directions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('directions')
export class DirectionsController {
  constructor(private readonly directionsService: DirectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les directions (périmètre utilisateur)' })
  @ApiOkResponse()
  list(
    @Query() query: ListDirectionsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directionsService.list(query, user);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une direction' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateDirectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directionsService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir une direction par id' })
  @ApiOkResponse()
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.directionsService.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une direction' })
  @ApiOkResponse()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDirectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directionsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut d’une direction' })
  @ApiOkResponse()
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDirectionStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.directionsService.updateStatus(id, dto, user);
  }
}
