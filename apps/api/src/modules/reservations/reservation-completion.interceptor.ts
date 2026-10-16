import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { from, switchMap, type Observable } from 'rxjs';
import { ReservationsService } from './reservations.service.js';

/** Completes ended reservations (throttled) before serving reservation reads. */
@Injectable()
export class ReservationCompletionInterceptor implements NestInterceptor {
  constructor(private readonly reservationsService: ReservationsService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(this.reservationsService.completeEndedReservationsIfStale()).pipe(
      switchMap(() => next.handle()),
    );
  }
}
