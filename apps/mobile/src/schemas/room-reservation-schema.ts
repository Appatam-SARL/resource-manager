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

export const roomReservationSchema = z
  .object({
    roomId: z.string().min(1, 'Salle requise'),
    startDate: z.string().regex(dateRegex, 'Date invalide (AAAA-MM-JJ)'),
    startTime: z.string().regex(timeRegex, 'Heure invalide (HH:mm)'),
    endDate: z.string().regex(dateRegex, 'Date invalide (AAAA-MM-JJ)'),
    endTime: z.string().regex(timeRegex, 'Heure invalide (HH:mm)'),
    meetingSubject: z
      .string()
      .trim()
      .min(1, 'Objet de la réunion requis')
      .max(200, '200 caractères maximum'),
    participantCount: z
      .number({ error: 'Nombre de participants requis' })
      .int('Nombre entier requis')
      .positive('Au moins 1 participant'),
    comment: z.string().max(1000, '1000 caractères maximum').optional(),
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

export type RoomReservationFormValues = z.infer<typeof roomReservationSchema>;

export function validateParticipantCountAgainstCapacity(
  participantCount: number,
  capacity: number,
): string | null {
  if (participantCount < 1) return 'Au moins 1 participant';
  if (participantCount > capacity) {
    return `Le nombre de participants ne peut pas dépasser ${capacity}`;
  }
  return null;
}
