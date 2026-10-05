import { ForbiddenException } from '@nestjs/common';
import { EntityStatus, Role, UserStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type.js';
import { ResourceListScope } from '../dto/resource-list-scope.js';
import { AccessScopeService } from './access-scope.service.js';

function makeUser(
  overrides: Partial<AuthenticatedUser> &
    Pick<AuthenticatedUser, 'role' | 'companyId'>,
): AuthenticatedUser {
  return {
    id: overrides.id ?? 'user-1',
    email: overrides.email ?? 'user@example.com',
    firstName: overrides.firstName ?? 'Jean',
    lastName: overrides.lastName ?? 'Dupont',
    role: overrides.role,
    status: overrides.status ?? UserStatus.ACTIVE,
    companyId: overrides.companyId,
    directionId: overrides.directionId ?? null,
    company: overrides.company ?? {
      id: overrides.companyId,
      name: 'Entreprise',
    },
    direction: overrides.direction ?? null,
  };
}

describe('AccessScopeService', () => {
  const service = new AccessScopeService();

  describe('canViewReservation', () => {
    const techReservation = { companyId: 'company-a', directionId: 'dir-tech', userId: 'employee-1' };

    it('GROUP_ADMIN sees every reservation of the Group', () => {
      const admin = makeUser({ role: Role.GROUP_ADMIN, companyId: 'company-z' });
      expect(service.canViewReservation(admin, techReservation)).toBe(true);
    });

    it('COMPANY_ADMIN sees only its company', () => {
      expect(service.canViewReservation(makeUser({ role: Role.COMPANY_ADMIN, companyId: 'company-a' }), techReservation)).toBe(true);
      expect(service.canViewReservation(makeUser({ role: Role.COMPANY_ADMIN, companyId: 'company-b' }), techReservation)).toBe(false);
    });

    it('MANAGER of a direction sees its direction and its own reservations only', () => {
      const managerTech = makeUser({ id: 'm-tech', role: Role.MANAGER, companyId: 'company-a', directionId: 'dir-tech' });
      const managerCom = makeUser({ id: 'm-com', role: Role.MANAGER, companyId: 'company-a', directionId: 'dir-com' });

      expect(service.canViewReservation(managerTech, techReservation)).toBe(true);
      expect(service.canViewReservation(managerCom, techReservation)).toBe(false);
      expect(service.canViewReservation(managerCom, { ...techReservation, userId: 'm-com' })).toBe(true);
    });

    it('MANAGER without direction covers its whole company (company without directions)', () => {
      const manager = makeUser({ role: Role.MANAGER, companyId: 'company-c' });
      expect(service.canViewReservation(manager, { companyId: 'company-c', directionId: null, userId: 'x' })).toBe(true);
      expect(service.canViewReservation(manager, techReservation)).toBe(false);
    });

    it('EMPLOYEE sees only its own reservations, with or without direction', () => {
      const employee = makeUser({ id: 'employee-1', role: Role.EMPLOYEE, companyId: 'company-a' });
      expect(service.canViewReservation(employee, techReservation)).toBe(true);
      expect(service.canViewReservation(employee, { ...techReservation, userId: 'employee-2' })).toBe(false);
    });
  });

  describe('companyWhere', () => {
    it('GROUP_ADMIN without filter sees all companies', () => {
      const admin = makeUser({
        role: Role.GROUP_ADMIN,
        companyId: 'company-a',
      });
      expect(service.companyWhere(admin)).toEqual({});
    });

    it('GROUP_ADMIN with companyId filter scopes to that company', () => {
      const admin = makeUser({
        role: Role.GROUP_ADMIN,
        companyId: 'company-a',
      });
      expect(service.companyWhere(admin, 'company-b')).toEqual({
        id: 'company-b',
      });
    });

    it('COMPANY_ADMIN is forced to own company', () => {
      const companyAdmin = makeUser({
        role: Role.COMPANY_ADMIN,
        companyId: 'company-a',
      });
      expect(service.companyWhere(companyAdmin)).toEqual({ id: 'company-a' });
      expect(service.companyWhere(companyAdmin, 'company-a')).toEqual({
        id: 'company-a',
      });
    });

    it('COMPANY_ADMIN cannot filter another company', () => {
      const companyAdmin = makeUser({
        role: Role.COMPANY_ADMIN,
        companyId: 'company-a',
      });
      expect(() => service.companyWhere(companyAdmin, 'company-b')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('resourceListWhere', () => {
    const employee = makeUser({ role: Role.EMPLOYEE, companyId: 'company-a' });

    it('managed scope (default) keeps resources of the user company', () => {
      expect(service.resourceListWhere(employee)).toEqual({ companyId: 'company-a' });
      expect(service.resourceListWhere(employee, ResourceListScope.MANAGED)).toEqual({ companyId: 'company-a' });
    });

    it('group scope exposes resources of every active company of the Group', () => {
      expect(service.resourceListWhere(employee, ResourceListScope.GROUP)).toEqual({
        company: { status: EntityStatus.ACTIVE },
      });
    });

    it('group scope may narrow to one managing company, even another one', () => {
      expect(service.resourceListWhere(employee, ResourceListScope.GROUP, 'company-b')).toEqual({
        companyId: 'company-b',
        company: { status: EntityStatus.ACTIVE },
      });
    });

    it('managed scope still refuses another company', () => {
      const companyAdmin = makeUser({ role: Role.COMPANY_ADMIN, companyId: 'company-a' });
      expect(() => service.resourceListWhere(companyAdmin, ResourceListScope.MANAGED, 'company-b')).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('directionScopeWhere / reservation scope', () => {
    it('EMPLOYEE reservation scope is limited to own userId', () => {
      const employee = makeUser({
        id: 'employee-1',
        role: Role.EMPLOYEE,
        companyId: 'company-a',
        directionId: 'direction-a',
        direction: { id: 'direction-a', name: 'Technique' },
      });
      expect(service.directionScopeWhere(employee)).toEqual({
        userId: 'employee-1',
      });
    });

    it('EMPLOYEE without direction still scopes to self', () => {
      const employee = makeUser({
        id: 'employee-2',
        role: Role.EMPLOYEE,
        companyId: 'company-b',
        directionId: null,
      });
      expect(service.directionScopeWhere(employee)).toEqual({
        userId: 'employee-2',
      });
    });

    it('MANAGER without direction scopes to company', () => {
      const manager = makeUser({
        role: Role.MANAGER,
        companyId: 'company-b',
        directionId: null,
      });
      expect(service.directionScopeWhere(manager)).toEqual({
        companyId: 'company-b',
      });
    });
  });

  describe('canApproveReservation', () => {
    const reservation = {
      companyId: 'company-a',
      directionId: 'direction-a' as string | null,
      userId: 'employee-1',
    };

    it('allows GROUP_ADMIN for any company', () => {
      const admin = makeUser({
        role: Role.GROUP_ADMIN,
        companyId: 'company-x',
      });
      expect(service.canApproveReservation(admin, reservation)).toBe(true);
    });

    it('allows COMPANY_ADMIN of the same company only', () => {
      const same = makeUser({
        role: Role.COMPANY_ADMIN,
        companyId: 'company-a',
      });
      const other = makeUser({
        role: Role.COMPANY_ADMIN,
        companyId: 'company-b',
      });
      expect(service.canApproveReservation(same, reservation)).toBe(true);
      expect(service.canApproveReservation(other, reservation)).toBe(false);
    });

    it('allows MANAGER without direction for company-wide scope', () => {
      const manager = makeUser({
        role: Role.MANAGER,
        companyId: 'company-a',
        directionId: null,
      });
      expect(service.canApproveReservation(manager, reservation)).toBe(true);
    });

    it('denies EMPLOYEE', () => {
      const employee = makeUser({
        id: 'employee-1',
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });
      expect(service.canApproveReservation(employee, reservation)).toBe(false);
    });
  });

  describe('canModifyOwnReservation', () => {
    it('allows owner and company/group admins', () => {
      const owner = makeUser({
        id: 'user-1',
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });
      const other = makeUser({
        id: 'user-2',
        role: Role.EMPLOYEE,
        companyId: 'company-a',
      });
      const companyAdmin = makeUser({
        role: Role.COMPANY_ADMIN,
        companyId: 'company-a',
      });

      expect(service.canModifyOwnReservation(owner, 'user-1')).toBe(true);
      expect(service.canModifyOwnReservation(other, 'user-1')).toBe(false);
      expect(service.canModifyOwnReservation(companyAdmin, 'user-1')).toBe(
        true,
      );
    });
  });
});
