import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { formatResendLabel, getPasswordResetErrorMessage } from './password-reset';

describe('getPasswordResetErrorMessage', () => {
  it('explique la limitation des tentatives (429)', () => {
    expect(getPasswordResetErrorMessage(new AppError('x', 429))).toBe(
      'Trop de tentatives, réessayez dans quelques minutes.',
    );
  });

  it('reprend le message générique du serveur pour un code invalide (400)', () => {
    expect(getPasswordResetErrorMessage(new AppError('Code invalide ou expiré.', 400))).toBe(
      'Code invalide ou expiré.',
    );
  });

  it('garde le message réseau', () => {
    expect(
      getPasswordResetErrorMessage(new AppError('Impossible de joindre le serveur. Vérifiez votre connexion.')),
    ).toBe('Impossible de joindre le serveur. Vérifiez votre connexion.');
  });
});

describe('formatResendLabel', () => {
  it('affiche le compte à rebours puis le libellé seul', () => {
    expect(formatResendLabel(45)).toBe('Renvoyer le code (45 s)');
    expect(formatResendLabel(0)).toBe('Renvoyer le code');
  });
});
