import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export const MAX_EQUIPMENT_LINES = 20;
export const MAX_EQUIPMENT_QUANTITY_PER_LINE = 50;

export class ReservationEquipmentItemDto {
  @ApiProperty({ example: 'clxxxxxxxx' })
  @IsString()
  @IsNotEmpty()
  equipmentId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_EQUIPMENT_QUANTITY_PER_LINE })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_EQUIPMENT_QUANTITY_PER_LINE)
  quantity!: number;
}

export function equipmentItemKey(item: ReservationEquipmentItemDto): string {
  return item.equipmentId;
}
