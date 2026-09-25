import type { AuthUser, Reservation } from '@resource-manager/types';

export function canApproveOrReject(
  user: AuthUser,
  reservation: Reservation,
): boolean {
  if (reservation.status !== 'PENDING') return false;
  if (user.role === 'GROUP_ADMIN') return true;
  if (user.role === 'COMPANY_ADMIN') {
    return user.companyId === reservation.companyId;
  }
  if (user.role === 'MANAGER') {
    if (user.companyId !== reservation.companyId) return false;
    if (!user.directionId) return true;
    return (
      reservation.directionId === user.directionId ||
      reservation.userId === user.id
    );
  }
  return false;
}

export function canCancelReservation(
  user: AuthUser,
  reservation: Reservation,
): boolean {
  if (
    reservation.status !== 'PENDING' &&
    reservation.status !== 'APPROVED'
  ) {
    return false;
  }
  if (user.role === 'GROUP_ADMIN' || user.role === 'COMPANY_ADMIN') {
    return true;
  }
  return user.id === reservation.userId;
}

export function canManageResources(role: AuthUser['role']): boolean {
  return role === 'GROUP_ADMIN' || role === 'COMPANY_ADMIN';
}
