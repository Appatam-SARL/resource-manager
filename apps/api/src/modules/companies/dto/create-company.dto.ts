import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'clxyz123group' })
  @IsString()
  @IsNotEmpty()
  groupId!: string;

  @ApiProperty({ example: 'Appatam' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'APP' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ example: 'Entreprise du Groupe' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
