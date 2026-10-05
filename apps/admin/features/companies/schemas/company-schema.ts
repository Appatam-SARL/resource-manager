import { z } from 'zod';

export const createCompanySchema = z.object({
  groupId: z.string().min(1, 'Groupe requis'),
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

export const updateCompanySchema = z.object({
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

export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;
export type UpdateCompanyFormValues = z.infer<typeof updateCompanySchema>;

export function toCompanyPayload(values: {
  name: string;
  code?: string;
  description?: string;
  groupId?: string;
}) {
  return {
    ...(values.groupId ? { groupId: values.groupId } : {}),
    name: values.name.trim(),
    code: values.code?.trim() || undefined,
    description: values.description?.trim() || undefined,
  };
}
