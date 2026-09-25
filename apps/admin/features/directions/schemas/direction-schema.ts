import { z } from 'zod';

export const createDirectionSchema = z.object({
  companyId: z.string().min(1, 'Entreprise requise'),
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères'),
  code: z
    .string()
    .max(32, 'Le code ne peut pas dépasser 32 caractères')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .or(z.literal('')),
});

export const updateDirectionSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(120, 'Le nom ne peut pas dépasser 120 caractères'),
  code: z
    .string()
    .max(32, 'Le code ne peut pas dépasser 32 caractères')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'La description ne peut pas dépasser 500 caractères')
    .optional()
    .or(z.literal('')),
});

export type CreateDirectionFormValues = z.infer<typeof createDirectionSchema>;
export type UpdateDirectionFormValues = z.infer<typeof updateDirectionSchema>;

export function toDirectionPayload(values: {
  name: string;
  code?: string;
  description?: string;
  companyId?: string;
}) {
  return {
    ...(values.companyId ? { companyId: values.companyId } : {}),
    name: values.name.trim(),
    code: values.code?.trim() || undefined,
    description: values.description?.trim() || undefined,
  };
}
