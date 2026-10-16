export type Role =
  | 'GROUP_ADMIN'
  | 'COMPANY_ADMIN'
  | 'MANAGER'
  | 'EMPLOYEE';

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
export type ResourceType = 'VEHICLE' | 'ROOM';
/** Which reservations an equipment may be requested with. */
export type EquipmentScope = 'ROOM' | 'VEHICLE' | 'BOTH';
export type ReservationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'LOGIN'
  | 'LOGOUT';

export type CompanySummary = {
  id: string;
  name: string;
};

export type DirectionSummary = {
  id: string;
  name: string;
} | null;

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  companyId: string;
  directionId: string | null;
  company: CompanySummary;
  direction: DirectionSummary;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: ReservationStatus;
  resourceType: ResourceType;
  resourceId: string | null;
  /**
   * Requester company when the viewer may see the reservation detail.
   * Null on opaque (out-of-scope) group occupancy slots.
   */
  companyId: string | null;
  /** "Toyota Corolla" or the room name. */
  resourceName?: string;
  /** Registration number or room location. */
  resourceDetail?: string | null;
  /** Destination (vehicle) or meeting subject (room). Null when opaque. */
  context?: string | null;
  /** Null when opaque. */
  userId?: string | null;
  /** Null when opaque. */
  requesterName?: string | null;
  /**
   * True when the slot is visible for group occupancy but the viewer
   * is outside the reservation scope (no requester / subject / detail link).
   */
  opaque?: boolean;
};

export type Group = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type Company = {
  id: string;
  groupId: string;
  name: string;
  code: string | null;
  status: EntityStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    directions: number;
    users: number;
    vehicles: number;
    meetingRooms: number;
  };
};

export type Direction = {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  status: EntityStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  company?: CompanySummary;
  _count?: {
    users: number;
  };
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  companyId: string;
  directionId: string | null;
  createdAt: string;
  updatedAt: string;
  company?: CompanySummary;
  direction?: DirectionSummary;
};

/** Metadata only: the bytes are served by GET /vehicles/:id/image (authenticated). */
export type VehicleImageInfo = {
  mimeType: string;
  size: number;
  updatedAt: string;
};

export type Vehicle = {
  id: string;
  companyId: string;
  registrationNumber: string;
  brand: string;
  model: string;
  seats: number;
  status: ResourceStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  company?: CompanySummary;
  image?: VehicleImageInfo | null;
};

export type MeetingRoom = {
  id: string;
  companyId: string;
  name: string;
  location: string | null;
  capacity: number;
  status: ResourceStatus;
  description: string | null;
  /** Fixed, non-bookable features of the room. */
  fixedEquipment: string[];
  createdAt: string;
  updatedAt: string;
  company?: CompanySummary;
};

/** Group-wide catalogue entry, administered by GROUP_ADMIN only. */
export type Equipment = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  scope: EquipmentScope;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
};

/** Stock left on a slot: never exposes the reservations consuming it. */
export type EquipmentAvailability = {
  id: string;
  name: string;
  description: string | null;
  scope: EquipmentScope;
  quantity: number;
  availableQuantity: number;
};

export type ReservationEquipment = {
  quantity: number;
  equipment: { id: string; name: string };
};

export type ReservationEquipmentInput = {
  equipmentId: string;
  quantity: number;
};

export type Reservation = {
  id: string;
  companyId: string;
  userId: string;
  directionId: string | null;
  resourceType: ResourceType;
  vehicleId: string | null;
  roomId: string | null;
  startAt: string;
  endAt: string;
  destination: string | null;
  missionReason: string | null;
  passengerCount: number | null;
  meetingSubject: string | null;
  participantCount: number | null;
  comment: string | null;
  status: ReservationStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  company?: CompanySummary;
  direction?: DirectionSummary;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  vehicle?: {
    id: string;
    registrationNumber: string;
    brand: string;
    model: string;
    seats?: number;
    status?: ResourceStatus;
    companyId?: string;
    company?: CompanySummary;
  } | null;
  room?: {
    id: string;
    name: string;
    location: string | null;
    capacity?: number;
    status?: ResourceStatus;
    companyId?: string;
    company?: CompanySummary;
  } | null;
  equipments?: ReservationEquipment[];
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  userId: string | null;
  action: AuditAction | string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
};

export type DashboardSummary = {
  role: Role;
  companyId: string | null;
  directionId: string | null;
  reservations: {
    total: number;
    pending: number;
    approved: number;
  };
  resources: {
    vehicles: { total: number; available: number };
    rooms: { total: number; available: number };
  };
  /**
   * Average booked duration of the room reservations (APPROVED / COMPLETED) of the scope
   * that ended in the last `periodDays` days, and over the period just before.
   */
  roomUsage?: RoomUsageStats;
};

export type RoomUsagePeriod = {
  averageMinutes: number | null;
  reservationCount: number;
};

export type RoomUsageByDirection = {
  /** null groups the requesters attached directly to their company. */
  directionId: string | null;
  directionName: string | null;
  companyId: string;
  companyName: string;
  reservationCount: number;
  totalMinutes: number;
};

export type RoomUsageStats = RoomUsagePeriod & {
  periodDays: number;
  previous: RoomUsagePeriod;
  /** Booked minutes of the current period, all directions included. */
  totalMinutes?: number;
  /** Most room-consuming directions of the current period, by booked time. */
  topDirections?: RoomUsageByDirection[];
};

export type ListQueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * Realtime (Socket.IO namespace `/realtime`) contract.
 * Must match apps/api/src/modules/realtime/realtime.constants.ts and realtime.types.ts.
 */
export type RealtimeReservationEventData = {
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

export type RealtimeResourceEventData = {
  resourceType: ResourceType;
  resourceId: string;
  companyId: string;
  status: ResourceStatus;
  updatedAt: string;
};

export type RealtimeResourceDeletedData = {
  resourceType: ResourceType;
  resourceId: string;
  companyId: string;
};

export type RealtimeResourceAvailabilityData = {
  resourceType: ResourceType;
  resourceId: string;
  companyId: string;
  reason: 'STATUS_CHANGED' | 'RESERVATION_CHANGED';
  resourceStatus: ResourceStatus | null;
  changedAt: string;
};

export type RealtimeNotificationData = {
  notificationId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
};

export type RealtimeEventMap = {
  'reservation.created': RealtimeReservationEventData;
  'reservation.updated': RealtimeReservationEventData;
  'reservation.approved': RealtimeReservationEventData;
  'reservation.rejected': RealtimeReservationEventData;
  'reservation.cancelled': RealtimeReservationEventData;
  'reservation.extended': RealtimeReservationEventData;
  'resource.created': RealtimeResourceEventData;
  'resource.updated': RealtimeResourceEventData;
  'resource.deleted': RealtimeResourceDeletedData;
  'resource.availability.changed': RealtimeResourceAvailabilityData;
  'notification.created': RealtimeNotificationData;
};

export type RealtimeEventName = keyof RealtimeEventMap;

export type RealtimeEnvelope<TName extends RealtimeEventName = RealtimeEventName> = {
  eventId: string;
  type: TName;
  timestamp: string;
  data: RealtimeEventMap[TName];
};

/** Discriminated union of every envelope, narrowed by `type`. */
export type RealtimeMessage = {
  [TName in RealtimeEventName]: RealtimeEnvelope<TName>;
}[RealtimeEventName];

export type RealtimeErrorCode = 'UNAUTHORIZED' | 'TOO_MANY_CONNECTIONS';
