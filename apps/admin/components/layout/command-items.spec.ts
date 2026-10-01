import { describe, expect, it } from 'vitest';
import { filterCommandItems, getCommandItems } from '@/components/layout/command-items';

describe('command menu items', () => {
  it('only offers creation shortcuts allowed for the role', () => {
    const employee = getCommandItems('EMPLOYEE').map((item) => item.href);
    expect(employee).not.toContain('/vehicles/new');
    expect(employee).not.toContain('/users/new');

    const companyAdmin = getCommandItems('COMPANY_ADMIN').map((item) => item.href);
    expect(companyAdmin).toContain('/vehicles/new');
    expect(companyAdmin).toContain('/users/new');
    expect(companyAdmin).not.toContain('/companies/new');

    expect(getCommandItems('GROUP_ADMIN').map((item) => item.href)).toContain('/companies/new');
  });

  it('filters without accents and on every term', () => {
    const items = getCommandItems('GROUP_ADMIN');
    expect(filterCommandItems(items, 'vehicule').map((item) => item.href)).toEqual([
      '/vehicles',
      '/vehicles/new',
    ]);
    expect(filterCommandItems(items, 'nouvel util').map((item) => item.href)).toEqual(['/users/new']);
    expect(filterCommandItems(items, '   ')).toHaveLength(items.length);
  });
});
