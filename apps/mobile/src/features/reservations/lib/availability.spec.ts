import { describe, expect, it } from 'vitest';
import { getAvailabilityState, type AvailabilityInput } from './availability';

const base: AvailabilityInput = {
  hasResource: true,
  resourceBookable: true,
  scheduleValid: true,
  submitConflict: false,
  isChecking: false,
  isError: false,
  available: true,
};

describe('getAvailabilityState', () => {
  it('asks for a resource first', () => {
    expect(getAvailabilityState({ ...base, hasResource: false })).toBe('idle');
  });

  it('blocks resources in maintenance or out of service', () => {
    expect(getAvailabilityState({ ...base, resourceBookable: false })).toBe('not-bookable');
  });

  it('stays hidden while the schedule is invalid', () => {
    expect(getAvailabilityState({ ...base, scheduleValid: false })).toBe('hidden');
  });

  it('reports a 409 returned at creation even if the last check was available', () => {
    expect(getAvailabilityState({ ...base, submitConflict: true })).toBe('conflict');
  });

  it('shows the checking state while debouncing or fetching', () => {
    expect(getAvailabilityState({ ...base, isChecking: true })).toBe('checking');
    expect(getAvailabilityState({ ...base, available: undefined })).toBe('checking');
  });

  it('maps the API answer', () => {
    expect(getAvailabilityState(base)).toBe('available');
    expect(getAvailabilityState({ ...base, available: false })).toBe('unavailable');
    expect(getAvailabilityState({ ...base, isError: true, available: undefined })).toBe('error');
  });
});
