import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  FIXED_EQUIPMENT_LABEL_PATTERN,
  MAX_FIXED_EQUIPMENT_ITEMS,
  MAX_FIXED_EQUIPMENT_LABEL_LENGTH,
  transformFixedEquipmentBody,
} from './fixed-equipment.js';

export class UpdateRoomDto {
  @ApiPropertyOptional({ example: 'Salle A' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Bâtiment 1 — 2e étage' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: MAX_FIXED_EQUIPMENT_ITEMS,
    description: 'Remplace la liste des équipements fixes (non réservables).',
  })
  @IsOptional()
  @Transform(transformFixedEquipmentBody)
  @IsArray()
  @ArrayMaxSize(MAX_FIXED_EQUIPMENT_ITEMS)
  @IsString({ each: true })
  @MaxLength(MAX_FIXED_EQUIPMENT_LABEL_LENGTH, { each: true })
  @Matches(FIXED_EQUIPMENT_LABEL_PATTERN, {
    each: true,
    message: 'Un équipement fixe ne peut pas contenir de virgule.',
  })
  fixedEquipment?: string[];
}
