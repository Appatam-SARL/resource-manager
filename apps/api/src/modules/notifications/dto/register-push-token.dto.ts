import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PushPlatform } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EXPO_PUSH_TOKEN_PATTERN } from '../push/expo-push.types.js';

export class RegisterPushTokenDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Jeton Expo Push de l’appareil (l’utilisateur est déduit du JWT).',
  })
  @IsString()
  @MaxLength(255)
  @Matches(EXPO_PUSH_TOKEN_PATTERN, {
    message: 'Le jeton de notification est invalide.',
  })
  token!: string;

  @ApiProperty({ enum: PushPlatform, example: PushPlatform.ANDROID })
  @IsEnum(PushPlatform)
  platform!: PushPlatform;

  @ApiPropertyOptional({ example: 'Pixel 8', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}
