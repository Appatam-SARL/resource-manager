import { describe, expect, it } from 'vitest';
import { EQUIPMENT_UNAVAILABLE_CODE, mapApiError } from './errors';

function axiosError(status: number, data: Record<string, unknown>) {
  return { isAxiosError: true, response: { status, data } };
}

describe('mapApiError — 409', () => {
  it('keeps the server message and code for an equipment shortage', () => {
    const error = mapApiError(
      axiosError(409, {
        code: EQUIPMENT_UNAVAILABLE_CODE,
        message: 'Équipement indisponible sur ce créneau : Vidéoprojecteur (0 disponible(s)).',
      }),
    );

    expect(error.status).toBe(409);
    expect(error.code).toBe(EQUIPMENT_UNAVAILABLE_CODE);
    expect(error.message).toBe('Équipement indisponible sur ce créneau : Vidéoprojecteur (0 disponible(s)).');
  });

  it('keeps the generic message for a resource conflict', () => {
    const error = mapApiError(axiosError(409, { message: 'Ce créneau est déjà réservé.' }));

    expect(error.code).toBeUndefined();
    expect(error.message).toMatch(/vient d’être réservée/);
  });
});
