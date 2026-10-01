export type AvailabilityState =
  | 'idle'
  | 'hidden'
  | 'not-bookable'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'conflict'
  | 'error';

export type AvailabilityInput = {
  hasResource: boolean;
  /** False when the selected resource is in maintenance / out of service. */
  resourceBookable: boolean;
  scheduleValid: boolean;
  /** A 409 was returned by POST /reservations for the current selection. */
  submitConflict: boolean;
  isChecking: boolean;
  isError: boolean;
  available: boolean | undefined;
};

export function getAvailabilityState(input: AvailabilityInput): AvailabilityState {
  if (!input.hasResource) return 'idle';
  if (!input.resourceBookable) return 'not-bookable';
  if (!input.scheduleValid) return 'hidden';
  if (input.submitConflict) return 'conflict';
  if (input.isChecking) return 'checking';
  if (input.isError) return 'error';
  if (input.available === undefined) return 'checking';
  return input.available ? 'available' : 'unavailable';
}
