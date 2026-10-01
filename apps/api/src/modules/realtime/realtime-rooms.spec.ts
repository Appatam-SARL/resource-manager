import { describe, expect, it } from 'vitest';
import { AccessScopeService } from '../../common/authorization/access-scope.service.js';
import { actors, companies, directions } from '../../../test/fixtures/organization.js';
import {
  getReservationAudienceRooms,
  getResourceAudienceRooms,
  getUserRooms,
} from './realtime-rooms.js';

describe('realtime rooms', () => {
  it('GROUP_ADMIN joins the Group room, its personal room and its company', () => {
    expect(getUserRooms(actors.groupAdmin)).toEqual([
      `user:${actors.groupAdmin.id}`,
      `company:${companies.appatam.id}`,
      'group',
    ]);
  });

  it('COMPANY_ADMIN receives every reservation of its company only', () => {
    expect(getUserRooms(actors.companyAdminA)).toContain(
      `company:${companies.appatam.id}:reservations`,
    );
    expect(getUserRooms(actors.companyAdminA)).not.toContain('group');
  });

  it('MANAGER with a direction is scoped to its direction, not the whole company', () => {
    const rooms = getUserRooms(actors.managerTech);
    expect(rooms).toContain(`direction:${directions.tech.id}:reservations`);
    expect(rooms).not.toContain(`company:${companies.appatam.id}:reservations`);
  });

  it('MANAGER without direction is scoped to its company (company without direction)', () => {
    expect(getUserRooms(actors.managerC)).toContain(
      `company:${companies.entrepriseC.id}:reservations`,
    );
  });

  it('EMPLOYEE, with or without direction, only gets personal and company rooms', () => {
    expect(getUserRooms(actors.employeeA)).toEqual([
      `user:${actors.employeeA.id}`,
      `company:${companies.appatam.id}`,
    ]);
    expect(getUserRooms(actors.employeeC)).toEqual([
      `user:${actors.employeeC.id}`,
      `company:${companies.entrepriseC.id}`,
    ]);
  });

  it('sends resource events to the Group admins and the members of the owning company only', () => {
    expect(getResourceAudienceRooms(companies.entrepriseB.id)).toEqual([
      'group',
      `company:${companies.entrepriseB.id}`,
    ]);
  });

  describe('reservation audience mirrors AccessScopeService.canViewReservation', () => {
    const accessScope = new AccessScopeService();
    const reservations = [
      { companyId: companies.appatam.id, directionId: directions.tech.id, userId: actors.employeeA.id },
      { companyId: companies.appatam.id, directionId: directions.com.id, userId: actors.employeeCom.id },
      { companyId: companies.appatam.id, directionId: null, userId: actors.companyAdminA.id },
      { companyId: companies.appatam.id, directionId: directions.tech.id, userId: actors.managerTech.id },
      { companyId: companies.entrepriseB.id, directionId: directions.dg.id, userId: actors.employeeB.id },
      { companyId: companies.entrepriseC.id, directionId: null, userId: actors.employeeC.id },
    ];

    for (const [actorName, actor] of Object.entries(actors)) {
      it(`${actorName} receives exactly the reservations it may read`, () => {
        for (const reservation of reservations) {
          const audience = getReservationAudienceRooms(reservation);
          const receives = getUserRooms(actor).some((room) => audience.includes(room));
          expect(receives).toBe(accessScope.canViewReservation(actor, reservation));
        }
      });
    }
  });
});
