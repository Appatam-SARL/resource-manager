import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { UpdateGroupDto } from './dto/update-group.dto.js';
import { GroupService } from './group.service.js';

@ApiTags('Group')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get()
  @ApiOperation({ summary: 'Obtenir le groupe courant' })
  @ApiOkResponse()
  getCurrent() {
    return this.groupService.getCurrent();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un groupe par id' })
  getById(@Param('id') id: string) {
    return this.groupService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.GROUP_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour le groupe (GROUP_ADMIN)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.groupService.update(id, dto, user);
  }
}
