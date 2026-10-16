import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

/** Mirrors the API technical bound on participantCount. */
export const MAX_PARTICIPANT_COUNT = 1000;

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
    // Room capacity is indicative only: it does not limit the number of participants.
    participantCount: z
      .number({ error: 'Nombre de participants requis' })
      .int('Nombre entier requis')
      .positive('Au moins 1 participant')
      .max(MAX_PARTICIPANT_COUNT, `${MAX_PARTICIPANT_COUNT} participants maximum`),
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
