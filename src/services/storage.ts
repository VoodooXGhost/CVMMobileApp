import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { runtimeConfig } from '../config/runtime';

/**
 * Enterprise-grade platform storage.
 * Resolves to the browser's localStorage for web testing,
 * stores auth tokens securely on native, and keeps larger non-sensitive
 * app state in a small JSON file so we do not hit SecureStore size limits.
 */
const SECURE_KEYS = new Set(['userToken', 'refreshToken']);
const FILE_STORE_NAME = 'tmcel-platform-storage.json';

const getFileStorePath = () => {
  const baseDirectory = (FileSystem as any).documentDirectory;
  if (!baseDirectory) return null;
  return `${baseDirectory}${FILE_STORE_NAME}`;
};

const readFileStore = async (): Promise<Record<string, string>> => {
  const path = getFileStorePath();
  if (!path) return {};
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const writeFileStore = async (nextStore: Record<string, string>) => {
  const path = getFileStorePath();
  if (!path) return;
  try {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(nextStore), {
      encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8',
    });
  } catch (_error) {
    // File-backed storage is best-effort for non-sensitive app state.
  }
};

export const platformStorage = {
  getItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    }
    if (SECURE_KEYS.has(key)) {
      try {
        const secureValue = await SecureStore.getItemAsync(key);
        if (secureValue != null) {
          return secureValue;
        }
      } catch (_error) {
        if (runtimeConfig.profile === 'prod') {
          return null;
        }
      }
      const store = await readFileStore();
      return store[key] ?? null;
    }
    const store = await readFileStore();
    return store[key] ?? null;
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
    if (SECURE_KEYS.has(key)) {
      try {
        return await SecureStore.setItemAsync(key, value);
      } catch (_error) {
        if (runtimeConfig.profile === 'prod') {
          throw _error;
        }
        const store = await readFileStore();
        store[key] = value;
        return writeFileStore(store);
      }
    }
    const store = await readFileStore();
    store[key] = value;
    return writeFileStore(store);
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
    if (SECURE_KEYS.has(key)) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (_error) {
        // Best-effort clean-up: fall back to the file store below when native secure storage fails.
      }
      if (runtimeConfig.profile === 'prod') {
        return;
      }
    }
    const store = await readFileStore();
    if (Object.prototype.hasOwnProperty.call(store, key)) {
      delete store[key];
      await writeFileStore(store);
    }
  }
};
