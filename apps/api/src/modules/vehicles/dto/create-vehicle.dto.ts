import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'clxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiProperty({ example: 'AB-123-CD' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(32)
  registrationNumber!: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  brand!: string;

  @ApiProperty({ example: 'Hilux' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model!: string;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  seats!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
