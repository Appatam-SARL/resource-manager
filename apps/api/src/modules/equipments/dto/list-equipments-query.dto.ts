import { ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentScope, ResourceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class ListEquipmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: EquipmentScope })
  @IsOptional()
  @IsEnum(EquipmentScope)
  scope?: EquipmentScope;

  @ApiPropertyOptional({
    enum: ResourceStatus,
    description: 'Ignoré hors GROUP_ADMIN : seuls les équipements disponibles sont listés.',
  })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional({ description: 'Recherche sur le nom ou la description' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
