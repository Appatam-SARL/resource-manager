import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectReservationDto {
  @ApiProperty({ example: 'Véhicule indisponible pour maintenance.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(500)
  rejectionReason!: string;
}
