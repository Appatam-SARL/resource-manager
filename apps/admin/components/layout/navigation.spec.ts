import { describe, expect, it } from 'vitest';
import { getBreadcrumbs, getNavSections, isActivePath } from '@/components/layout/navigation';

describe('navigation', () => {
  it('groups the full menu for a group admin', () => {
    const sections = getNavSections('GROUP_ADMIN');
    expect(sections.map((section) => section.id)).toEqual([
      'overview',
      'operations',
      'organization',
      'system',
    ]);
    expect(sections[2].items.map((item) => item.href)).toEqual([
      '/group',
      '/companies',
      '/directions',
      '/users',
    ]);
  });

  it('hides empty sections and restricted items for an employee', () => {
    const sections = getNavSections('EMPLOYEE');
    expect(sections.map((section) => section.id)).toEqual(['overview', 'operations', 'system']);
    const hrefs = sections.flatMap((section) => section.items.map((item) => item.href));
    expect(hrefs).toEqual(['/dashboard', '/reservations', '/calendar', '/notifications']);
  });

  it('never lists a route outside of the RBAC menu', () => {
    const hrefs = getNavSections('MANAGER').flatMap((section) => section.items.map((item) => item.href));
    expect(hrefs).toContain('/vehicles');
    expect(hrefs).not.toContain('/users');
    expect(hrefs).not.toContain('/audit');
  });

  it('matches nested routes as active', () => {
    expect(isActivePath('/vehicles/123', '/vehicles')).toBe(true);
    expect(isActivePath('/vehiclesx', '/vehicles')).toBe(false);
    expect(isActivePath('/', '/dashboard')).toBe(true);
  });

  it('builds breadcrumbs from the pathname', () => {
    expect(getBreadcrumbs('/dashboard')).toEqual([{ label: 'Tableau de bord' }]);
    expect(getBreadcrumbs('/vehicles/new')).toEqual([
      { label: 'Véhicules', href: '/vehicles' },
      { label: 'Création' },
    ]);
    expect(getBreadcrumbs('/reservations/abc')).toEqual([
      { label: 'Réservations', href: '/reservations' },
      { label: 'Détail' },
    ]);
  });
});
