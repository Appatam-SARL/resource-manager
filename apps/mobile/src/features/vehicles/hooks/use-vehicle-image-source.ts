import { useCallback, useEffect, useState } from 'react';
import type { ImageSource } from 'expo-image';
import type { Vehicle } from '@resource-manager/types';
import { getBaseUrl } from '@/api/client';
import { getAccessToken } from '@/lib/auth-storage';

/**
 * The vehicle photo endpoint requires the bearer token. The token is read from SecureStore and
 * only passed as a request header; the cache key is versioned so a replaced photo is refetched.
 */
export function useVehicleImageSource() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getAccessToken().then((value) => {
      if (active) setToken(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return useCallback(
    (vehicle: Pick<Vehicle, 'id' | 'image'>): ImageSource | null => {
      if (!vehicle.image || !token) return null;
      return {
        uri: `${getBaseUrl()}/api/v1/vehicles/${vehicle.id}/image`,
        headers: { Authorization: `Bearer ${token}` },
        cacheKey: `vehicle-image-${vehicle.id}-${vehicle.image.updatedAt}`,
      };
    },
    [token],
  );
}
