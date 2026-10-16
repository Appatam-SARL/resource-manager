import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../auth/services/password.service.js';

export class CreateUserDto {
  @ApiProperty({ example: 'jean.dupont@appatam.dev' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email invalide.' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.EMPLOYEE })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ example: 'clxyz123company' })
  @IsString()
  @IsNotEmpty()
  companyId!: string;

  @ApiPropertyOptional({
    example: 'clxyz123direction',
    description: 'Optionnel — null si l’entreprise n’a pas de direction',
  })
  @IsOptional()
  @IsString()
  directionId?: string | null;
}
