import axios from 'axios';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { runtimeConfig } from '../config/runtime';
import { platformStorage } from './storage';
import { logger } from './logger';

const ACCESS_TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_DATA_KEY = 'userData';
const DEVICE_ID_KEY = 'analytics_device_id';
const SESSION_PROVENANCE_KEY = 'auth_session_provenance';

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

export const clearAuthSession = async () => {
  await platformStorage.deleteItemAsync(ACCESS_TOKEN_KEY);
  await platformStorage.deleteItemAsync(REFRESH_TOKEN_KEY);
  await platformStorage.deleteItemAsync(USER_DATA_KEY);
  await platformStorage.deleteItemAsync(SESSION_PROVENANCE_KEY);
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

export const shouldRefreshStoredSession = async () => {
  const { accessToken, refreshToken } = await getStoredAuthTokens();
  return Boolean(refreshToken) && (!accessToken || isExpiringSoon(accessToken));
};

export const refreshAuthSession = async () => {
  const refreshToken = await platformStorage.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const deviceId = await getDeviceIdentifier();
  const attempts = [
    {
      url: buildUrl('/api/v1/mobile/auth/refresh'),
      body: { refresh_token: refreshToken, device_id: deviceId },
    },
    {
      url: buildUrl('/auth/refresh'),
      body: { refresh_token: refreshToken, device_id: deviceId },
    },
  ];

  let lastError: any = null;
  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    try {
      const response = await axios.post(attempt.url, attempt.body, { timeout: 10_000 });
      const { accessToken, refreshToken: nextRefreshToken, userData } = mapAuthPayload(response.data);
      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Refresh response did not include an access token.');
      }
      await persistAuthSession({
        accessToken,
        refreshToken: nextRefreshToken ?? refreshToken,
        userData,
        provenance: 'refresh',
      });
      return { accessToken, refreshToken: nextRefreshToken ?? refreshToken, userData };
    } catch (error: any) {
      lastError = error;
      const statusCode = error?.response?.status;
      const canFallback = statusCode === 404 || statusCode === 405;
      if (!canFallback || index === attempts.length - 1) {
        break;
      }
    }
  }

  logger.warn('Refresh session failed', { status: lastError?.response?.status });
  return null;
};

const normalizeDeviceToken = async () => {
  const deviceId = await getDeviceIdentifier();
  return deviceId;
};

const getExpoPushTokenIfAvailable = async () => {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted) {
      return null;
    }

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.expoConfig?.extra?.projectId ??
      null;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse?.data ?? null;
  } catch (error) {
    logger.warn('Expo push token unavailable', error);
    return null;
  }
};

export const registerMobileDevice = async () => {
  const deviceId = await normalizeDeviceToken();
  const pushToken = await getExpoPushTokenIfAvailable();
  const attempts = [
    `${buildUrl('/api/v1/mobile/auth/register-device')}`,
    `${buildUrl('/auth/register-device')}`,
  ];

  let lastError: any = null;
  for (let index = 0; index < attempts.length; index += 1) {
    try {
      await axios.post(
        attempts[index],
        {
          device_id: deviceId,
          ...(pushToken ? { push_token: pushToken } : {}),
          platform: Platform.OS,
        },
        { timeout: 10_000 },
      );
      return { deviceId, pushToken };
    } catch (error: any) {
      lastError = error;
      const statusCode = error?.response?.status;
      const canFallback = statusCode === 404 || statusCode === 405;
      if (!canFallback || index === attempts.length - 1) {
        break;
      }
    }
  }

  logger.warn('Device registration failed', { status: lastError?.response?.status });
  return { deviceId, pushToken };
};
