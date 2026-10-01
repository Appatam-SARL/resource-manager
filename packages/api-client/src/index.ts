import type {
  AuditLog,
  AuthTokens,
  AuthUser,
  CalendarEvent,
  Company,
  DashboardSummary,
  Direction,
  Group,
  ListQueryParams,
  MeetingRoom,
  Notification,
  Paginated,
  Reservation,
  User,
  Vehicle,
} from '@resource-manager/types';

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  onUnauthorized?: () => void;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly payload: unknown;

  constructor(status: number, body: string, payload?: unknown) {
    super(extractErrorMessage(status, body, payload));
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.payload = payload;
  }
}

function extractErrorMessage(
  status: number,
  body: string,
  payload?: unknown,
): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (Array.isArray(record.message)) return record.message.join(', ');
  }
  if (body) {
    try {
      const parsed = JSON.parse(body) as { message?: string | string[] };
      if (typeof parsed.message === 'string') return parsed.message;
      if (Array.isArray(parsed.message)) return parsed.message.join(', ');
    } catch {
      /* keep fallback */
    }
  }
  return `Erreur API (${status})`;
}

async function request<T>(
  options: ApiClientOptions,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  const token = options.getAccessToken?.();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${options.baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    let payload: unknown;
    try {
      payload = body ? JSON.parse(body) : undefined;
    } catch {
      payload = undefined;
    }
    if (response.status === 401) {
      options.onUnauthorized?.();
    }
    throw new ApiError(response.status, body, payload);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function toQuery(params?: ListQueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export function createApiClient(options: ApiClientOptions) {
  return {
    login: (body: { email: string; password: string }) =>
      request<AuthTokens>(options, '/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    refresh: (body: { refreshToken: string }) =>
      request<AuthTokens>(options, '/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    logout: (body: { refreshToken: string }) =>
      request<{ message: string }>(options, '/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    me: () => request<AuthUser>(options, '/api/v1/auth/me'),

    getGroup: () => request<Group>(options, '/api/v1/group'),

    getGroupById: (id: string) => request<Group>(options, `/api/v1/group/${id}`),

    updateGroup: (id: string, body: { name: string }) =>
      request<Group>(options, `/api/v1/group/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    getCompanies: (params?: ListQueryParams) =>
      request<Paginated<Company>>(options, `/api/v1/companies${toQuery(params)}`),

    getCompany: (id: string) =>
      request<Company>(options, `/api/v1/companies/${id}`),

    createCompany: (body: unknown) =>
      request<Company>(options, '/api/v1/companies', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateCompany: (id: string, body: unknown) =>
      request<Company>(options, `/api/v1/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    updateCompanyStatus: (id: string, body: { status: string }) =>
      request<Company>(options, `/api/v1/companies/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    getDirections: (params?: ListQueryParams) =>
      request<Paginated<Direction>>(
        options,
        `/api/v1/directions${toQuery(params)}`,
      ),

    getDirection: (id: string) =>
      request<Direction>(options, `/api/v1/directions/${id}`),

    createDirection: (body: unknown) =>
      request<Direction>(options, '/api/v1/directions', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateDirection: (id: string, body: unknown) =>
      request<Direction>(options, `/api/v1/directions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    updateDirectionStatus: (id: string, body: { status: string }) =>
      request<Direction>(options, `/api/v1/directions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    getUsers: (params?: ListQueryParams) =>
      request<Paginated<User>>(options, `/api/v1/users${toQuery(params)}`),

    getUser: (id: string) => request<User>(options, `/api/v1/users/${id}`),

    createUser: (body: unknown) =>
      request<User>(options, '/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateUser: (id: string, body: unknown) =>
      request<User>(options, `/api/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    updateUserStatus: (id: string, body: { status: string }) =>
      request<User>(options, `/api/v1/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    getVehicles: (params?: ListQueryParams) =>
      request<Paginated<Vehicle>>(options, `/api/v1/vehicles${toQuery(params)}`),

    getVehicle: (id: string) =>
      request<Vehicle>(options, `/api/v1/vehicles/${id}`),

    createVehicle: (body: unknown) =>
      request<Vehicle>(options, '/api/v1/vehicles', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateVehicle: (id: string, body: unknown) =>
      request<Vehicle>(options, `/api/v1/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    updateVehicleStatus: (id: string, body: { status: string }) =>
      request<Vehicle>(options, `/api/v1/vehicles/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    getRooms: (params?: ListQueryParams) =>
      request<Paginated<MeetingRoom>>(options, `/api/v1/rooms${toQuery(params)}`),

    getRoom: (id: string) =>
      request<MeetingRoom>(options, `/api/v1/rooms/${id}`),

    createRoom: (body: unknown) =>
      request<MeetingRoom>(options, '/api/v1/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateRoom: (id: string, body: unknown) =>
      request<MeetingRoom>(options, `/api/v1/rooms/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    updateRoomStatus: (id: string, body: { status: string }) =>
      request<MeetingRoom>(options, `/api/v1/rooms/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    getReservations: (params?: ListQueryParams) =>
      request<Paginated<Reservation>>(
        options,
        `/api/v1/reservations${toQuery(params)}`,
      ),

    checkAvailability: (params: {
      resourceType: string;
      resourceId: string;
      startAt: string;
      endAt: string;
    }) =>
      request<{
        available: boolean;
        companyId: string;
        resourceType: string;
        resourceId: string;
        startAt: string;
        endAt: string;
        conflicts: Array<{
          id: string;
          status: string;
          startAt: string;
          endAt: string;
        }>;
      }>(options, `/api/v1/reservations/availability${toQuery(params)}`),

    getReservation: (id: string) =>
      request<Reservation>(options, `/api/v1/reservations/${id}`),

    createReservation: (body: unknown) =>
      request<Reservation>(options, '/api/v1/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    updateReservation: (id: string, body: unknown) =>
      request<Reservation>(options, `/api/v1/reservations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    approveReservation: (id: string) =>
      request<Reservation>(options, `/api/v1/reservations/${id}/approve`, {
        method: 'POST',
      }),

    rejectReservation: (id: string, body: { rejectionReason: string }) =>
      request<Reservation>(options, `/api/v1/reservations/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    cancelReservation: (id: string) =>
      request<Reservation>(options, `/api/v1/reservations/${id}/cancel`, {
        method: 'POST',
      }),

    getCalendar: (params?: ListQueryParams) =>
      request<CalendarEvent[]>(options, `/api/v1/calendar${toQuery(params)}`),

    getNotifications: (params?: ListQueryParams) =>
      request<Paginated<Notification>>(
        options,
        `/api/v1/notifications${toQuery(params)}`,
      ),

    getUnreadNotificationsCount: () =>
      request<{ count: number }>(options, '/api/v1/notifications/unread-count'),

    markNotificationRead: (id: string) =>
      request<Notification>(options, `/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    markAllNotificationsRead: () =>
      request<{ count: number } | Notification[]>(
        options,
        '/api/v1/notifications/read-all',
        { method: 'PATCH' },
      ),

    getDashboardSummary: () =>
      request<DashboardSummary>(options, '/api/v1/dashboard/summary'),

    getDashboardReservations: (params?: ListQueryParams) =>
      request<Reservation[]>(
        options,
        `/api/v1/dashboard/reservations${toQuery(params)}`,
      ),

    getDashboardResources: () =>
      request<{
        vehicles: Vehicle[];
        rooms: MeetingRoom[];
        counts: {
          vehicles: number;
          rooms: number;
          vehiclesAvailable: number;
          roomsAvailable: number;
        };
      }>(options, '/api/v1/dashboard/resources'),

    getAuditLogs: (params?: ListQueryParams) =>
      request<Paginated<AuditLog>>(options, `/api/v1/audit${toQuery(params)}`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
