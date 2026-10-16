import { describe, expect, it } from 'vitest';
import {
  collectFixedEquipmentOptions,
  filterRoomsByFixedEquipment,
  toggleFixedEquipmentFilter,
} from './fixed-equipment';

const rooms = [
  { id: 'a', fixedEquipment: ['Écran', 'Visioconférence'] },
  { id: 'b', fixedEquipment: ['écran ', 'Tableau blanc'] },
  { id: 'c', fixedEquipment: [] },
];

describe('collectFixedEquipmentOptions', () => {
  it('returns distinct labels, case-insensitively, sorted in French order', () => {
    expect(collectFixedEquipmentOptions(rooms)).toEqual(['Écran', 'Tableau blanc', 'Visioconférence']);
  });

  it('tolerates rooms without fixed equipment', () => {
    expect(collectFixedEquipmentOptions([{ fixedEquipment: [] }])).toEqual([]);
  });
});

describe('filterRoomsByFixedEquipment', () => {
  it('keeps every room when no label is selected', () => {
    expect(filterRoomsByFixedEquipment(rooms, [])).toHaveLength(3);
  });

  it('keeps rooms equipped with every selected label', () => {
    expect(filterRoomsByFixedEquipment(rooms, ['ÉCRAN']).map((room) => room.id)).toEqual(['a', 'b']);
    expect(filterRoomsByFixedEquipment(rooms, ['Écran', 'Tableau blanc']).map((room) => room.id)).toEqual(['b']);
    expect(filterRoomsByFixedEquipment(rooms, ['Projecteur'])).toEqual([]);
  });
});

describe('toggleFixedEquipmentFilter', () => {
  it('adds then removes a label, ignoring case', () => {
    const selected = toggleFixedEquipmentFilter([], 'Écran');
    expect(selected).toEqual(['Écran']);
    expect(toggleFixedEquipmentFilter(selected, 'écran')).toEqual([]);
  });
});
