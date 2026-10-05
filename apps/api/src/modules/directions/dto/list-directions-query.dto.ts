import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntityStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class ListDirectionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtrer par entreprise' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiPropertyOptional({ description: 'Recherche sur nom ou code' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
