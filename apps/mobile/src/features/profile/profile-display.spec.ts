import { describe, expect, it } from 'vitest';
import { describePushPermission, getActivityHeading } from './profile-display';

const company = { id: 'c1', name: 'APPATAM' };
const direction = { id: 'd1', name: 'Direction Technique' };

describe('getActivityHeading', () => {
  it('uses a personal heading for employees', () => {
    expect(getActivityHeading({ role: 'EMPLOYEE', company, direction: null })).toEqual({
      title: 'Mon activité',
    });
  });

  it('uses the direction as manager scope when it exists', () => {
    expect(getActivityHeading({ role: 'MANAGER', company, direction }).subtitle).toBe(
      'Direction Technique',
    );
  });

  it('falls back to the company for a manager without direction', () => {
    expect(getActivityHeading({ role: 'MANAGER', company, direction: null }).subtitle).toBe(
      'APPATAM',
    );
  });

  it('scopes company admins to their company and group admins to the group', () => {
    expect(getActivityHeading({ role: 'COMPANY_ADMIN', company, direction: null }).title).toBe(
      'Activité de mon entreprise',
    );
    expect(getActivityHeading({ role: 'GROUP_ADMIN', company, direction: null }).title).toBe(
      'Activité du groupe',
    );
  });
});

describe('describePushPermission', () => {
  it('describes every permission status', () => {
    expect(describePushPermission('granted')).toBe('Activées sur cet appareil');
    expect(describePushPermission('provisional')).toBe('Activées sur cet appareil');
    expect(describePushPermission('denied')).toContain('réglages');
    expect(describePushPermission('undetermined')).toBe('Non configurées sur cet appareil');
    expect(describePushPermission(undefined)).toBe('Vérification en cours…');
  });
});
