import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ReservationsService } from './reservations.service.js';

export const RESERVATION_COMPLETION_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class ReservationCompletionScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReservationCompletionScheduler.name);

  constructor(private readonly reservationsService: ReservationsService) {}

  onApplicationBootstrap(): void {
    // Not awaited: a slow or unreachable database must not delay the boot.
    void this.completeEndedReservations();
  }

  @Interval(RESERVATION_COMPLETION_INTERVAL_MS)
  async completeEndedReservations(): Promise<number> {
    try {
      const completedCount = await this.reservationsService.completeEndedReservations();
      if (completedCount > 0) {
        this.logger.log(`${completedCount} reservation(s) marked as COMPLETED`);
      }
      return completedCount;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Reservation completion failed: ${reason}`);
      return 0;
    }
  }
}
