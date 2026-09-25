import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateDirectionDto {
  @ApiProperty({ example: 'clxyz123company' })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiProperty({ example: 'Direction Technique' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'TECH' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'Direction technique de l’entreprise' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
