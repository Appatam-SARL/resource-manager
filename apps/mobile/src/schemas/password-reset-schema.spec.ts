import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  PASSWORD_RULES,
  resetPasswordSchema,
} from './password-reset-schema';

const valid = {
  code: '123456',
  newPassword: 'NouveauPass1',
  confirmPassword: 'NouveauPass1',
};

function errorPaths(input: unknown): string[] {
  const result = resetPasswordSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('forgotPasswordSchema', () => {
  it('accepte un email valide (espaces retirés)', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  employee@appatam.dev ' });
    expect(result.success && result.data.email).toBe('employee@appatam.dev');
  });

  it('rejette un email vide ou invalide', () => {
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'pas-un-email' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepte un code à 6 chiffres et deux mots de passe identiques', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456', ''])('rejette le code « %s »', (code) => {
    expect(errorPaths({ ...valid, code })).toContain('code');
  });

  it('rejette un mot de passe de moins de 8 caractères', () => {
    expect(errorPaths({ ...valid, newPassword: 'Court1!', confirmPassword: 'Court1!' })).toContain(
      'newPassword',
    );
  });

  it('rejette un mot de passe de plus de 72 caractères', () => {
    const long = 'a'.repeat(73);
    expect(errorPaths({ ...valid, newPassword: long, confirmPassword: long })).toContain('newPassword');
  });

  it('rejette un mot de passe de 72 caractères qui dépasse 72 octets', () => {
    const accented = 'é'.repeat(40);
    expect(errorPaths({ ...valid, newPassword: accented, confirmPassword: accented })).toContain(
      'newPassword',
    );
  });

  it('rejette une confirmation différente', () => {
    expect(errorPaths({ ...valid, confirmPassword: 'Different1' })).toEqual(['confirmPassword']);
  });
});

describe('PASSWORD_RULES', () => {
  it('reflète les mêmes règles que le schéma', () => {
    const [minRule, maxRule] = PASSWORD_RULES;
    expect(minRule?.isSatisfied('1234567')).toBe(false);
    expect(minRule?.isSatisfied('12345678')).toBe(true);
    expect(maxRule?.isSatisfied('a'.repeat(72))).toBe(true);
    expect(maxRule?.isSatisfied('é'.repeat(40))).toBe(false);
  });
});
