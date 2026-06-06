import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import axios from 'axios';
import { runtimeConfig } from '../config/runtime';
import { flushToBackend, setAnalyticsIdentity, track } from './analytics';
import { logger } from './logger';
import {
  clearAuthSession,
  getDeviceIdentifier,
  getStoredAuthTokens,
  mapAuthPayload as mapSessionAuthPayload,
  persistAuthSession,
  registerMobileDevice,
  refreshAuthSession,
  shouldRefreshStoredSession,
} from './session';

interface AuthContextType {
  token: string | null;
  user: any | null;
  // signIn uses MSISDN + PIN — Option A mobile-first auth
  signIn: (msisdn: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use the runtime API URL so mobile and web stay aligned with the deployed contract.
  const API_URL = runtimeConfig.apiUrl;

  useEffect(() => {
    // Load token from storage on mount
    const loadToken = async () => {
      try {
        const { accessToken, refreshToken, userData } = await getStoredAuthTokens();
        const shouldRenewSession = await shouldRefreshStoredSession();
        if (shouldRenewSession) {
          const refreshed = await refreshAuthSession();
          if (refreshed?.accessToken) {
            setToken(refreshed.accessToken);
            setUser(refreshed.userData ?? userData ?? null);
            await setAnalyticsIdentity(
              refreshed.userData?.msisdn ?? refreshed.userData?.username ?? refreshed.userData?.email ?? null,
            );
            return;
          }
        }

        const isValidToken = accessToken && typeof accessToken === 'string' && accessToken.length > 20;
        const parsedUser = userData ?? null;

        if (isValidToken) {
          setToken(accessToken);
          if (parsedUser) {
            setUser(parsedUser);
            await setAnalyticsIdentity(
              parsedUser?.msisdn ?? parsedUser?.username ?? parsedUser?.email ?? null,
            );
          }
        } else if (refreshToken) {
          const refreshed = await refreshAuthSession();
          if (refreshed?.accessToken) {
            setToken(refreshed.accessToken);
            setUser(refreshed.userData ?? parsedUser);
            await setAnalyticsIdentity(
              refreshed.userData?.msisdn ?? refreshed.userData?.username ?? refreshed.userData?.email ?? null,
            );
          } else {
            await clearAuthSession();
            setToken(null);
            setUser(null);
            await setAnalyticsIdentity(null);
          }
        } else {
          await clearAuthSession();
          setToken(null);
          setUser(null);
          await setAnalyticsIdentity(null);
        }
      } catch (e) {
        logger.error('Failed to load stored auth session', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        flushToBackend();
      }
    });

    const interval = setInterval(() => {
      flushToBackend();
    }, 60_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const signIn = async (msisdn: string, pin: string) => {
    try {
      // Clear old session to prevent "undefined" or stale data issues
      await clearAuthSession();
      const deviceId = await getDeviceIdentifier();

      // Support both mobile and legacy auth contracts in deterministic order.
      const attempts = [
        {
          url: `${API_URL}/api/v1/mobile/auth/login`,
          body: {
            msisdn,
            pin,
            device_id: deviceId,
            platform: 'android',
          },
        },
        {
          url: `${API_URL}/api/v1/mobile/auth/login`,
          body: {
            username: msisdn,
            password: pin,
            device_id: deviceId,
            platform: 'android',
          },
          headers: { 'Content-Type': 'application/json' },
        },
        {
          url: `${API_URL}/auth/login`,
          body: {
            username: msisdn,
            password: pin,
          },
          headers: { 'Content-Type': 'application/json' },
        },
      ];

      let lastError: any = null;
      for (let index = 0; index < attempts.length; index += 1) {
        const attempt = attempts[index];
        try {
          const response = await axios.post(attempt.url, attempt.body, {
            headers: attempt.headers,
            timeout: 10000,
          });
          const { accessToken, refreshToken, userData } = mapSessionAuthPayload(response.data);

          if (!accessToken || typeof accessToken !== 'string') {
            throw new Error('Authentication response is missing a valid token.');
          }

          await persistAuthSession({
            accessToken,
            refreshToken,
            userData,
            provenance: 'login',
          });

          setToken(accessToken);
          setUser(userData ?? null);
          await setAnalyticsIdentity(
            userData?.msisdn ?? userData?.username ?? userData?.email ?? msisdn,
          );
          await registerMobileDevice();
          await track('login_success', {}, { screen: 'login' });
          await flushToBackend();
          return;
        } catch (error: any) {
          lastError = error;
          const statusCode = error?.response?.status;
          const canFallback = statusCode === 404 || statusCode === 405;
          if (!canFallback || index === attempts.length - 1) {
            break;
          }
        }
      }

      await track('login_fail', { reason: 'auth_failed' }, { screen: 'login' });
      const authError = lastError ?? new Error('Authentication failed');
      (authError as any).__loginFailureReason = 'auth_failed';
      throw authError;
    } catch (error: any) {
      logger.warn('Login failed', { status: error?.response?.status });
      const failureReason =
        error?.__loginFailureReason || (error?.response ? 'auth_failed' : 'network_or_unknown');
      await track('login_fail', { reason: failureReason }, { screen: 'login' });
      throw error;
    }
  };

  const signOut = async () => {
    await clearAuthSession();
    setToken(null);
    setUser(null);
    await setAnalyticsIdentity(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
