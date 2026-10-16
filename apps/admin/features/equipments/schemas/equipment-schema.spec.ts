import { describe, expect, it } from 'vitest';
import { equipmentFormSchema } from './equipment-schema';

const valid = { name: 'Vidéoprojecteur', scope: 'ROOM', quantity: 2, description: '' };

describe('equipmentFormSchema', () => {
  it('accepts a valid equipment and trims the name', () => {
    const result = equipmentFormSchema.safeParse({ ...valid, name: '  Vidéoprojecteur  ' });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('Vidéoprojecteur');
  });

  it('requires a name of at least 2 characters', () => {
    const result = equipmentFormSchema.safeParse({ ...valid, name: ' a ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['name']);
  });

  it.each([0, -1, 1.5, 1001])('rejects the quantity %s', (quantity) => {
    expect(equipmentFormSchema.safeParse({ ...valid, quantity }).success).toBe(false);
  });

  it('rejects an unknown scope', () => {
    const result = equipmentFormSchema.safeParse({ ...valid, scope: 'BUILDING' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Le périmètre est requis');
  });

  it('limits the description to 500 characters', () => {
    expect(equipmentFormSchema.safeParse({ ...valid, description: 'x'.repeat(501) }).success).toBe(false);
  });
});
