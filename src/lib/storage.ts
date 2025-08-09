import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Storage for non-sensitive data using AsyncStorage (Expo Go compatible)
export const storage = {
  getString: async (key: string): Promise<string | undefined> => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ?? undefined;
    } catch {
      return undefined;
    }
  },
  
  set: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  
  delete: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

// Secure storage for sensitive data
export const secureStorage = {
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  
  async getItem(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  },
  
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  }
};

// Storage utilities with type safety
export const createStorageItem = <T>(key: string, defaultValue: T) => ({
  get: async (): Promise<T> => {
    const value = await storage.getString(key);
    return value ? JSON.parse(value) : defaultValue;
  },
  
  set: async (value: T): Promise<void> => {
    await storage.set(key, JSON.stringify(value));
  },
  
  remove: async (): Promise<void> => {
    await storage.delete(key);
  }
});