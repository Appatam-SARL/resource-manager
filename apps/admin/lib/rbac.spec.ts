import { describe, expect, it } from 'vitest';
import { canAccessRoute, visibleMenuItems } from '@/lib/rbac';

describe('rbac', () => {
  it('autorise le dashboard pour tous les rôles', () => {
    expect(canAccessRoute('EMPLOYEE', '/dashboard')).toBe(true);
    expect(canAccessRoute('GROUP_ADMIN', '/dashboard')).toBe(true);
  });

  it('restreint le groupe aux GROUP_ADMIN', () => {
    expect(canAccessRoute('GROUP_ADMIN', '/group')).toBe(true);
    expect(canAccessRoute('COMPANY_ADMIN', '/group')).toBe(false);
    expect(canAccessRoute('EMPLOYEE', '/group')).toBe(false);
  });

  it('réserve le catalogue des équipements aux GROUP_ADMIN', () => {
    expect(canAccessRoute('GROUP_ADMIN', '/equipments')).toBe(true);
    expect(canAccessRoute('GROUP_ADMIN', '/equipments/new')).toBe(true);
    expect(canAccessRoute('COMPANY_ADMIN', '/equipments')).toBe(false);
    expect(canAccessRoute('MANAGER', '/equipments/abc')).toBe(false);
    expect(visibleMenuItems('COMPANY_ADMIN').map((i) => i.href)).not.toContain('/equipments');
  });

  it('autorise /403 pour tous', () => {
    expect(canAccessRoute('EMPLOYEE', '/403')).toBe(true);
  });

  it('filtre le menu selon le rôle', () => {
    const employeeItems = visibleMenuItems('EMPLOYEE').map((i) => i.href);
    expect(employeeItems).toContain('/reservations');
    expect(employeeItems).not.toContain('/companies');
    expect(employeeItems).not.toContain('/audit');
  });
});
