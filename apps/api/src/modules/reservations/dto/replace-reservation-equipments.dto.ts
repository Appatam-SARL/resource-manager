import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  ValidateNested,
} from 'class-validator';
import {
  equipmentItemKey,
  MAX_EQUIPMENT_LINES,
  ReservationEquipmentItemDto,
} from '../../equipments/dto/reservation-equipment-item.dto.js';

export class ReplaceReservationEquipmentsDto {
  @ApiProperty({
    type: [ReservationEquipmentItemDto],
    maxItems: MAX_EQUIPMENT_LINES,
    description: 'Nouvelle liste complète (vide pour retirer tous les équipements).',
  })
  @IsArray()
  @ArrayMaxSize(MAX_EQUIPMENT_LINES)
  @ArrayUnique(equipmentItemKey, {
    message: 'Chaque équipement ne peut figurer qu’une seule fois.',
  })
  @ValidateNested({ each: true })
  @Type(() => ReservationEquipmentItemDto)
  equipments!: ReservationEquipmentItemDto[];
}
