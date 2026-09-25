import {
  create,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  AuthTokens,
  AuthUser,
  CalendarEvent,
  DashboardSummary,
  ListQueryParams,
  MeetingRoom,
  Notification,
  Paginated,
  Reservation,
  Vehicle,
} from '@resource-manager/types';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/lib/auth-storage';
import { AppError, mapApiError } from '@/lib/errors';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let client: AxiosInstance | null = null;
let refreshClient: AxiosInstance | null = null;
let onUnauthorized: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/**
 * Resolve API base URL for device / emulator / simulator.
 * Priority: EXPO_PUBLIC_API_URL → Metro host (LAN) → Android emulator loopback → localhost
 */
export function getBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl?.replace(/^exp:\/\//, '') ??
    undefined;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === 'android') {
    // Android emulator → host machine loopback
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

function getRefreshClient(): AxiosInstance {
  if (!refreshClient) {
    refreshClient = create({
      baseURL: getBaseUrl(),
      timeout: 15_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return refreshClient;
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

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const response = await getRefreshClient().post<AuthTokens>(
        '/api/v1/auth/refresh',
        { refreshToken },
      );
      await setTokens(response.data.accessToken, response.data.refreshToken);
      return response.data.accessToken;
    } catch {
      await clearTokens();
      onUnauthorized?.();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function getApiClient(): AxiosInstance {
  if (client) return client;

  client = create({
    baseURL: `${getBaseUrl()}/api/v1`,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      if (
        error.response?.status === 401 &&
        original &&
        !original._retry &&
        !original.url?.includes('/auth/login') &&
        !original.url?.includes('/auth/refresh')
      ) {
        original._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return client!.request(original);
        }
      }
      throw mapApiError(error);
    },
  );

  return client;
}

async function get<T>(path: string, params?: ListQueryParams): Promise<T> {
  const api = getApiClient();
  const response = await api.get<T>(`${path}${toQuery(params)}`);
  return response.data;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const api = getApiClient();
  const response = await api.post<T>(path, body);
  return response.data;
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const api = getApiClient();
  const response = await api.patch<T>(path, body);
  return response.data;
}

export const authApi = {
  login: (body: { email: string; password: string }) =>
    post<AuthTokens>('/auth/login', body),
  refresh: (body: { refreshToken: string }) =>
    post<AuthTokens>('/auth/refresh', body),
  logout: (body: { refreshToken: string }) =>
    post<{ message: string }>('/auth/logout', body),
  me: () => get<AuthUser>('/auth/me'),
};

export const dashboardApi = {
  summary: () => get<DashboardSummary>('/dashboard/summary'),
  reservations: (limit = 10) =>
    get<Reservation[]>('/dashboard/reservations', { limit }),
  resources: () =>
    get<{
      vehicles: Vehicle[];
      rooms: MeetingRoom[];
      counts: {
        vehicles: number;
        rooms: number;
        vehiclesAvailable: number;
        roomsAvailable: number;
      };
    }>('/dashboard/resources'),
};

export const vehiclesApi = {
  list: (params?: ListQueryParams) =>
    get<Paginated<Vehicle>>('/vehicles', params),
  get: (id: string) => get<Vehicle>(`/vehicles/${id}`),
};

export const roomsApi = {
  list: (params?: ListQueryParams) =>
    get<Paginated<MeetingRoom>>('/rooms', params),
  get: (id: string) => get<MeetingRoom>(`/rooms/${id}`),
};

export const reservationsApi = {
  list: (params?: ListQueryParams) =>
    get<Paginated<Reservation>>('/reservations', params),
  get: (id: string) => get<Reservation>(`/reservations/${id}`),
  create: (body: unknown) => post<Reservation>('/reservations', body),
  cancel: (id: string) => post<Reservation>(`/reservations/${id}/cancel`),
  checkAvailability: (params: {
    resourceType: string;
    resourceId: string;
    startAt: string;
    endAt: string;
  }) =>
    get<{
      available: boolean;
      conflicts: { id: string; status: string; startAt: string; endAt: string }[];
    }>('/reservations/availability', params),
};

export const calendarApi = {
  list: (params: ListQueryParams) =>
    get<CalendarEvent[]>('/calendar', params),
};

export const notificationsApi = {
  list: (params?: ListQueryParams) =>
    get<Paginated<Notification>>('/notifications', params),
  markRead: (id: string) => patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => patch<{ count?: number }>('/notifications/read-all'),
};

export function assertAppError(error: unknown): asserts error is AppError {
  if (!(error instanceof AppError)) {
    throw mapApiError(error);
  }
}
