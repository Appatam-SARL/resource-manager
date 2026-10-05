import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'employee@appatam.dev' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Email invalide.' })
  @IsNotEmpty({ message: 'Email obligatoire.' })
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 1 })
  @IsString({ message: 'Mot de passe invalide.' })
  @IsNotEmpty({ message: 'Mot de passe obligatoire.' })
  @MinLength(1)
  password!: string;
}
