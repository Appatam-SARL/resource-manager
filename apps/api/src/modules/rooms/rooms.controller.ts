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
import { CreateRoomDto } from './dto/create-room.dto.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les salles de réunion (périmètre organisationnel)',
  })
  @ApiOkResponse()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRoomsQueryDto,
  ) {
    return this.roomsService.list(user, query);
  }

  @Post()
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Créer une salle de réunion' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une salle de réunion' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.findById(id, user);
  }

  @Patch(':id')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une salle de réunion' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Changer le statut d’une salle de réunion' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRoomStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.updateStatus(id, dto.status, user);
  }

  @Delete(':id')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({
    summary:
      'Supprimer une salle (ou la désactiver si elle a des réservations)',
  })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.roomsService.remove(id, user);
  }
}
