import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/errors';
import { CONFLICT_MESSAGE, getReservationSubmitError } from './reservation-errors';

describe('getReservationSubmitError', () => {
  it('turns a 409 into a business conflict', () => {
    expect(getReservationSubmitError(new AppError('ConflictException', 409))).toEqual({
      kind: 'conflict',
      message: CONFLICT_MESSAGE,
    });
  });

  it('uses reservation-specific messages for auth, permission and missing resource', () => {
    expect(getReservationSubmitError(new AppError('x', 401)).message).toMatch(/session a expiré/);
    expect(getReservationSubmitError(new AppError('x', 403)).message).toMatch(/pas autorisé/);
    expect(getReservationSubmitError(new AppError('x', 404)).message).toMatch(/n’existe plus/);
  });

  it('keeps the sanitized API message for validation and server errors', () => {
    const error = new AppError('Le nombre de passagers ne peut pas dépasser 4 place(s).', 400);
    expect(getReservationSubmitError(error)).toEqual({ kind: 'general', message: error.message });
  });

  it('never exposes unknown errors', () => {
    expect(getReservationSubmitError(new Error('prisma: stack trace')).message).toBe(
      'Impossible d’envoyer la demande. Veuillez réessayer.',
    );
  });
});
