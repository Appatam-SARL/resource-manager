export type Role =
  | 'GROUP_ADMIN'
  | 'COMPANY_ADMIN'
  | 'MANAGER'
  | 'EMPLOYEE';

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type EntityStatus = 'ACTIVE' | 'INACTIVE';
export type ResourceStatus = 'AVAILABLE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
export type ResourceType = 'VEHICLE' | 'ROOM';
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
  resourceId: string;
  companyId: string;
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
};

export type MeetingRoom = {
  id: string;
  companyId: string;
  name: string;
  location: string | null;
  capacity: number;
  status: ResourceStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  company?: CompanySummary;
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
  } | null;
  room?: {
    id: string;
    name: string;
    location: string | null;
  } | null;
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
};

export type ListQueryParams = Record<string, string | number | boolean | undefined | null>;
