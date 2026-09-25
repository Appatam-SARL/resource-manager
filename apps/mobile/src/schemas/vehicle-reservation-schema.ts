import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

function compareDateTime(
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
): boolean {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return start < end;
}

export const vehicleReservationSchema = z
  .object({
    vehicleId: z.string().min(1, 'Véhicule requis'),
    startDate: z.string().regex(dateRegex, 'Date invalide (AAAA-MM-JJ)'),
    startTime: z.string().regex(timeRegex, 'Heure invalide (HH:mm)'),
    endDate: z.string().regex(dateRegex, 'Date invalide (AAAA-MM-JJ)'),
    endTime: z.string().regex(timeRegex, 'Heure invalide (HH:mm)'),
    destination: z.string().min(1, 'Destination requise'),
    missionReason: z.string().min(1, 'Motif de mission requis'),
    passengerCount: z
      .number({ error: 'Nombre de passagers requis' })
      .int('Nombre entier requis')
      .positive('Au moins 1 passager'),
    comment: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!compareDateTime(data.startDate, data.startTime, data.endDate, data.endTime)) {
      ctx.addIssue({
        code: 'custom',
        message: 'La date/heure de fin doit être postérieure au début',
        path: ['endDate'],
      });
    }
  });

export type VehicleReservationFormValues = z.infer<typeof vehicleReservationSchema>;

/** Optional seats check for tests / client-side UX */
export function validatePassengerCountAgainstSeats(
  passengerCount: number,
  seats: number,
): string | null {
  if (passengerCount < 1) return 'Au moins 1 passager';
  if (passengerCount > seats) {
    return `Le nombre de passagers ne peut pas dépasser ${seats} places`;
  }
  return null;
}
