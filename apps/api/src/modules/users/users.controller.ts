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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil utilisateur courant' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.me(user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les utilisateurs' })
  list(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.list(query, user);
  }

  @Post()
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Créer un utilisateur' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail utilisateur' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(id, user);
  }

  @Patch(':id')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un utilisateur' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Changer le statut utilisateur' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto, user);
  }
}
