export type CapacityAlertInput = {
  previousCount: number;
  nextCount: number;
  /** Indicative capacity of the selected room; undefined while no room is selected. */
  capacity: number | undefined;
  roomId: string | null | undefined;
  /** Room for which the alert was already shown during this form session. */
  alertedRoomId: string | null;
};

/**
 * Room capacity is indicative: exceeding it is allowed. The alert only reassures the user,
 * once per room, at the moment the count crosses the capacity upwards.
 */
export function shouldShowCapacityAlert(input: CapacityAlertInput): boolean {
  if (!input.roomId || input.capacity === undefined) return false;
  if (input.alertedRoomId === input.roomId) return false;
  return input.previousCount <= input.capacity && input.nextCount > input.capacity;
}
