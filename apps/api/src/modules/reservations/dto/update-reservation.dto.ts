import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  equipmentItemKey,
  MAX_EQUIPMENT_LINES,
  ReservationEquipmentItemDto,
} from '../../equipments/dto/reservation-equipment-item.dto.js';
import { MAX_PARTICIPANT_COUNT } from './create-reservation.dto.js';

export class UpdateReservationDto {
  @ApiPropertyOptional({ example: '2026-10-01T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-10-01T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  destination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  missionReason?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengerCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  meetingSubject?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PARTICIPANT_COUNT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PARTICIPANT_COUNT)
  participantCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @ApiPropertyOptional({
    type: [ReservationEquipmentItemDto],
    maxItems: MAX_EQUIPMENT_LINES,
    description: 'Remplace la liste des équipements (stock revérifié).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EQUIPMENT_LINES)
  @ArrayUnique(equipmentItemKey, {
    message: 'Chaque équipement ne peut figurer qu’une seule fois.',
  })
  @ValidateNested({ each: true })
  @Type(() => ReservationEquipmentItemDto)
  equipments?: ReservationEquipmentItemDto[];
}
