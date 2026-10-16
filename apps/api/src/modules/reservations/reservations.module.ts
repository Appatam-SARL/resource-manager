import { Module } from '@nestjs/common';
import { EquipmentsModule } from '../equipments/equipments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CalendarController } from './calendar.controller.js';
import { ReservationCompletionInterceptor } from './reservation-completion.interceptor.js';
import { ReservationCompletionScheduler } from './reservation-completion.scheduler.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

@Module({
  imports: [NotificationsModule, EquipmentsModule],
  controllers: [ReservationsController, CalendarController],
  providers: [
    ReservationsService,
    ReservationCompletionScheduler,
    ReservationCompletionInterceptor,
  ],
  exports: [ReservationsService, ReservationCompletionInterceptor],
})
export class ReservationsModule {}
