import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class ListVehiclesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ enum: ResourceStatus })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional({
    description: 'Recherche sur immatriculation, marque ou modèle',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
