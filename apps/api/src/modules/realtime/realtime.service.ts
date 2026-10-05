import { Injectable, Logger } from '@nestjs/common';
import { ResourceType, type Notification } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Namespace } from 'socket.io';
import {
  REALTIME_EVENTS,
  type RealtimeEventName,
  type ReservationEventName,
} from './realtime.constants.js';
import {
  getReservationResourceId,
  toNotificationCreatedData,
  toReservationAvailabilityData,
  toReservationEventData,
  toResourceAvailabilityData,
  toResourceEventData,
} from './realtime-payloads.js';
import {
  getReservationAudienceRooms,
  getResourceAudienceRooms,
  realtimeRooms,
} from './realtime-rooms.js';
import type {
  RealtimeEnvelope,
  RealtimeReservationSource,
  RealtimeResourceSource,
  ResourceAvailabilityReason,
} from './realtime.types.js';

/**
 * Publishes state changes that business services have already committed.
 * Publishing is best effort: it never throws, so a socket problem can never
 * fail or roll back a REST operation.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: Namespace | null = null;

  bindServer(server: Namespace): void {
    this.server = server;
  }

  publishReservation(
    type: ReservationEventName,
    reservation: RealtimeReservationSource,
    options: { availabilityChanged: boolean },
  ): void {
    const resourceId = getReservationResourceId(reservation);
    if (!resourceId) return;

    this.emit(
      getReservationAudienceRooms(reservation),
      type,
      toReservationEventData(reservation, resourceId),
    );

    const resourceCompanyId = (reservation.vehicle ?? reservation.room)?.companyId;
    if (options.availabilityChanged && resourceCompanyId) {
      this.emit(
        getResourceAudienceRooms(),
        REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED,
        toReservationAvailabilityData(reservation, resourceId, resourceCompanyId, new Date()),
      );
    }
  }

  publishResourceCreated(
    resourceType: ResourceType,
    resource: RealtimeResourceSource,
  ): void {
    this.emit(
      getResourceAudienceRooms(),
      REALTIME_EVENTS.RESOURCE_CREATED,
      toResourceEventData(resourceType, resource),
    );
  }

  publishResourceUpdated(
    resourceType: ResourceType,
    resource: RealtimeResourceSource,
  ): void {
    this.emit(
      getResourceAudienceRooms(),
      REALTIME_EVENTS.RESOURCE_UPDATED,
      toResourceEventData(resourceType, resource),
    );
  }

  publishResourceAvailability(
    resourceType: ResourceType,
    resource: RealtimeResourceSource,
    reason: ResourceAvailabilityReason,
  ): void {
    this.emit(
      getResourceAudienceRooms(),
      REALTIME_EVENTS.RESOURCE_AVAILABILITY_CHANGED,
      toResourceAvailabilityData(resourceType, resource, reason),
    );
  }

  publishResourceDeleted(
    resourceType: ResourceType,
    resource: { id: string; companyId: string },
  ): void {
    this.emit(
      getResourceAudienceRooms(),
      REALTIME_EVENTS.RESOURCE_DELETED,
      { resourceType, resourceId: resource.id, companyId: resource.companyId },
    );
  }

  publishNotifications(notifications: Notification[]): void {
    for (const notification of notifications) {
      this.emit(
        [realtimeRooms.user(notification.userId)],
        REALTIME_EVENTS.NOTIFICATION_CREATED,
        toNotificationCreatedData(notification),
      );
    }
  }

  /**
   * Closes every socket of a user (deactivation, role or direction change).
   * The client reconnects and gets its rooms recomputed from the database,
   * or is refused if the account is no longer active.
   */
  disconnectUser(userId: string): void {
    if (!this.server) return;
    try {
      this.server.in(realtimeRooms.user(userId)).disconnectSockets(true);
    } catch (error) {
      this.logFailure('disconnect', error);
    }
  }

  private emit<TData>(
    rooms: string[],
    type: RealtimeEventName,
    data: TData,
  ): void {
    if (!this.server) return;
    const envelope: RealtimeEnvelope<TData> = {
      eventId: randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    try {
      this.server.to(rooms).emit(type, envelope);
      this.logger.debug(`WebSocket event emitted: ${type} (${envelope.eventId})`);
    } catch (error) {
      this.logFailure(type, error);
    }
  }

  private logFailure(operation: string, error: unknown): void {
    const reason = error instanceof Error ? error.message : 'unknown error';
    this.logger.error(`WebSocket error during ${operation}: ${reason}`);
  }
}
