import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  resourceType!: ResourceType;

  @ApiProperty({ description: 'vehicleId ou roomId selon resourceType' })
  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @ApiProperty({ example: '2026-10-01T08:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-10-01T18:00:00.000Z' })
  @IsDateString()
  endAt!: string;
}

export class CalendarQueryDto {
  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  directionId?: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-10-31' })
  @IsDateString()
  endDate!: string;
}
