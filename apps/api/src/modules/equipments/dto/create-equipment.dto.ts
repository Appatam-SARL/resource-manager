import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentScope } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const MAX_EQUIPMENT_STOCK = 1000;

export class CreateEquipmentDto {
  @ApiProperty({ example: 'Vidéoprojecteur' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Epson, câble HDMI fourni' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: MAX_EQUIPMENT_STOCK })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EQUIPMENT_STOCK)
  quantity!: number;

  @ApiProperty({
    enum: EquipmentScope,
    description: 'ROOM : salles · VEHICLE : véhicules · BOTH : les deux',
  })
  @IsEnum(EquipmentScope)
  scope!: EquipmentScope;
}
