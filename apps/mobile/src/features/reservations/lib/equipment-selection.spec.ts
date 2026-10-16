import { describe, expect, it } from 'vitest';
import type { EquipmentAvailability } from '@resource-manager/types';
import { AppError, EQUIPMENT_UNAVAILABLE_CODE } from '@/lib/errors';
import {
  canEditReservationEquipments,
  clampSelectionToAvailability,
  describeSelection,
  formatEquipmentAdjustments,
  formatReservationEquipments,
  getEquipmentUpdateErrorMessage,
  isSameSelection,
  maxSelectableQuantity,
  selectionFromReservation,
  setSelectionQuantity,
  toEquipmentPayload,
} from './equipment-selection';

function availability(id: string, name: string, availableQuantity: number, quantity = 5): EquipmentAvailability {
  return { id, name, description: null, scope: 'BOTH', quantity, availableQuantity };
}

describe('maxSelectableQuantity', () => {
  it('is bounded by the stock left and the per-line API limit', () => {
    expect(maxSelectableQuantity({ availableQuantity: 3 })).toBe(3);
    expect(maxSelectableQuantity({ availableQuantity: 0 })).toBe(0);
    expect(maxSelectableQuantity({ availableQuantity: 120 })).toBe(50);
    expect(maxSelectableQuantity({ availableQuantity: -1 })).toBe(0);
  });
});

describe('setSelectionQuantity / toEquipmentPayload', () => {
  it('removes equipment set to 0 and builds the API payload', () => {
    let selection = setSelectionQuantity({}, 'proj', 1);
    selection = setSelectionQuantity(selection, 'mic', 2);
    selection = setSelectionQuantity(selection, 'proj', 0);

    expect(selection).toEqual({ mic: 2 });
    expect(toEquipmentPayload(selection)).toEqual([{ equipmentId: 'mic', quantity: 2 }]);
  });
});

describe('clampSelectionToAvailability', () => {
  it('lowers quantities exceeding the stock left on the new slot', () => {
    const result = clampSelectionToAvailability({ proj: 2, mic: 1 }, [
      availability('proj', 'Vidéoprojecteur', 1),
      availability('mic', 'Micro', 3),
    ]);

    expect(result.selection).toEqual({ proj: 1, mic: 1 });
    expect(result.adjustments).toEqual([{ equipmentId: 'proj', name: 'Vidéoprojecteur', from: 2, to: 1 }]);
  });

  it('drops sold-out or no longer listed equipment', () => {
    const result = clampSelectionToAvailability(
      { proj: 1, kit: 1 },
      [availability('proj', 'Vidéoprojecteur', 0)],
      { kit: 'Kit visio' },
    );

    expect(result.selection).toEqual({});
    expect(result.adjustments.map((item) => [item.name, item.to])).toEqual([
      ['Vidéoprojecteur', 0],
      ['Kit visio', 0],
    ]);
  });

  it('reports nothing when the selection still fits', () => {
    const result = clampSelectionToAvailability({ proj: 1 }, [availability('proj', 'Vidéoprojecteur', 1)]);

    expect(result.adjustments).toEqual([]);
    expect(result.selection).toEqual({ proj: 1 });
  });
});

describe('formatEquipmentAdjustments', () => {
  it('lists reduced and removed equipment', () => {
    const message = formatEquipmentAdjustments([
      { equipmentId: 'proj', name: 'Vidéoprojecteur', from: 2, to: 1 },
      { equipmentId: 'mic', name: 'Micro', from: 1, to: 0 },
    ]);

    expect(message).toContain('Vidéoprojecteur : 2 → 1');
    expect(message).toContain('Micro : retiré (indisponible)');
  });
});

describe('selection helpers', () => {
  const equipments = [
    { quantity: 1, equipment: { id: 'proj', name: 'Vidéoprojecteur' } },
    { quantity: 2, equipment: { id: 'mic', name: 'Micro' } },
  ];

  it('rebuilds the selection of an existing reservation', () => {
    expect(selectionFromReservation(equipments)).toEqual({ proj: 1, mic: 2 });
    expect(selectionFromReservation(undefined)).toEqual({});
  });

  it('compares selections regardless of zero entries', () => {
    expect(isSameSelection({ proj: 1, mic: 0 }, { proj: 1 })).toBe(true);
    expect(isSameSelection({ proj: 1 }, { proj: 2 })).toBe(false);
    expect(isSameSelection({}, { proj: 1 })).toBe(false);
  });

  it('describes the selection in catalogue order', () => {
    expect(
      describeSelection({ mic: 2, proj: 1 }, [
        { id: 'proj', name: 'Vidéoprojecteur' },
        { id: 'mic', name: 'Micro' },
        { id: 'kit', name: 'Kit visio' },
      ]),
    ).toEqual(['Vidéoprojecteur × 1', 'Micro × 2']);
  });

  it('formats the equipment returned by the API', () => {
    expect(formatReservationEquipments(equipments)).toEqual(['Vidéoprojecteur × 1', 'Micro × 2']);
    expect(formatReservationEquipments(undefined)).toEqual([]);
  });
});

describe('canEditReservationEquipments', () => {
  const now = new Date('2026-10-13T08:00:00.000Z');
  const upcoming = { status: 'APPROVED' as const, userId: 'u1', startAt: '2026-10-13T10:00:00.000Z' };

  it('lets the owner edit an open reservation that has not started', () => {
    expect(canEditReservationEquipments(upcoming, now, { id: 'u1', role: 'EMPLOYEE' })).toBe(true);
    expect(canEditReservationEquipments({ ...upcoming, status: 'PENDING' }, now, { id: 'u1', role: 'EMPLOYEE' })).toBe(true);
  });

  it('lets managers and admins of the scope edit, not other employees', () => {
    expect(canEditReservationEquipments(upcoming, now, { id: 'm1', role: 'MANAGER' })).toBe(true);
    expect(canEditReservationEquipments(upcoming, now, { id: 'u2', role: 'EMPLOYEE' })).toBe(false);
    expect(canEditReservationEquipments(upcoming, now, null)).toBe(false);
  });

  it('refuses once the reservation has started or is closed', () => {
    const actor = { id: 'u1', role: 'EMPLOYEE' as const };
    expect(canEditReservationEquipments({ ...upcoming, startAt: '2026-10-13T08:00:00.000Z' }, now, actor)).toBe(false);
    expect(canEditReservationEquipments({ ...upcoming, status: 'CANCELLED' }, now, actor)).toBe(false);
    expect(canEditReservationEquipments({ ...upcoming, status: 'COMPLETED' }, now, actor)).toBe(false);
  });
});

describe('getEquipmentUpdateErrorMessage', () => {
  it('shows the server message for an equipment shortage', () => {
    const error = new AppError('Équipement indisponible sur ce créneau : Vidéoprojecteur (0 disponible(s)).', 409, EQUIPMENT_UNAVAILABLE_CODE);
    expect(getEquipmentUpdateErrorMessage(error)).toBe(error.message);
  });

  it('maps other failures to readable messages', () => {
    expect(getEquipmentUpdateErrorMessage(new AppError('x', 409))).toMatch(/a changé/);
    expect(getEquipmentUpdateErrorMessage(new AppError('x', 403))).toMatch(/pas autorisé/);
    expect(getEquipmentUpdateErrorMessage(new AppError('La réservation a déjà commencé.', 400))).toBe(
      'La réservation a déjà commencé.',
    );
    expect(getEquipmentUpdateErrorMessage(new Error('boom'))).toMatch(/Impossible/);
  });
});
