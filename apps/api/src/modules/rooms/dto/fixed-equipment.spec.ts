import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateRoomDto } from './create-room.dto.js';
import { normalizeFixedEquipment } from './fixed-equipment.js';
import { ListRoomsQueryDto } from './list-rooms-query.dto.js';

describe('normalizeFixedEquipment', () => {
  it('trims, drops empty labels and removes case-insensitive duplicates', () => {
    expect(
      normalizeFixedEquipment(['  Écran mural ', 'écran  MURAL', '', '   ', 'Visio intégrée']),
    ).toEqual(['Écran mural', 'Visio intégrée']);
  });
});

describe('CreateRoomDto.fixedEquipment', () => {
  const base = { companyId: 'company-a', name: 'Salle A', capacity: 10 };

  it('normalizes the labels before validation', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      ...base,
      fixedEquipment: [' Écran mural', 'écran mural', 'Tableau blanc'],
    });

    expect(await validate(dto)).toEqual([]);
    expect(dto.fixedEquipment).toEqual(['Écran mural', 'Tableau blanc']);
  });

  it('rejects more than 20 labels, labels over 60 characters and commas', async () => {
    const tooMany = plainToInstance(CreateRoomDto, {
      ...base,
      fixedEquipment: Array.from({ length: 21 }, (_, index) => `Équipement ${index}`),
    });
    const tooLong = plainToInstance(CreateRoomDto, { ...base, fixedEquipment: ['x'.repeat(61)] });
    const withComma = plainToInstance(CreateRoomDto, { ...base, fixedEquipment: ['Écran, mural'] });

    expect(await validate(tooMany)).not.toEqual([]);
    expect(await validate(tooLong)).not.toEqual([]);
    expect(await validate(withComma)).not.toEqual([]);
  });
});

describe('ListRoomsQueryDto.fixedEquipment', () => {
  it('accepts a comma-separated list', async () => {
    const query = plainToInstance(ListRoomsQueryDto, {
      fixedEquipment: 'Écran mural, Visio intégrée',
    });

    expect(await validate(query)).toEqual([]);
    expect(query.fixedEquipment).toEqual(['Écran mural', 'Visio intégrée']);
  });

  it('accepts repeated parameters', async () => {
    const query = plainToInstance(ListRoomsQueryDto, {
      fixedEquipment: ['Écran mural', 'Visio intégrée'],
    });

    expect(await validate(query)).toEqual([]);
    expect(query.fixedEquipment).toEqual(['Écran mural', 'Visio intégrée']);
  });
});
