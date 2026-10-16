import { z } from 'zod';

/** Mirrors the API bound on the stock of an equipment. */
export const MAX_EQUIPMENT_STOCK = 1000;

export const equipmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom est requis (2 caractères minimum)')
    .max(120, '120 caractères maximum'),
  scope: z.enum(['ROOM', 'VEHICLE', 'BOTH'], { error: 'Le périmètre est requis' }),
  quantity: z
    .number({ error: 'La quantité est requise' })
    .int('Nombre entier requis')
    .min(1, 'Quantité minimale : 1')
    .max(MAX_EQUIPMENT_STOCK, `Quantité maximale : ${MAX_EQUIPMENT_STOCK}`),
  description: z.string().max(500, '500 caractères maximum').optional().or(z.literal('')),
});

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;
