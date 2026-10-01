import type {
  NotificationType,
  ReservationStatus,
  ResourceStatus,
  ResourceType,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type.js';
import type { RealtimeErrorCode, RealtimeEventName } from './realtime.constants.js';

/**
 * Every server → client message uses this envelope. `eventId` lets a client ignore
 * a message it already processed; REST stays the source of truth.
 */
export type RealtimeEnvelope<TData> = {
  eventId: string;
  type: RealtimeEventName;
  /** ISO 8601 emission date. */
  timestamp: string;
  data: TData;
};

/** Identifiers and schedule only: clients fetch details through REST. */
export type ReservationEventData = {
  reservationId: string;
  companyId: string;
  directionId: string | null;
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  status: ReservationStatus;
  startAt: string;
  endAt: string;
  updatedAt: string;
};

export type ResourceEventData = {
  resourceType: ResourceType;
  resourceId: string;
  companyId: string;
  status: ResourceStatus;
  updatedAt: string;
};

export type ResourceDeletedData = {
  resourceType: ResourceType;
  resourceId: string;
  companyId: string;
};

export type ResourceAvailabilityReason =
  | 'STATUS_CHANGED'
  | 'RESERVATION_CHANGED';

/**
 * Sent to every member of the resource's company: it never carries the reservation
 * or the requester, only the fact that the availability must be refreshed.
 */
export type ResourceAvailabilityChangedData = {
  resourceType: ResourceType;
  resourceId: string;
  companyId: string;
  reason: ResourceAvailabilityReason;
  /** Current resource status when known. */
  resourceStatus: ResourceStatus | null;
  changedAt: string;
};

/** Only sent to the recipient's personal room. */
export type NotificationCreatedData = {
  notificationId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export type RealtimeConnectErrorData = {
  code: RealtimeErrorCode;
  message: string;
};

export type RealtimeSocketData = {
  user?: AuthenticatedUser;
  expiryTimer?: NodeJS.Timeout;
};

/** Reservation fields needed to publish an event (matches `reservationSelect`). */
export type RealtimeReservationSource = {
  id: string;
  companyId: string;
  directionId: string | null;
  userId: string;
  resourceType: ResourceType;
  vehicleId: string | null;
  roomId: string | null;
  status: ReservationStatus;
  startAt: Date;
  endAt: Date;
  updatedAt: Date;
  vehicle?: { status: ResourceStatus } | null;
  room?: { status: ResourceStatus } | null;
};

export type RealtimeResourceSource = {
  id: string;
  companyId: string;
  status: ResourceStatus;
  updatedAt: Date;
};
