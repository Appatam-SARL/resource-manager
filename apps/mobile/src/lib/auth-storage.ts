import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'rm_mobile_access_token';
const REFRESH_KEY = 'rm_mobile_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_KEY);
  } catch {
    return null;
  }
}

export async function setAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function setTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await Promise.all([
    setAccessToken(accessToken),
    setRefreshToken(refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
