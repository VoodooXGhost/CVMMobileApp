import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface AuthContextType {
  token: string | null;
  user: any | null;
  signIn: (username: string, password: string) => Promise<void>;
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
        const savedToken = await SecureStore.getItemAsync('userToken');
        const savedUser = await SecureStore.getItemAsync('userData');
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

  const signIn = async (username: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      await SecureStore.setItemAsync('userToken', access_token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
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
