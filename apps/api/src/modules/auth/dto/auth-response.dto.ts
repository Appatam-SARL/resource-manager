import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

class AuthCompanyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

class AuthDirectionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class AuthenticatedUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  directionId!: string | null;

  @ApiProperty({ type: AuthCompanyDto })
  company!: AuthCompanyDto;

  @ApiPropertyOptional({ nullable: true, type: AuthDirectionDto })
  direction!: AuthDirectionDto | null;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Déconnexion effectuée.' })
  message!: string;
}
