import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ResourceListScope } from '../../../common/dto/resource-list-scope.js';

export class ListRoomsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ResourceListScope,
    default: ResourceListScope.MANAGED,
    description:
      'managed : salles gérées par votre entreprise · group : salles réservables de tout le Groupe',
  })
  @IsOptional()
  @IsEnum(ResourceListScope)
  scope?: ResourceListScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ enum: ResourceStatus })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional({
    description: 'Recherche sur le nom ou la localisation',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
