'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiClient } from '@resource-manager/api-client';
import { ApiError } from '@resource-manager/api-client';
import {
  clearSession,
  createBrowserApiClient,
  getApiBaseUrl,
  getStoredAccessToken,
  refreshSession,
} from '@/lib/api';
import { createApiClient } from '@resource-manager/api-client';

export function useApiClient(): ApiClient {
  const router = useRouter();

  return useMemo(() => {
    const handleUnauthorized = () => {
      clearSession();
      router.replace('/login');
    };

    return createApiClient({
      baseUrl: getApiBaseUrl(),
      getAccessToken: getStoredAccessToken,
      onUnauthorized: handleUnauthorized,
    });
  }, [router]);
}

export async function apiCallWithRefresh<T>(
  execute: (client: ApiClient) => Promise<T>,
): Promise<T> {
  const client = createBrowserApiClient();
  try {
    return await execute(client);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await refreshSession();
      if (!refreshed) throw error;
      return execute(createBrowserApiClient());
    }
    throw error;
  }
}
