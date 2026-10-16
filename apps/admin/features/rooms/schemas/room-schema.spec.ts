import { describe, expect, it } from 'vitest';
import { addFixedEquipmentLabel, roomFormSchema } from './room-schema';

const valid = {
  companyId: 'c1',
  name: 'Salle Baobab',
  location: '',
  capacity: 10,
  description: '',
  fixedEquipment: ['Écran'],
};

describe('roomFormSchema — fixedEquipment', () => {
  it('accepts up to 20 labels', () => {
    const labels = Array.from({ length: 20 }, (_, index) => `Équipement ${index}`);
    expect(roomFormSchema.safeParse({ ...valid, fixedEquipment: labels }).success).toBe(true);
  });

  it('rejects more than 20 labels', () => {
    const labels = Array.from({ length: 21 }, (_, index) => `Équipement ${index}`);
    expect(roomFormSchema.safeParse({ ...valid, fixedEquipment: labels }).success).toBe(false);
  });

  it.each(['x'.repeat(61), 'Écran, tableau', '   '])('rejects the label "%s"', (label) => {
    expect(roomFormSchema.safeParse({ ...valid, fixedEquipment: [label] }).success).toBe(false);
  });
});

describe('addFixedEquipmentLabel', () => {
  it('trims and collapses spaces', () => {
    expect(addFixedEquipmentLabel([], '  Tableau   blanc ')).toEqual(['Tableau blanc']);
  });

  it('ignores empty labels and case-insensitive duplicates', () => {
    expect(addFixedEquipmentLabel(['Écran'], '  ')).toEqual(['Écran']);
    expect(addFixedEquipmentLabel(['Écran'], 'écran')).toEqual(['Écran']);
  });
});
