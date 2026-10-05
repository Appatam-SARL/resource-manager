import { ApiProperty } from '@nestjs/swagger';
import { ResourceStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateVehicleStatusDto {
  @ApiProperty({ enum: ResourceStatus })
  @IsEnum(ResourceStatus)
  status!: ResourceStatus;
}
