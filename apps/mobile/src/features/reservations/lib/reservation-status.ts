import type { Reservation, ReservationStatus } from '@resource-manager/types';
import { parseApiDate } from '@/lib/format';

/**
 * Status shown to the user. An APPROVED reservation whose end is reached reads
 * as COMPLETED right away, without waiting for the server job that persists it.
 * Every other status (PENDING included) is shown as-is.
 */
export function getDisplayStatus(
  reservation: Pick<Reservation, 'status' | 'endAt'>,
  now: Date,
): ReservationStatus {
  if (reservation.status === 'APPROVED' && parseApiDate(reservation.endAt) <= now) {
    return 'COMPLETED';
  }
  return reservation.status;
}
