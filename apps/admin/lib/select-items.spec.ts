import { describe, expect, it } from 'vitest';
import { selectItems } from './select-items';

describe('selectItems', () => {
  it('maps ids to names and keeps the extra entries', () => {
    expect(
      selectItems(
        [
          { id: 'c1', name: 'Appatam' },
          { id: 'c2', name: 'Société B' },
        ],
        { ALL: 'Toutes les entreprises' },
      ),
    ).toEqual({ ALL: 'Toutes les entreprises', c1: 'Appatam', c2: 'Société B' });
  });

  it('returns only the extra entries when the list is empty', () => {
    expect(selectItems([], { none: 'Aucune direction' })).toEqual({ none: 'Aucune direction' });
  });
});
