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
        if (savedToken) {
          setToken(savedToken);
          setUser(savedUser ? JSON.parse(savedUser) : null);
        }
      } catch (e) {
        console.error('Failed to load token', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  const signIn = async (msisdn: string, pin: string) => {
    try {
      // Option A: Mobile-first MSISDN + PIN auth via RS256-secured mobile BFF endpoint.
      // The backend returns snake_case tokens (access_token / refresh_token).
      const response = await axios.post(`${API_URL}/api/v1/mobile/auth/login`, {
        msisdn,
        pin,
        device_id: 'DEVICE-S6-ENTERPRISE', // Demo device identifier
        platform: 'android',
      });

      // Map snake_case backend response → local camelCase state
      const { access_token, refresh_token, user: userData } = response.data;

      await platformStorage.setItemAsync('userToken', access_token);
      await platformStorage.setItemAsync('refreshToken', refresh_token);
      await platformStorage.setItemAsync('userData', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const signOut = async () => {
    await platformStorage.deleteItemAsync('userToken');
    await platformStorage.deleteItemAsync('userData');
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
