import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import axios from 'axios';
import { getZeroRateRequestHeaders, runtimeConfig } from '../config/runtime';
import { flushToBackend, setAnalyticsIdentity, track } from './analytics';
import { logger } from './logger';
import {
  clearAuthSession,
  getDeviceIdentifier,
  getStoredAuthTokens,
  getStoredMsisdn,
  mapAuthPayload as mapSessionAuthPayload,
  persistAuthSession,
  persistStoredMsisdn,
  clearStoredMsisdn,
  registerMobileDevice,
  revokeRemoteSession,
  refreshAuthSession,
  subscribeAuthSessionInvalidation,
  shouldRefreshStoredSession,
  getSessionProvenance,
} from './session';

interface AuthContextType {
  token: string | null;
  user: any | null;
  storedMsisdn: string | null;
  // signIn uses MSISDN + PIN — Option A mobile-first auth
  signIn: (msisdn: string, pin: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  linkGoogleAccount: (googleSub: string, msisdn: string, otp: string, email?: string, birthday?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearMsisdn: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [storedMsisdn, setStoredMsisdn] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use the runtime API URL so mobile and web stay aligned with the deployed contract.
  const API_URL = runtimeConfig.apiUrl;

  useEffect(() => {
    // Load token and stored MSISDN from storage on mount
    const loadToken = async () => {
      try {
        const msisdn = await getStoredMsisdn();
        setStoredMsisdn(msisdn);

        const { accessToken, refreshToken, userData } = await getStoredAuthTokens();
        const shouldRenewSession = await shouldRefreshStoredSession();
        if (shouldRenewSession) {
          const refreshed = await refreshAuthSession();
          if (refreshed?.accessToken) {
            setToken(refreshed.accessToken);
            setUser(refreshed.userData ?? userData ?? null);
            if (refreshed.userData?.msisdn) {
              await persistStoredMsisdn(refreshed.userData.msisdn);
              setStoredMsisdn(refreshed.userData.msisdn);
            }
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
            if (parsedUser.msisdn) {
              await persistStoredMsisdn(parsedUser.msisdn);
              setStoredMsisdn(parsedUser.msisdn);
            }
            await setAnalyticsIdentity(
              parsedUser?.msisdn ?? parsedUser?.username ?? parsedUser?.email ?? null,
            );
          }
        } else if (refreshToken) {
          const refreshed = await refreshAuthSession();
          if (refreshed?.accessToken) {
            setToken(refreshed.accessToken);
            setUser(refreshed.userData ?? parsedUser);
            if (refreshed.userData?.msisdn) {
              await persistStoredMsisdn(refreshed.userData.msisdn);
              setStoredMsisdn(refreshed.userData.msisdn);
            }
            await setAnalyticsIdentity(
              refreshed.userData?.msisdn ?? refreshed.userData?.username ?? refreshed.userData?.email ?? null,
            );
          } else {
            const provenance = await getSessionProvenance();
            if (provenance === 'google') {
              try {
                const { googleSignInSilently } = require('./googleAuth');
                const idToken = await googleSignInSilently();
                const googleResponse = await axios.post(`${API_URL}/api/v1/mobile/auth/google`, { id_token: idToken }, {
                  headers: { 'Content-Type': 'application/json' },
                });
                
                if (googleResponse.data && googleResponse.data.linked !== false) {
                  const { accessToken: newAccessToken, refreshToken: newRefreshToken, userData: newUserData } = mapSessionAuthPayload(googleResponse.data);
                  if (newAccessToken) {
                    await persistAuthSession({ accessToken: newAccessToken, refreshToken: newRefreshToken, userData: newUserData, provenance: 'google' });
                    setToken(newAccessToken);
                    setUser(newUserData ?? parsedUser);
                    if (newUserData?.msisdn) {
                      await persistStoredMsisdn(newUserData.msisdn);
                      setStoredMsisdn(newUserData.msisdn);
                    }
                    await setAnalyticsIdentity(newUserData?.msisdn ?? newUserData?.username ?? newUserData?.email ?? null);
                    return;
                  }
                }
              } catch (e) {
                logger.warn('Google silent sign in failed during loadToken', e);
              }
            }
            await clearAuthSession();
            setToken(null);
            setUser(null);
            await setAnalyticsIdentity(null);
          }
        } else {
          const provenance = await getSessionProvenance();
          if (provenance === 'google') {
            try {
              const { googleSignInSilently } = require('./googleAuth');
              const idToken = await googleSignInSilently();
              const googleResponse = await axios.post(`${API_URL}/api/v1/mobile/auth/google`, { id_token: idToken }, {
                headers: { 'Content-Type': 'application/json' },
              });
              
              if (googleResponse.data && googleResponse.data.linked !== false) {
                const { accessToken: newAccessToken, refreshToken: newRefreshToken, userData: newUserData } = mapSessionAuthPayload(googleResponse.data);
                if (newAccessToken) {
                  await persistAuthSession({ accessToken: newAccessToken, refreshToken: newRefreshToken, userData: newUserData, provenance: 'google' });
                  setToken(newAccessToken);
                  setUser(newUserData ?? parsedUser);
                  if (newUserData?.msisdn) {
                    await persistStoredMsisdn(newUserData.msisdn);
                    setStoredMsisdn(newUserData.msisdn);
                  }
                  await setAnalyticsIdentity(newUserData?.msisdn ?? newUserData?.username ?? newUserData?.email ?? null);
                  return;
                }
              }
            } catch (e) {
              logger.warn('Google silent sign in failed during loadToken', e);
            }
          }
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
    // If any shared API request invalidates the session, move the app back to the login shell.
    const unsubscribe = subscribeAuthSessionInvalidation(() => {
      try {
        setToken(null);
        setUser(null);
        void setAnalyticsIdentity(null);
      } catch (error) {
        logger.warn('Session invalidation handling failed', error);
      }
    });
    return () => { unsubscribe(); };
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
      // Clear old session to prevent "undefined" or stale data issues.
      // This is best-effort so a storage hiccup never blocks a valid login.
      try {
        await clearAuthSession();
      } catch (sessionClearError) {
        logger.warn('Pre-login session clear failed', sessionClearError);
      }

      let deviceId = `device-${Date.now().toString(36)}`;
      try {
        deviceId = await getDeviceIdentifier();
      } catch (deviceIdError) {
        logger.warn('Falling back to an ephemeral device id during sign-in', deviceIdError);
      }

      console.warn('[mobile] login request start', {
        apiUrl: API_URL,
        msisdn,
        deviceId,
      });

      const response = await axios.post(
        `${API_URL}/api/v1/mobile/auth/login`,
        {
          username: msisdn,
          password: pin,
          msisdn,
          pin,
          device_id: deviceId,
          platform: 'android',
        },
        {
          timeout: 10000,
          headers: {
            ...getZeroRateRequestHeaders(),
            'Content-Type': 'application/json',
          },
        },
      );
      console.warn('[mobile] login response received', {
        hasData: Boolean(response?.data),
        keys: response?.data ? Object.keys(response.data) : [],
      });
      const { accessToken, refreshToken, userData } = mapSessionAuthPayload(response.data);

      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Authentication response is missing a valid token.');
      }

      try {
        await persistAuthSession({
          accessToken,
          refreshToken,
          userData,
          provenance: 'login',
        });
        // Save the MSISDN for PIN-only returning user login flow
        await persistStoredMsisdn(msisdn);
        setStoredMsisdn(msisdn);
      } catch (sessionPersistError) {
        logger.warn('Login completed, but auth session persistence failed', sessionPersistError);
      }

      setToken(accessToken);
      setUser(userData ?? null);
      await setAnalyticsIdentity(
        userData?.msisdn ?? userData?.username ?? userData?.email ?? msisdn,
      );

      try {
        await registerMobileDevice();
      } catch (registrationError) {
        logger.warn('Login completed, but device registration failed', registrationError);
      }

      try {
        await track('login_success', {}, { screen: 'login' });
        await flushToBackend();
      } catch (analyticsError) {
        logger.warn('Login completed, but analytics sync failed', analyticsError);
      }

      return;
    } catch (error: any) {
      logger.warn('Login failed', { status: error?.response?.status });
      console.warn('[mobile] login request failed', {
        message: error?.message,
        code: error?.code,
        url: error?.config?.url,
        method: error?.config?.method,
        hasResponse: Boolean(error?.response),
        hasRequest: Boolean(error?.request),
      });
      const failureReason =
        error?.__loginFailureReason || (error?.response ? 'auth_failed' : 'network_or_unknown');
      await track('login_fail', { reason: failureReason }, { screen: 'login' });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { googleSignIn } = require('./googleAuth');
      const idToken = await googleSignIn();
      
      const response = await axios.post(`${API_URL}/api/v1/mobile/auth/google`, { id_token: idToken }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.data && response.data.linked === false) {
        return response.data; // Needs linking
      }

      const { accessToken, refreshToken, userData } = mapSessionAuthPayload(response.data);
      if (accessToken) {
        await persistAuthSession({ accessToken, refreshToken, userData, provenance: 'google' });
        setToken(accessToken);
        setUser(userData ?? null);
        await setAnalyticsIdentity(userData?.msisdn ?? userData?.username ?? userData?.email);
        return { success: true };
      }
    } catch (error) {
      logger.error('Google Sign-In backend verification failed', error);
      throw error;
    }
  };

  const linkGoogleAccount = async (googleSub: string, msisdn: string, otp: string, email?: string, birthday?: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/v1/mobile/auth/google/link`, {
        google_sub: googleSub,
        msisdn,
        otp,
        email,
        birthday,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      const { accessToken, refreshToken, userData } = mapSessionAuthPayload(response.data);
      if (accessToken) {
        await persistAuthSession({ accessToken, refreshToken, userData, provenance: 'google' });
        await persistStoredMsisdn(msisdn);
        setStoredMsisdn(msisdn);
        
        setToken(accessToken);
        setUser(userData ?? null);
        await setAnalyticsIdentity(userData?.msisdn ?? userData?.username ?? userData?.email ?? msisdn);
      }
    } catch (error) {
      logger.error('Failed to link Google account', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { googleSignOut } = require('./googleAuth');
      await googleSignOut();
      await revokeRemoteSession();
    } catch (_error) {
      // Remote revoke is best-effort; local session clear still proceeds.
    }
    // Fully clear auth tokens, session data, and the stored MSISDN so next launch requires full credentials
    await clearAuthSession();
    await clearStoredMsisdn();
    setToken(null);
    setUser(null);
    setStoredMsisdn(null);
    await setAnalyticsIdentity(null);
  };

  const clearMsisdn = async () => {
    // Clear stored MSISDN to allow user to switch accounts/log in under a different number
    await clearStoredMsisdn();
    setStoredMsisdn(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, storedMsisdn, signIn, signInWithGoogle, linkGoogleAccount, signOut, clearMsisdn, isLoading }}>
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
