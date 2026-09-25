import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: 'AB-123-CD' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'Toyota' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @ApiPropertyOptional({ example: 'Hilux' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @ApiPropertyOptional({ example: 5, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
