import { ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentScope } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_EQUIPMENT_STOCK } from './create-equipment.dto.js';

export class UpdateEquipmentDto {
  @ApiPropertyOptional({ example: 'Vidéoprojecteur' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_EQUIPMENT_STOCK,
    description:
      'Refusé (409) si inférieur au nombre d’unités déjà engagées sur des réservations à venir.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EQUIPMENT_STOCK)
  quantity?: number;

  @ApiPropertyOptional({ enum: EquipmentScope })
  @IsOptional()
  @IsEnum(EquipmentScope)
  scope?: EquipmentScope;
}
