import { describe, expect, it } from 'vitest';
import { loginSchema } from '@/features/auth/schemas/login-schema';

describe('loginSchema', () => {
  it('accepte un email et un mot de passe valides', () => {
    const result = loginSchema.safeParse({
      email: 'group.admin@appatam.dev',
      password: 'Password123!',
    });
    expect(result.success).toBe(true);
  });

  it('rejette un email invalide', () => {
    const result = loginSchema.safeParse({
      email: 'invalid',
      password: 'Password123!',
    });
    expect(result.success).toBe(false);
  });
});
