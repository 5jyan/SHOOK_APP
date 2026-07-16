import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = '@device_id';
export const E2E_DEVICE_ID = 'shook-e2e-device';

export function isE2EMode(): boolean {
  return Constants.expoConfig?.extra?.isE2E === true;
}

export async function getOrCreateDeviceId(): Promise<string> {
  if (isE2EMode()) {
    await AsyncStorage.setItem(DEVICE_ID_KEY, E2E_DEVICE_ID);
    return E2E_DEVICE_ID;
  }

  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) {
    return stored;
  }

  const deviceId = uuidv4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
