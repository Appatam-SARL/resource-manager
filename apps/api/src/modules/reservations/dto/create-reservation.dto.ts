import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Requis pour une salle', minimum: 1 })
  @ValidateIf((o: CreateReservationDto) => o.resourceType === ResourceType.ROOM)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  participantCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
