import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'roomgrub_jwt';
const USER_KEY = 'roomgrub_user';

export type StoredUser = {
  id: number;
  email: string;
  name: string | null;
  profile: string | null;
};

async function getItem(key: string): Promise<string | null> {
  return Platform.OS === 'web'
    ? AsyncStorage.getItem(key)
    : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  await (Platform.OS === 'web'
    ? AsyncStorage.setItem(key, value)
    : SecureStore.setItemAsync(key, value));
}

async function deleteItem(key: string): Promise<void> {
  await (Platform.OS === 'web'
    ? AsyncStorage.removeItem(key)
    : SecureStore.deleteItemAsync(key));
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await deleteItem(TOKEN_KEY);
}

export async function getUser(): Promise<StoredUser | null> {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function setUser(user: StoredUser): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await deleteItem(USER_KEY);
}
