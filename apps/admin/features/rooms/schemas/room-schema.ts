import { z } from 'zod';

/** Mirrors the API limits on `MeetingRoom.fixedEquipment`. */
export const MAX_FIXED_EQUIPMENT_ITEMS = 20;
export const MAX_FIXED_EQUIPMENT_LABEL_LENGTH = 60;

export const fixedEquipmentLabelSchema = z
  .string()
  .trim()
  .min(1, 'Libellé requis')
  .max(MAX_FIXED_EQUIPMENT_LABEL_LENGTH, `${MAX_FIXED_EQUIPMENT_LABEL_LENGTH} caractères maximum`)
  .regex(/^[^,]+$/, 'La virgule n’est pas autorisée dans un libellé');

export const roomFormSchema = z.object({
  companyId: z.string().min(1, 'L’entreprise est requise'),
  name: z.string().min(2, 'Le nom est requis').max(120),
  location: z.string().max(200).optional().or(z.literal('')),
  capacity: z
    .number({ error: 'La capacité est requise' })
    .int()
    .min(1, 'Capacité minimale : 1'),
  description: z.string().max(500).optional().or(z.literal('')),
  fixedEquipment: z
    .array(fixedEquipmentLabelSchema)
    .max(MAX_FIXED_EQUIPMENT_ITEMS, `${MAX_FIXED_EQUIPMENT_ITEMS} équipements fixes maximum`),
});

export type RoomFormValues = z.infer<typeof roomFormSchema>;

/** Adds a label unless it is empty or already present (case-insensitive). */
export function addFixedEquipmentLabel(labels: string[], raw: string): string[] {
  const label = raw.trim().replace(/\s+/g, ' ');
  if (!label) return labels;
  const key = label.toLocaleLowerCase('fr');
  if (labels.some((existing) => existing.toLocaleLowerCase('fr') === key)) return labels;
  return [...labels, label];
}
