import { z } from 'zod';

const roleEnum = z.enum([
  'GROUP_ADMIN',
  'COMPANY_ADMIN',
  'MANAGER',
  'EMPLOYEE',
]);

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'L’adresse e-mail est requise')
    .email('Adresse e-mail invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères'),
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(80, 'Le prénom ne peut pas dépasser 80 caractères'),
  lastName: z
    .string()
    .min(1, 'Le nom est requis')
    .max(80, 'Le nom ne peut pas dépasser 80 caractères'),
  role: roleEnum,
  companyId: z.string().min(1, 'Entreprise requise'),
  directionId: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .min(1, 'L’adresse e-mail est requise')
    .email('Adresse e-mail invalide'),
  password: z
    .string()
    .max(128, 'Le mot de passe ne peut pas dépasser 128 caractères')
    .optional()
    .or(z.literal(''))
    .refine(
      (value) => !value || value.length >= 8,
      'Le mot de passe doit contenir au moins 8 caractères',
    ),
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(80, 'Le prénom ne peut pas dépasser 80 caractères'),
  lastName: z
    .string()
    .min(1, 'Le nom est requis')
    .max(80, 'Le nom ne peut pas dépasser 80 caractères'),
  role: roleEnum,
  directionId: z.string().nullable().optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export function toCreateUserPayload(values: CreateUserFormValues) {
  return {
    email: values.email.trim().toLowerCase(),
    password: values.password,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    role: values.role,
    companyId: values.companyId,
    directionId: values.directionId || null,
  };
}

export function toUpdateUserPayload(values: UpdateUserFormValues) {
  const payload: {
    email: string;
    firstName: string;
    lastName: string;
    role: CreateUserFormValues['role'];
    directionId: string | null;
    password?: string;
  } = {
    email: values.email.trim().toLowerCase(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    role: values.role,
    directionId: values.directionId || null,
  };

  if (values.password && values.password.length >= 8) {
    payload.password = values.password;
  }

  return payload;
}
