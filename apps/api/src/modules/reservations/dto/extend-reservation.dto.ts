import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExtendReservationDto {
  @ApiProperty({
    example: '2026-10-01T13:00:00.000Z',
    description: 'Nouvelle date/heure de fin, strictement postérieure à la fin actuelle.',
  })
  @IsDateString()
  newEndAt!: string;
}
