import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'jean.dupont@appatam.dev' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email invalide.' })
  email?: string;

  @ApiPropertyOptional({ example: 'Password123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    example: 'clxyz123direction',
    description: 'Optionnel — passer null pour détacher de la direction',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  directionId?: string | null;
}
