import axios from 'axios';
import { Platform } from 'react-native';
import { getZeroRateRequestHeaders, runtimeConfig } from '../config/runtime';
import { platformStorage } from './storage';
import { logger } from './logger';
import { getDeviceIdentifier, registerMobileDevice } from './session';

const WALLET_TOKEN_KEY = 'wallet_token';
const WALLET_TOKEN_EXPIRES_AT_KEY = 'wallet_token_expires_at';

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');
const buildUrl = (path: string) => `${trimTrailingSlashes(runtimeConfig.apiUrl)}${path.startsWith('/') ? path : `/${path}`}`;

const getStoredExpiry = async () => {
  const raw = await platformStorage.getItemAsync(WALLET_TOKEN_EXPIRES_AT_KEY);
  const parsed = Number(raw || '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const clearWalletToken = async () => {
  await platformStorage.deleteItemAsync(WALLET_TOKEN_KEY);
  await platformStorage.deleteItemAsync(WALLET_TOKEN_EXPIRES_AT_KEY);
};

export const getValidWalletToken = async () => {
  const token = await platformStorage.getItemAsync(WALLET_TOKEN_KEY);
  if (!token) return null;
  const expiresAt = await getStoredExpiry();
  if (expiresAt > 0 && Date.now() > expiresAt) {
    await clearWalletToken();
    return null;
  }
  return token;
};

export const storeWalletToken = async (token: string, expiresInSeconds = 300) => {
  const safeToken = typeof token === 'string' ? token : '';
  if (!safeToken) return;
  await platformStorage.setItemAsync(WALLET_TOKEN_KEY, safeToken);
  await platformStorage.setItemAsync(WALLET_TOKEN_EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000));
};

export const ensureWalletAccess = async (biometricAssertion = 'mock-biometric-accepted') => {
  const existing = await getValidWalletToken();
  if (existing) return existing;

  const accessToken = await platformStorage.getItemAsync('userToken');
  if (!accessToken) {
    const error: any = new Error('Wallet verification requires an active session.');
    error.code = 'session_expired';
    throw error;
  }

  const deviceId = await getDeviceIdentifier();
  const attempts = [
    `${buildUrl('/api/v1/mobile/auth/wallet/verify')}`,
    `${buildUrl('/auth/wallet/verify')}`,
  ];

  let lastError: any = null;
  for (let index = 0; index < attempts.length; index += 1) {
    try {
      const response = await axios.post(
        attempts[index],
        {
          biometricAssertion,
          deviceId,
          platform: Platform.OS,
        },
        {
          timeout: 10_000,
          headers: {
            ...getZeroRateRequestHeaders(),
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const payload = response?.data ?? {};
      const walletToken = payload.wallet_token ?? payload.walletToken ?? payload.token;
      const expiresIn = Number(payload.expires_in ?? payload.expiresIn ?? 300);
      if (typeof walletToken !== 'string' || walletToken.length === 0) {
        const error: any = new Error('Wallet verification did not return a token.');
        error.code = 'wallet_step_up_required';
        throw error;
      }
      await storeWalletToken(walletToken, Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 300);
      return walletToken;
    } catch (error: any) {
      console.warn('[walletAccess] Verification attempt failed:', attempts[index], 'Status:', error?.response?.status, 'Message:', error?.message, 'Data:', JSON.stringify(error?.response?.data));
      lastError = error;
      const statusCode = error?.response?.status;
      const canFallback = statusCode === 404 || statusCode === 405;
      const shouldRetryAfterDeviceRegistration =
        statusCode === 403 && runtimeConfig.profile === 'validation' && index === attempts.length - 1;
      if (shouldRetryAfterDeviceRegistration) {
        try {
          logger.log('Retrying wallet access after validation device registration fallback');
          await registerMobileDevice();
          const retryResponse = await axios.post(
            attempts[index],
            {
              biometricAssertion,
              deviceId,
              platform: Platform.OS,
            },
            {
              timeout: 10_000,
              headers: {
                ...getZeroRateRequestHeaders(),
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
          const retryPayload = retryResponse?.data ?? {};
          const retryWalletToken = retryPayload.wallet_token ?? retryPayload.walletToken ?? retryPayload.token;
          const retryExpiresIn = Number(retryPayload.expires_in ?? retryPayload.expiresIn ?? 300);
          if (typeof retryWalletToken === 'string' && retryWalletToken.length > 0) {
            await storeWalletToken(
              retryWalletToken,
              Number.isFinite(retryExpiresIn) && retryExpiresIn > 0 ? retryExpiresIn : 300,
            );
            return retryWalletToken;
          }
        } catch (retryError: any) {
          lastError = retryError;
        }
      }
      if (!canFallback || index === attempts.length - 1) {
        break;
      }
    }
  }

  logger.warn('Wallet step-up verification failed', { status: lastError?.response?.status });
  const failure: any = new Error('Wallet verification required.');
  failure.code = getWalletFailureCode(lastError);
  failure.details = lastError;
  throw failure;
};

const getWalletFailureCode = (error: any) => {
  const status = error?.response?.status;
  if (status === 401) return 'wallet_token_expired';
  if (status === 403) return 'wallet_step_up_required';
  if (status === 404 || status === 405) return 'wallet_step_up_required';
  return 'wallet_step_up_required';
};
