import React, { createContext, useState, useContext, useEffect } from 'react';
import { platformStorage } from './storage';
import axios from 'axios';

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

  // The BFF URL - strictly using environment variables for enterprise compatibility
  const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.1:3000'; 

  useEffect(() => {
    // Load token from storage on mount
    const loadToken = async () => {
      try {
        const savedToken = await platformStorage.getItemAsync('userToken');
        const savedUser = await platformStorage.getItemAsync('userData');
        
        // STRICT VALIDATION: Token must be a non-empty string and NOT garbage
        const isValidToken = 
          savedToken && 
          typeof savedToken === 'string' &&
          savedToken !== 'undefined' && 
          savedToken !== 'null' && 
          savedToken !== '[object Object]' &&
          savedToken.length > 20; // JWTs are typically long

        if (isValidToken) {
          setToken(savedToken);
          
          const isValidUser = savedUser && savedUser !== 'undefined' && savedUser !== 'null' && savedUser.startsWith('{');
          if (isValidUser) {
            try {
              setUser(JSON.parse(savedUser!));
            } catch (parseError) {
              console.error('Failed to parse saved user', parseError);
              setUser(null);
            }
          }
        } else {
          // If token looks invalid, ensure we are logged out
          await platformStorage.deleteItemAsync('userToken');
          await platformStorage.deleteItemAsync('userData');
          await platformStorage.deleteItemAsync('refreshToken');
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const mapAuthPayload = (data: any) => {
    const token = data?.access_token ?? data?.token ?? null;
    const refreshToken = data?.refresh_token ?? null;
    const userData = data?.user ?? data?.profile ?? null;
    return { token, refreshToken, userData };
  };

  const signIn = async (msisdn: string, pin: string) => {
    try {
      // Clear old session to prevent "undefined" or stale data issues
      await platformStorage.deleteItemAsync('userToken');
      await platformStorage.deleteItemAsync('userData');
      await platformStorage.deleteItemAsync('refreshToken');

      // Support both mobile and legacy auth contracts in deterministic order.
      const attempts = [
        {
          url: `${API_URL}/api/v1/mobile/auth/login`,
          body: {
            msisdn,
            pin,
            device_id: 'DEVICE-S6-ENTERPRISE',
            platform: 'android',
          },
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
          });
          const { token, refreshToken, userData } = mapAuthPayload(response.data);

          if (!token || typeof token !== 'string') {
            throw new Error('Authentication response is missing a valid token.');
          }

          await platformStorage.setItemAsync('userToken', token);
          if (refreshToken && typeof refreshToken === 'string') {
            await platformStorage.setItemAsync('refreshToken', refreshToken);
          }
          if (userData) {
            await platformStorage.setItemAsync('userData', JSON.stringify(userData));
          }

          setToken(token);
          setUser(userData ?? null);
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

      throw lastError ?? new Error('Authentication failed');
    } catch (error: any) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const signOut = async () => {
    await platformStorage.deleteItemAsync('userToken');
    await platformStorage.deleteItemAsync('userData');
    await platformStorage.deleteItemAsync('refreshToken');
    setToken(null);
    setUser(null);
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
