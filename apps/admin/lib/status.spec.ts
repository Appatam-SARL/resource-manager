import { describe, expect, it } from 'vitest';
import { RESERVATION_STATUS_LABELS, RESOURCE_STATUS_LABELS } from '@/lib/format';
import { getDisplayStatus, getStatusConfig, STATUS_CONFIG } from '@/lib/status';

describe('status system', () => {
  it('keeps the filter labels aligned with the badge labels', () => {
    for (const [status, label] of Object.entries(RESERVATION_STATUS_LABELS)) {
      expect(getStatusConfig(status).label).toBe(label);
    }
    for (const [status, label] of Object.entries(RESOURCE_STATUS_LABELS)) {
      expect(getStatusConfig(status).label).toBe(label);
    }
  });

  it('maps business statuses to a tone', () => {
    expect(STATUS_CONFIG.PENDING.tone).toBe('warning');
    expect(STATUS_CONFIG.APPROVED.tone).toBe('success');
    expect(STATUS_CONFIG.REJECTED.tone).toBe('danger');
    expect(STATUS_CONFIG.INACTIVE.tone).toBe('neutral');
  });

  it('falls back to a neutral badge for unknown statuses', () => {
    expect(getStatusConfig('SOMETHING')).toMatchObject({ label: 'SOMETHING', tone: 'neutral' });
  });
});

describe('getDisplayStatus', () => {
  const now = new Date('2026-10-06T10:00:00.000Z');

  it('shows an ended APPROVED reservation as COMPLETED (« Terminée »)', () => {
    const status = getDisplayStatus({ status: 'APPROVED', endAt: '2026-10-06T09:00:00.000Z' }, now);
    expect(status).toBe('COMPLETED');
    expect(getStatusConfig(status).label).toBe('Terminée');
  });

  it('treats an end exactly now as reached', () => {
    expect(getDisplayStatus({ status: 'APPROVED', endAt: '2026-10-06T10:00:00.000Z' }, now)).toBe('COMPLETED');
  });

  it('keeps an in-progress APPROVED reservation APPROVED', () => {
    expect(getDisplayStatus({ status: 'APPROVED', endAt: '2026-10-06T11:00:00.000Z' }, now)).toBe('APPROVED');
  });

  it('keeps an ended PENDING reservation PENDING', () => {
    expect(getDisplayStatus({ status: 'PENDING', endAt: '2026-10-06T09:00:00.000Z' }, now)).toBe('PENDING');
  });

  it('never changes final statuses', () => {
    for (const status of ['REJECTED', 'CANCELLED', 'COMPLETED'] as const) {
      expect(getDisplayStatus({ status, endAt: '2026-10-06T09:00:00.000Z' }, now)).toBe(status);
    }
  });
});
