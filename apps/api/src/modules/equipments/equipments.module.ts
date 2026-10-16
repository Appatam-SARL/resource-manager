import { Module } from '@nestjs/common';
import { EquipmentAvailabilityService } from './equipment-availability.service.js';
import { EquipmentsController } from './equipments.controller.js';
import { EquipmentsService } from './equipments.service.js';

@Module({
  controllers: [EquipmentsController],
  providers: [EquipmentsService, EquipmentAvailabilityService],
  exports: [EquipmentAvailabilityService],
})
export class EquipmentsModule {}
