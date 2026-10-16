import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class EquipmentAvailabilityQueryDto {
  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-10-01T10:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({
    description:
      'Réservation dont les équipements ne sont pas décomptés (modification). Elle doit être visible par l’utilisateur.',
  })
  @IsOptional()
  @IsString()
  excludeReservationId?: string;
}
