import { ApiProperty } from '@nestjs/swagger';
import { EntityStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDirectionStatusDto {
  @ApiProperty({ enum: EntityStatus, example: EntityStatus.ACTIVE })
  @IsEnum(EntityStatus)
  status!: EntityStatus;
}
