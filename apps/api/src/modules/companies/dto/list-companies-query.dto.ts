import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntityStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class ListCompaniesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Recherche sur nom ou code' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
