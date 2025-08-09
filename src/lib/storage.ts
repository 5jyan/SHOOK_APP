import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';

// Ultra-fast storage for non-sensitive data
export const storage = new MMKV();

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
  get: (): T => {
    const value = storage.getString(key);
    return value ? JSON.parse(value) : defaultValue;
  },
  
  set: (value: T) => {
    storage.set(key, JSON.stringify(value));
  },
  
  remove: () => {
    storage.delete(key);
  }
});