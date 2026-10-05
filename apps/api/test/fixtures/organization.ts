import { Role, UserStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../../src/modules/auth/types/authenticated-user.type.js';

/**
 * Organisation of prisma/seed.ts with stable UUIDs, plus the actors needed to test
 * direction scopes (Direction Commerciale, Entreprise C without direction).
 */
export const companies = {
  appatam: { id: '00000000-0000-4000-8000-00000000000a', name: 'Appatam' },
  entrepriseB: { id: '00000000-0000-4000-8000-00000000000b', name: 'Entreprise B' },
  entrepriseC: { id: '00000000-0000-4000-8000-00000000000c', name: 'Entreprise C' },
} as const;

export const directions = {
  tech: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Direction Technique' },
  com: { id: '00000000-0000-4000-8000-0000000000d2', name: 'Direction Commerciale' },
  dg: { id: '00000000-0000-4000-8000-0000000000d3', name: 'Direction Générale' },
} as const;

function makeActor(
  id: string,
  email: string,
  role: Role,
  company: { id: string; name: string },
  direction: { id: string; name: string } | null,
): AuthenticatedUser {
  const [firstName, lastName] = email.split('@')[0].split('.');
  return {
    id,
    email,
    firstName: firstName ?? 'Test',
    lastName: lastName ?? 'User',
    role,
    status: UserStatus.ACTIVE,
    companyId: company.id,
    directionId: direction?.id ?? null,
    company: { id: company.id, name: company.name },
    direction: direction ? { id: direction.id, name: direction.name } : null,
  };
}

export const actors = {
  groupAdmin: makeActor('00000000-0000-4000-8000-000000000101', 'group.admin@appatam.dev', Role.GROUP_ADMIN, companies.appatam, null),
  companyAdminA: makeActor('00000000-0000-4000-8000-000000000102', 'company.admin@appatam.dev', Role.COMPANY_ADMIN, companies.appatam, null),
  managerTech: makeActor('00000000-0000-4000-8000-000000000103', 'manager.tech@appatam.dev', Role.MANAGER, companies.appatam, directions.tech),
  managerC: makeActor('00000000-0000-4000-8000-000000000104', 'manager.company@entreprisec.dev', Role.MANAGER, companies.entrepriseC, null),
  employeeA: makeActor('00000000-0000-4000-8000-000000000105', 'employee@appatam.dev', Role.EMPLOYEE, companies.appatam, directions.tech),
  employeeB: makeActor('00000000-0000-4000-8000-000000000106', 'employee.b@entrepriseb.dev', Role.EMPLOYEE, companies.entrepriseB, directions.dg),
  managerCom: makeActor('00000000-0000-4000-8000-000000000107', 'manager.com@appatam.dev', Role.MANAGER, companies.appatam, directions.com),
  employeeCom: makeActor('00000000-0000-4000-8000-000000000108', 'employee.com@appatam.dev', Role.EMPLOYEE, companies.appatam, directions.com),
  employeeC: makeActor('00000000-0000-4000-8000-000000000109', 'employee.c@entreprisec.dev', Role.EMPLOYEE, companies.entrepriseC, null),
} satisfies Record<string, AuthenticatedUser>;

export const vehicles = {
  /** AA-123-BB — Appatam, 5 places, AVAILABLE. */
  corollaA: { id: '00000000-0000-4000-8000-000000000201', companyId: companies.appatam.id, registrationNumber: 'AA-123-BB', seats: 5 },
} as const;
