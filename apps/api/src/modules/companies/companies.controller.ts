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
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto.js';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les entreprises (périmètre utilisateur)' })
  @ApiOkResponse()
  list(
    @Query() query: ListCompaniesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.list(query, user);
  }

  @Post()
  @Roles(Role.GROUP_ADMIN)
  @ApiOperation({ summary: 'Créer une entreprise (GROUP_ADMIN)' })
  @ApiCreatedResponse()
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir une entreprise par id' })
  @ApiOkResponse()
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une entreprise' })
  @ApiOkResponse()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.update(id, dto, user);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Changer le statut d’une entreprise' })
  @ApiOkResponse()
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.companiesService.updateStatus(id, dto, user);
  }
}
