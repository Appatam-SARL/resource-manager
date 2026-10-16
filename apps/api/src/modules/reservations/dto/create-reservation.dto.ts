import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  equipmentItemKey,
  MAX_EQUIPMENT_LINES,
  ReservationEquipmentItemDto,
} from '../../equipments/dto/reservation-equipment-item.dto.js';

/** Technical upper bound only: room capacity is indicative and does not limit participants. */
export const MAX_PARTICIPANT_COUNT = 1000;

export class CreateReservationDto {
  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @ApiPropertyOptional({
    description: 'Requis si resourceType = VEHICLE',
  })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.VEHICLE)
  @IsString()
  @IsNotEmpty()
  vehicleId?: string;

  @ApiPropertyOptional({
    description: 'Requis si resourceType = ROOM',
  })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.ROOM)
  @IsString()
  @IsNotEmpty()
  roomId?: string;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-10-01T18:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ description: 'Requis pour un véhicule' })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.VEHICLE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  destination?: string;

  @ApiPropertyOptional({ description: 'Requis pour un véhicule' })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.VEHICLE)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  missionReason?: string;

  @ApiPropertyOptional({ description: 'Requis pour un véhicule', minimum: 1 })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.VEHICLE)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengerCount?: number;

  @ApiPropertyOptional({ description: 'Requis pour une salle' })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.ROOM)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  meetingSubject?: string;

  @ApiPropertyOptional({
    description:
      'Requis pour une salle. La capacité de la salle est indicative et ne limite pas ce nombre.',
    minimum: 1,
    maximum: MAX_PARTICIPANT_COUNT,
  })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.ROOM)
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
    description:
      'Équipements du catalogue Groupe (compatibles avec le type de ressource), stock vérifié sur le créneau.',
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
