import { describe, expect, it } from 'vitest';
import { loginSchema } from './login-schema';

describe('loginSchema', () => {
  it('accepte des identifiants valides', () => {
    const result = loginSchema.safeParse({
      email: 'employee@appatam.dev',
      password: 'Password123!',
    });
    expect(result.success).toBe(true);
  });

  it('rejette un email invalide', () => {
    const result = loginSchema.safeParse({
      email: 'pas-un-email',
      password: 'Password123!',
    });
    expect(result.success).toBe(false);
  });

  it('rejette un mot de passe vide', () => {
    const result = loginSchema.safeParse({
      email: 'employee@appatam.dev',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});
