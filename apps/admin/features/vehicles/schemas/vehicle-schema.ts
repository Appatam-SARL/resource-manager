import { z } from 'zod';

export const vehicleFormSchema = z.object({
  companyId: z.string().min(1, 'L’entreprise est requise'),
  registrationNumber: z
    .string()
    .min(2, 'L’immatriculation est requise')
    .max(32),
  brand: z.string().min(1, 'La marque est requise').max(80),
  model: z.string().min(1, 'Le modèle est requis').max(80),
  seats: z
    .number({ error: 'Le nombre de places est requis' })
    .int()
    .min(1, 'Au moins 1 place'),
  description: z.string().max(500).optional().or(z.literal('')),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
