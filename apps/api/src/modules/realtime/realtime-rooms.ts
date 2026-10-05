import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';

/**
 * Rooms are always derived server-side from the authenticated user: clients cannot
 * join a room by themselves. Each audience mirrors AccessScopeService.canViewReservation.
 */
export const realtimeRooms = {
  /** GROUP_ADMIN: every company of the Group. */
  group: () => 'group',
  /** Every member of the Group: vehicles and rooms are shared, so are their list and availability. */
  members: () => 'group:members',
  /** COMPANY_ADMIN and MANAGER without direction: all reservations of the company. */
  companyReservations: (companyId: string) =>
    `company:${companyId}:reservations`,
  /** MANAGER with a direction: reservations of that direction. */
  directionReservations: (directionId: string) =>
    `direction:${directionId}:reservations`,
  /** Personal room: own reservations and notifications. */
  user: (userId: string) => `user:${userId}`,
};

export function getUserRooms(user: AuthenticatedUser): string[] {
  const rooms = [realtimeRooms.user(user.id), realtimeRooms.members()];

  if (user.role === Role.GROUP_ADMIN) {
    rooms.push(realtimeRooms.group());
  } else if (user.role === Role.COMPANY_ADMIN) {
    rooms.push(realtimeRooms.companyReservations(user.companyId));
  } else if (user.role === Role.MANAGER) {
    rooms.push(
      user.directionId
        ? realtimeRooms.directionReservations(user.directionId)
        : realtimeRooms.companyReservations(user.companyId),
    );
  }

  return rooms;
}

export function getReservationAudienceRooms(reservation: {
  companyId: string;
  directionId: string | null;
  userId: string;
}): string[] {
  const rooms = [
    realtimeRooms.group(),
    realtimeRooms.companyReservations(reservation.companyId),
    realtimeRooms.user(reservation.userId),
  ];
  if (reservation.directionId) {
    rooms.push(realtimeRooms.directionReservations(reservation.directionId));
  }
  return rooms;
}

/** Resource events carry no reservation detail: the whole Group may receive them. */
export function getResourceAudienceRooms(): string[] {
  return [realtimeRooms.members()];
}
