import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDirectionDto {
  @ApiPropertyOptional({ example: 'Direction Technique' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'TECH' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string | null;

  @ApiPropertyOptional({ example: 'Direction technique de l’entreprise' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
