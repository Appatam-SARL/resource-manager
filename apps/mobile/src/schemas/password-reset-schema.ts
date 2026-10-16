import { z } from 'zod';

/** Same rules as the API (user creation and password reset). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
/** bcrypt ignores everything past 72 bytes: accents and symbols count for more than one. */
const PASSWORD_MAX_BYTES = 72;

export const RESET_CODE_LENGTH = 6;

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export type PasswordRule = {
  id: 'min-length' | 'max-length';
  label: string;
  isSatisfied: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'min-length',
    label: `Au moins ${PASSWORD_MIN_LENGTH} caractères`,
    isSatisfied: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'max-length',
    label: `${PASSWORD_MAX_LENGTH} caractères maximum (moins avec des accents ou symboles)`,
    isSatisfied: (password) =>
      password.length <= PASSWORD_MAX_LENGTH && utf8ByteLength(password) <= PASSWORD_MAX_BYTES,
  },
];

const emailField = z
  .string()
  .trim()
  .min(1, 'L’adresse e-mail est requise')
  .email('Adresse e-mail invalide');

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, `Le code doit contenir exactement ${RESET_CODE_LENGTH} chiffres`),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`)
      .max(PASSWORD_MAX_LENGTH, `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères`)
      .refine(
        (password) => utf8ByteLength(password) <= PASSWORD_MAX_BYTES,
        'Le mot de passe est trop long (moins de caractères avec des accents ou symboles)',
      ),
    confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Les mots de passe ne correspondent pas',
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
