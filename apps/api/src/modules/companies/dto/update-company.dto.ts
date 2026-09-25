import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCompanyDto {
  @ApiPropertyOptional({ example: 'Appatam' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'APP' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string | null;

  @ApiPropertyOptional({ example: 'Entreprise du Groupe' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
