import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../services/password.service.js';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class ForgotPasswordDto {
  @ApiProperty({ example: 'employee@appatam.dev' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide.' })
  @IsNotEmpty({ message: 'Email obligatoire.' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'employee@appatam.dev' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide.' })
  @IsNotEmpty({ message: 'Email obligatoire.' })
  email!: string;

  @ApiProperty({ example: '123456', description: 'Code à 6 chiffres reçu par email' })
  @IsString({ message: 'Code invalide ou expiré.' })
  @Matches(/^\d{6}$/, { message: 'Code invalide ou expiré.' })
  code!: string;

  @ApiProperty({
    example: 'NouveauMotDePasse1!',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @IsString({ message: 'Mot de passe invalide.' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
  })
  newPassword!: string;
}
