import { z } from 'zod';

export const rejectReservationFormSchema = z.object({
  rejectionReason: z
    .string()
    .min(3, 'Le motif doit contenir au moins 3 caractères')
    .max(500),
});

export type RejectReservationFormValues = z.infer<
  typeof rejectReservationFormSchema
>;
