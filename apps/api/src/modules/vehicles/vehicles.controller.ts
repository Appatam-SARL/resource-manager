import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto.js';
import {
  type UploadedImageFile,
  VEHICLE_IMAGE_UPLOAD_LIMIT_BYTES,
} from './vehicle-image.js';
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
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findById(id);
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

  @Get(':id/image')
  @ApiOperation({ summary: 'Image d’un véhicule (404 si aucune image)' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  async getImage(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const image = await this.vehiclesService.getImage(id);
    response.set({
      'Content-Type': image.mimeType,
      'Content-Length': String(image.size),
      'Cache-Control': 'private, max-age=86400',
      'Last-Modified': image.updatedAt.toUTCString(),
    });
    return new StreamableFile(Buffer.from(image.data));
  }

  @Put(':id/image')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: VEHICLE_IMAGE_UPLOAD_LIMIT_BYTES, files: 1 },
    }),
  )
  @ApiOperation({
    summary: 'Ajouter ou remplacer l’image d’un véhicule (JPEG, PNG, WebP, 2 Mo max)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  setImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedImageFile | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.setImage(id, file, user);
  }

  @Delete(':id/image')
  @Roles(Role.GROUP_ADMIN, Role.COMPANY_ADMIN)
  @ApiOperation({ summary: 'Supprimer l’image d’un véhicule' })
  removeImage(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehiclesService.removeImage(id, user);
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
