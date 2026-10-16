import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ResourceListScope } from '../../../common/dto/resource-list-scope.js';
import {
  MAX_FIXED_EQUIPMENT_ITEMS,
  transformFixedEquipmentQuery,
} from './fixed-equipment.js';

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

  @ApiPropertyOptional({
    type: String,
    example: 'Écran mural,Visioconférence intégrée',
    description:
      'Salles possédant TOUS ces équipements fixes (libellés séparés par des virgules, sensibles à la casse).',
  })
  @IsOptional()
  @Transform(transformFixedEquipmentQuery)
  @IsArray()
  @ArrayMaxSize(MAX_FIXED_EQUIPMENT_ITEMS)
  @IsString({ each: true })
  fixedEquipment?: string[];
}
