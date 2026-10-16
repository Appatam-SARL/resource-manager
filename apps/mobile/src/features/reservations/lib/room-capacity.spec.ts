import { describe, expect, it } from 'vitest';
import { shouldShowCapacityAlert, type CapacityAlertInput } from './room-capacity';

const base: CapacityAlertInput = {
  previousCount: 8,
  nextCount: 9,
  capacity: 8,
  roomId: 'room-1',
  alertedRoomId: null,
};

describe('shouldShowCapacityAlert', () => {
  it('alerte au moment où la capacité est franchie (8 → 9, capacité 8)', () => {
    expect(shouldShowCapacityAlert(base)).toBe(true);
  });

  it('alerte aussi lors d’un saut au clavier au-delà de la capacité (3 → 15)', () => {
    expect(shouldShowCapacityAlert({ ...base, previousCount: 3, nextCount: 15 })).toBe(true);
  });

  it('n’alerte pas quand la capacité est déjà dépassée (9 → 10)', () => {
    expect(shouldShowCapacityAlert({ ...base, previousCount: 9, nextCount: 10 })).toBe(false);
  });

  it('n’alerte pas en revenant sous la capacité (9 → 8)', () => {
    expect(shouldShowCapacityAlert({ ...base, previousCount: 9, nextCount: 8 })).toBe(false);
  });

  it('n’alerte pas deux fois pour la même salle', () => {
    expect(shouldShowCapacityAlert({ ...base, alertedRoomId: 'room-1' })).toBe(false);
  });

  it('alerte de nouveau pour une autre salle', () => {
    expect(shouldShowCapacityAlert({ ...base, roomId: 'room-2', alertedRoomId: 'room-1' })).toBe(true);
  });

  it('n’alerte pas sans salle sélectionnée', () => {
    expect(shouldShowCapacityAlert({ ...base, roomId: '' })).toBe(false);
    expect(shouldShowCapacityAlert({ ...base, capacity: undefined })).toBe(false);
  });
});
