import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CalendarController } from './calendar.controller.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ReservationsController, CalendarController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
