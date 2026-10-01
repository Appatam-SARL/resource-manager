import type { QueryKey } from '@tanstack/react-query';
import type {
  RealtimeErrorCode,
  RealtimeEventName,
  RealtimeMessage,
  ResourceType,
} from '@resource-manager/types';

export const REALTIME_NAMESPACE = '/realtime';

const REALTIME_EVENT_FLAGS: Record<RealtimeEventName, true> = {
  'reservation.created': true,
  'reservation.updated': true,
  'reservation.approved': true,
  'reservation.rejected': true,
  'reservation.cancelled': true,
  'reservation.extended': true,
  'resource.created': true,
  'resource.updated': true,
  'resource.deleted': true,
  'resource.availability.changed': true,
  'notification.created': true,
};

export const REALTIME_EVENT_NAMES = Object.keys(REALTIME_EVENT_FLAGS) as RealtimeEventName[];

export function getRealtimeUrl(apiBaseUrl: string): string {
  return `${apiBaseUrl.replace(/\/$/, '')}${REALTIME_NAMESPACE}`;
}

export function getRealtimeErrorCode(error: unknown): RealtimeErrorCode | null {
  if (!error || typeof error !== 'object' || !('data' in error)) return null;
  const code = (error as { data?: { code?: unknown } }).data?.code;
  return code === 'UNAUTHORIZED' || code === 'TOO_MANY_CONNECTIONS' ? code : null;
}

function resourceQueryKey(resourceType: ResourceType): QueryKey {
  return resourceType === 'VEHICLE' ? ['vehicles'] : ['rooms'];
}

/**
 * Query prefixes to refetch for a server event. Events only signal a change:
 * the REST API stays the source of truth, the cache is never patched by hand.
 */
export function getRealtimeInvalidations(message: RealtimeMessage): QueryKey[] {
  switch (message.type) {
    case 'reservation.created':
    case 'reservation.updated':
    case 'reservation.approved':
    case 'reservation.rejected':
    case 'reservation.cancelled':
    case 'reservation.extended':
      return [['reservations'], ['calendar'], ['dashboard'], ['availability']];
    case 'resource.availability.changed':
      return message.data.reason === 'STATUS_CHANGED'
        ? [['availability'], resourceQueryKey(message.data.resourceType), ['dashboard']]
        : [['availability']];
    case 'resource.created':
    case 'resource.updated':
    case 'resource.deleted':
      return [resourceQueryKey(message.data.resourceType), ['availability'], ['dashboard']];
    case 'notification.created':
      return [['notifications']];
  }
}
