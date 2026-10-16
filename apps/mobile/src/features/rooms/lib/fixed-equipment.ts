import type { MeetingRoom } from '@resource-manager/types';

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');
}

/** Distinct fixed equipment labels of the rooms, sorted alphabetically (first spelling wins). */
export function collectFixedEquipmentOptions(rooms: Pick<MeetingRoom, 'fixedEquipment'>[]): string[] {
  const byKey = new Map<string, string>();
  for (const room of rooms) {
    for (const label of room.fixedEquipment ?? []) {
      const key = normalizeLabel(label);
      if (key && !byKey.has(key)) byKey.set(key, label.trim());
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Rooms equipped with every selected label (case-insensitive); all rooms when nothing is selected. */
export function filterRoomsByFixedEquipment<T extends Pick<MeetingRoom, 'fixedEquipment'>>(
  rooms: T[],
  selected: string[],
): T[] {
  if (selected.length === 0) return rooms;
  const wanted = selected.map(normalizeLabel);
  return rooms.filter((room) => {
    const available = new Set((room.fixedEquipment ?? []).map(normalizeLabel));
    return wanted.every((label) => available.has(label));
  });
}

export function toggleFixedEquipmentFilter(selected: string[], label: string): string[] {
  const key = normalizeLabel(label);
  return selected.some((item) => normalizeLabel(item) === key)
    ? selected.filter((item) => normalizeLabel(item) !== key)
    : [...selected, label];
}
