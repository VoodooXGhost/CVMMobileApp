import axios from 'axios';
import { Platform } from 'react-native';
import { getZeroRateRequestHeaders, runtimeConfig } from '../config/runtime';
import { platformStorage } from './storage';
import { logger } from './logger';

const ACCESS_TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_DATA_KEY = 'userData';
const DEVICE_ID_KEY = 'analytics_device_id';
const SESSION_PROVENANCE_KEY = 'auth_session_provenance';
const SESSION_INVALIDATION_KEY = 'auth_session_invalidated_at';

type AuthSessionListener = () => void;

const authSessionListeners = new Set<AuthSessionListener>();

const notifyAuthSessionInvalidated = () => {
  authSessionListeners.forEach((listener) => {
    try {
      listener();
    } catch (_error) {
      // Listener failures must not block the logout path.
    }
  });
};

export const subscribeAuthSessionInvalidation = (listener: AuthSessionListener) => {
  authSessionListeners.add(listener);
  return () => authSessionListeners.delete(listener);
};

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const buildUrl = (path: string) => `${trimTrailingSlashes(runtimeConfig.apiUrl)}${path.startsWith('/') ? path : `/${path}`}`;

const parseJwtExpiry = (token: string | null) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const payload = token.split('.')[1];
    const decoder = typeof globalThis.atob === 'function' ? globalThis.atob : null;
    if (!decoder) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(
      decodeURIComponent(
        decoder(normalized)
          .split('')
          .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join(''),
      ),
    );
    return typeof decoded?.exp === 'number' ? decoded.exp * 1000 : null;
  } catch (_error) {
    return null;
  }
};

const isExpiringSoon = (token: string | null) => {
  const expiry = parseJwtExpiry(token);
  if (!expiry) return false;
  return expiry - Date.now() < 60_000;
};

export const getDeviceIdentifier = async () => {
  const existing = await platformStorage.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await platformStorage.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
};

export const mapAuthPayload = (data: any) => {
  const accessToken = data?.access_token ?? data?.accessToken ?? data?.token ?? null;
  const refreshToken = data?.refresh_token ?? data?.refreshToken ?? null;
  const userData = data?.user ?? data?.profile ?? data?.data?.user ?? data?.data?.profile ?? null;
  return { accessToken, refreshToken, userData };
};

export const persistAuthSession = async ({
  accessToken,
  refreshToken,
  userData,
  provenance = 'login',
}: {
  accessToken: string;
  refreshToken?: string | null;
  userData?: any;
  provenance?: string;
}) => {
  await platformStorage.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await platformStorage.setItemAsync(SESSION_PROVENANCE_KEY, provenance);
  if (refreshToken && typeof refreshToken === 'string') {
    await platformStorage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }
  if (userData != null) {
    await platformStorage.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
  }
};

const STORED_MSISDN_KEY = 'storedMsisdn';

export const persistStoredMsisdn = async (msisdn: string) => {
  // Store the user's MSISDN to allow direct PIN-only login on subsequent launches without needing re-entry of the MSISDN.
  await platformStorage.setItemAsync(STORED_MSISDN_KEY, msisdn);
};

export const getStoredMsisdn = async () => {
  // Retrieve the stored MSISDN from platform-specific secure storage. Returns null if not logged in previously.
  return await platformStorage.getItemAsync(STORED_MSISDN_KEY);
};

export const clearStoredMsisdn = async () => {
  // Clear the stored MSISDN upon explicit user logout.
  await platformStorage.deleteItemAsync(STORED_MSISDN_KEY);
};

export const clearAuthSession = async () => {
  await platformStorage.deleteItemAsync(ACCESS_TOKEN_KEY);
  await platformStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
  await platformStorage.deleteItemAsync(USER_DATA_KEY);
  await platformStorage.deleteItemAsync(SESSION_PROVENANCE_KEY);
};

