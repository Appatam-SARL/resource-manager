import { describe, expect, it } from 'vitest';
import { assignableRoles, canManageAccount, directionScopeHint } from './user-roles';

describe('canManageAccount', () => {
  it('lets the Group admin manage every account', () => {
    expect(canManageAccount('GROUP_ADMIN', 'GROUP_ADMIN')).toBe(true);
    expect(canManageAccount('GROUP_ADMIN', 'EMPLOYEE')).toBe(true);
  });

  it('prevents a Company admin from managing a Group admin account', () => {
    expect(canManageAccount('COMPANY_ADMIN', 'GROUP_ADMIN')).toBe(false);
    expect(canManageAccount('COMPANY_ADMIN', 'COMPANY_ADMIN')).toBe(true);
    expect(canManageAccount('COMPANY_ADMIN', 'EMPLOYEE')).toBe(true);
  });

  it('gives no management right to other profiles', () => {
    expect(canManageAccount('MANAGER', 'EMPLOYEE')).toBe(false);
  });
});

describe('assignableRoles', () => {
  it('lets the Group admin assign every role', () => {
    expect(assignableRoles('GROUP_ADMIN')).toEqual(['GROUP_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE']);
  });

  it('prevents a Company admin from assigning the Group admin role', () => {
    expect(assignableRoles('COMPANY_ADMIN')).not.toContain('GROUP_ADMIN');
    expect(assignableRoles('COMPANY_ADMIN')).toContain('MANAGER');
  });

  it('gives no role to other profiles', () => {
    expect(assignableRoles('MANAGER')).toEqual([]);
    expect(assignableRoles('EMPLOYEE')).toEqual([]);
  });
});

describe('directionScopeHint', () => {
  it('explains the company-wide scope of a manager without direction', () => {
    expect(directionScopeHint('MANAGER', false)).toContain('toute l’entreprise');
    expect(directionScopeHint('MANAGER', true)).toContain('cette direction');
  });

  it('returns nothing for other roles', () => {
    expect(directionScopeHint('EMPLOYEE', false)).toBeUndefined();
  });
});
