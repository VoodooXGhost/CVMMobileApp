import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Enterprise-grade platform storage.
 * Resolves to the browser's localStorage for web testing,
 * and securely to Expo SecureStore on Native mobile apps.
 */
export const platformStorage = {
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        return;
      }
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
        return;
      } catch (e) {
        return;
      }
    }
    return SecureStore.deleteItemAsync(key);
  }
};
