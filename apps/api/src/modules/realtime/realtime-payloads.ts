import { ResourceType, type Notification } from '@prisma/client';
import type {
  NotificationCreatedData,
  RealtimeReservationSource,
  RealtimeResourceSource,
  ReservationEventData,
  ResourceAvailabilityChangedData,
  ResourceAvailabilityReason,
  ResourceEventData,
} from './realtime.types.js';

export function getReservationResourceId(
  reservation: Pick<RealtimeReservationSource, 'resourceType' | 'vehicleId' | 'roomId'>,
): string | null {
  return reservation.resourceType === ResourceType.VEHICLE
    ? reservation.vehicleId
    : reservation.roomId;
}

export function toReservationEventData(
  reservation: RealtimeReservationSource,
  resourceId: string,
): ReservationEventData {
  return {
    reservationId: reservation.id,
    companyId: reservation.companyId,
    directionId: reservation.directionId,
    userId: reservation.userId,
    resourceType: reservation.resourceType,
    resourceId,
    status: reservation.status,
    startAt: reservation.startAt.toISOString(),
    endAt: reservation.endAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

export function toReservationAvailabilityData(
  reservation: RealtimeReservationSource,
  resourceId: string,
  resourceCompanyId: string,
  changedAt: Date,
): ResourceAvailabilityChangedData {
  const resource =
    reservation.resourceType === ResourceType.VEHICLE
      ? reservation.vehicle
      : reservation.room;
  return {
    resourceType: reservation.resourceType,
    resourceId,
    companyId: resourceCompanyId,
    reason: 'RESERVATION_CHANGED',
    resourceStatus: resource?.status ?? null,
    changedAt: changedAt.toISOString(),
  };
}

export function toResourceEventData(
  resourceType: ResourceType,
  resource: RealtimeResourceSource,
): ResourceEventData {
  return {
    resourceType,
    resourceId: resource.id,
    companyId: resource.companyId,
    status: resource.status,
    updatedAt: resource.updatedAt.toISOString(),
  };
}

export function toResourceAvailabilityData(
  resourceType: ResourceType,
  resource: RealtimeResourceSource,
  reason: ResourceAvailabilityReason,
): ResourceAvailabilityChangedData {
  return {
    resourceType,
    resourceId: resource.id,
    companyId: resource.companyId,
    reason,
    resourceStatus: resource.status,
    changedAt: resource.updatedAt.toISOString(),
  };
}

export function toNotificationCreatedData(
  notification: Notification,
): NotificationCreatedData {
  return {
    notificationId: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    entityType: notification.entityType,
    entityId: notification.entityId,
    createdAt: notification.createdAt.toISOString(),
  };
}