export const invalidateAuthSession = async () => {
  await clearAuthSession();
  await platformStorage.setItemAsync(SESSION_INVALIDATION_KEY, new Date().toISOString());
  notifyAuthSessionInvalidated();
};

export const getStoredAuthTokens = async () => {
  const accessToken = await platformStorage.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await platformStorage.getItemAsync(REFRESH_TOKEN_KEY);
  const userData = await platformStorage.getItemAsync(USER_DATA_KEY);
  return {
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    userData: (() => {
      if (!userData) return null;
      try {
        return JSON.parse(userData);
      } catch (_error) {
        return null;
      }
    })(),
  };
};

export const getSessionProvenance = async () => {
  return await platformStorage.getItemAsync(SESSION_PROVENANCE_KEY);
};

export const shouldRefreshStoredSession = async () => {
  const { accessToken, refreshToken } = await getStoredAuthTokens();
  return Boolean(refreshToken) && (!accessToken || isExpiringSoon(accessToken));
};

export const refreshAuthSession = async () => {
  const refreshToken = await platformStorage.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const deviceId = await getDeviceIdentifier();
  try {
    const response = await axios.post(
      buildUrl('/api/v1/mobile/auth/refresh'),
      { refreshToken, deviceId },
      { timeout: 10_000, headers: getZeroRateRequestHeaders() },
    );
    const refreshedData = response.data;
    if (!refreshedData?.access_token && !refreshedData?.accessToken && !refreshedData?.token) {
      throw new Error('Refresh response did not include an access token.');
    }
    const { refreshToken: nextRefreshToken, userData } = mapAuthPayload(refreshedData);
    logger.log('Session refresh successful', { newAccessToken: !!refreshedData?.access_token });
    const finalAccessToken = refreshedData.access_token || refreshedData.accessToken || refreshedData.token;
    await persistAuthSession({
      accessToken: finalAccessToken,
      refreshToken: nextRefreshToken ?? refreshToken,
      userData,
      provenance: 'refresh',
    });
    return { accessToken: finalAccessToken, refreshToken: nextRefreshToken ?? refreshToken, userData };
  } catch (error: any) {
    logger.warn('Refresh session failed', { status: error?.response?.status });
    return null;
  }
};

const normalizeDeviceToken = async () => {
  const deviceId = await getDeviceIdentifier();
  return deviceId;
};

const getExpoPushTokenIfAvailable = async () => {
  // BlueStacks and local debug builds do not have a real push provider attached.
  // Keep the registration path stable, but let production operators wire the real token source later.
  logger.log('Push token lookup skipped in this build path');
  return null;
};

export const registerMobileDevice = async () => {
  const deviceId = await normalizeDeviceToken();
  const pushToken = await getExpoPushTokenIfAvailable();
  if (runtimeConfig.profile === 'prod' && !pushToken) {
    const error: any = new Error('A real push token is required for production device registration.');
    error.code = 'push_token_unavailable';
    throw error;
  }
  const { accessToken } = await getStoredAuthTokens();
  try {
    await axios.post(
      buildUrl('/api/v1/mobile/auth/register-device'),
      {
        deviceId,
        ...(pushToken ? { pushToken } : {}),
        platform: Platform.OS,
      },
      {
        timeout: 10_000,
        headers: {
          ...getZeroRateRequestHeaders(),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
    );
    return { deviceId, pushToken };
  } catch (error: any) {
    logger.warn('Device registration failed', { status: error?.response?.status });
    if (runtimeConfig.profile === 'prod') {
      throw error;
    }
    return { deviceId, pushToken };
  }
};

export const revokeRemoteSession = async () => {
  const accessToken = await platformStorage.getItemAsync('userToken');
  if (!accessToken) return false;
  try {
    await axios.post(
      buildUrl('/api/v1/mobile/auth/logout'),
      {},
      {
        timeout: 10_000,
        headers: {
          ...getZeroRateRequestHeaders(),
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return true;
  } catch (error: any) {
    logger.warn('Remote session revoke failed', { status: error?.response?.status });
    return false;
  }
};
