import type {
  EquipmentAvailability,
  Reservation,
  ReservationEquipment,
  ReservationEquipmentInput,
  Role,
} from '@resource-manager/types';
import { AppError, EQUIPMENT_UNAVAILABLE_CODE } from '@/lib/errors';
import { parseApiDate } from '@/lib/format';

/** equipmentId → requested quantity (0 or absent = not requested). */
export type EquipmentSelection = Record<string, number>;

/** Mirrors the API bounds on a reservation's equipment lines. */
export const MAX_EQUIPMENT_QUANTITY_PER_LINE = 50;
export const MAX_EQUIPMENT_LINES = 20;

export type EquipmentAdjustment = { equipmentId: string; name: string; from: number; to: number };

/** Highest quantity the user may pick for an equipment on the current slot. */
export function maxSelectableQuantity(item: Pick<EquipmentAvailability, 'availableQuantity'>): number {
  return Math.max(0, Math.min(item.availableQuantity, MAX_EQUIPMENT_QUANTITY_PER_LINE));
}

export function setSelectionQuantity(
  selection: EquipmentSelection,
  equipmentId: string,
  quantity: number,
): EquipmentSelection {
  const next = { ...selection };
  if (quantity > 0) next[equipmentId] = quantity;
  else delete next[equipmentId];
  return next;
}

/**
 * After a slot change, lowers the quantities that exceed what is still available.
 * Equipment missing from the availability list (no longer bookable) is dropped.
 */
export function clampSelectionToAvailability(
  selection: EquipmentSelection,
  availability: EquipmentAvailability[],
  knownNames: Record<string, string> = {},
): { selection: EquipmentSelection; adjustments: EquipmentAdjustment[] } {
  const byId = new Map(availability.map((item) => [item.id, item]));
  const next: EquipmentSelection = {};
  const adjustments: EquipmentAdjustment[] = [];
  for (const [equipmentId, quantity] of Object.entries(selection)) {
    if (quantity <= 0) continue;
    const item = byId.get(equipmentId);
    const max = item ? maxSelectableQuantity(item) : 0;
    const kept = Math.min(quantity, max);
    if (kept > 0) next[equipmentId] = kept;
    if (kept < quantity) {
      adjustments.push({
        equipmentId,
        name: item?.name ?? knownNames[equipmentId] ?? 'Équipement',
        from: quantity,
        to: kept,
      });
    }
  }
  return { selection: next, adjustments };
}

export function formatEquipmentAdjustments(adjustments: EquipmentAdjustment[]): string {
  const lines = adjustments.map((item) =>
    item.to === 0 ? `• ${item.name} : retiré (indisponible)` : `• ${item.name} : ${item.from} → ${item.to}`,
  );
  return `Sur ce créneau, certains équipements ne sont plus disponibles en quantité suffisante :\n${lines.join('\n')}`;
}

export function toEquipmentPayload(selection: EquipmentSelection): ReservationEquipmentInput[] {
  return Object.entries(selection)
    .filter(([, quantity]) => quantity > 0)
    .map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
}

export function selectionFromReservation(
  equipments: ReservationEquipment[] | undefined,
): EquipmentSelection {
  const selection: EquipmentSelection = {};
  for (const item of equipments ?? []) {
    selection[item.equipment.id] = item.quantity;
  }
  return selection;
}

export function isSameSelection(a: EquipmentSelection, b: EquipmentSelection): boolean {
  const left = toEquipmentPayload(a);
  const right = toEquipmentPayload(b);
  return left.length === right.length && left.every((item) => b[item.equipmentId] === item.quantity);
}

/** "Vidéoprojecteur × 1, Micro × 2" in catalogue order; unknown ids are skipped. */
export function describeSelection(
  selection: EquipmentSelection,
  names: { id: string; name: string }[],
): string[] {
  return names
    .filter((item) => (selection[item.id] ?? 0) > 0)
    .map((item) => `${item.name} × ${selection[item.id]}`);
}

export function formatReservationEquipments(equipments: ReservationEquipment[] | undefined): string[] {
  return (equipments ?? []).map((item) => `${item.equipment.name} × ${item.quantity}`);
}

type Actor = { id: string; role: Role } | null | undefined;

/**
 * UI hint only (the API re-checks): open reservation, not started yet, owner or a
 * manager/admin of the scope — the same people allowed to cancel.
 */
export function canEditReservationEquipments(
  reservation: Pick<Reservation, 'status' | 'userId' | 'startAt'>,
  now: Date,
  actor: Actor,
): boolean {
  if (!actor) return false;
  if (reservation.status !== 'PENDING' && reservation.status !== 'APPROVED') return false;
  if (parseApiDate(reservation.startAt) <= now) return false;
  return actor.role !== 'EMPLOYEE' || actor.id === reservation.userId;
}

export function getEquipmentUpdateErrorMessage(error: unknown): string {
  if (!(error instanceof AppError)) {
    return 'Impossible de modifier les équipements. Veuillez réessayer.';
  }
  if (error.status === 409) {
    return error.code === EQUIPMENT_UNAVAILABLE_CODE
      ? error.message
      : 'La réservation a changé entre-temps. Actualisez puis réessayez.';
  }
  if (error.status === 403) return 'Vous n’êtes pas autorisé à modifier cette réservation.';
  if (error.status === 404) return 'Cette réservation ou un équipement est introuvable.';
  return error.message;
}
