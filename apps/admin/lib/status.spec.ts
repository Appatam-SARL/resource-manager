import { describe, expect, it } from 'vitest';
import { RESERVATION_STATUS_LABELS, RESOURCE_STATUS_LABELS } from '@/lib/format';
import { getStatusConfig, STATUS_CONFIG } from '@/lib/status';

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
