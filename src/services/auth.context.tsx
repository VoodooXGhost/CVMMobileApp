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
        
        console.log('--- Auth Initialization ---');
        console.log('Saved Token:', savedToken);
        
        // STRICT VALIDATION: Token must be a non-empty string and NOT garbage
        const isValidToken = 
          savedToken && 
          typeof savedToken === 'string' &&
          savedToken !== 'undefined' && 
          savedToken !== 'null' && 
          savedToken !== '[object Object]' &&
          savedToken.length > 20; // JWTs are typically long

        if (isValidToken) {
          console.log('Token validated. User authenticated.');
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
          console.log('Token invalid or missing. Forcing logout state.');
          // If token looks invalid, ensure we are logged out
          await platformStorage.deleteItemAsync('userToken');
          await platformStorage.deleteItemAsync('userData');
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

  const signIn = async (msisdn: string, pin: string) => {
    try {
      // Clear old session to prevent "undefined" or stale data issues
      await platformStorage.deleteItemAsync('userToken');
      await platformStorage.deleteItemAsync('userData');
      await platformStorage.deleteItemAsync('refreshToken');
      
      // Option A: Mobile-first MSISDN + PIN auth
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
    } catch (error: any) {
      console.error('Login failed', error);
      if (error.response && error.response.data) {
        console.log('CRITICAL BACKEND ERROR:', JSON.stringify(error.response.data, null, 2));
      }
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
