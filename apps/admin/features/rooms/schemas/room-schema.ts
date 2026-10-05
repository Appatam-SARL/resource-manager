import { z } from 'zod';

export const roomFormSchema = z.object({
  companyId: z.string().min(1, 'L’entreprise est requise'),
  name: z.string().min(2, 'Le nom est requis').max(120),
  location: z.string().max(200).optional().or(z.literal('')),
  capacity: z
    .number({ error: 'La capacité est requise' })
    .int()
    .min(1, 'Capacité minimale : 1'),
  description: z.string().max(500).optional().or(z.literal('')),
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;
