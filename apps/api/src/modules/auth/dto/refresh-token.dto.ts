import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Opaque refresh token returned at login' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token obligatoire.' })
  refreshToken!: string;
}
