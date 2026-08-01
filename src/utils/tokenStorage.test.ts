import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearToken, clearUser, getToken, getUser, setToken, setUser, StoredUser } from './tokenStorage';

const mockUser: StoredUser = { id: 1, email: 'alice@example.com', name: 'Alice', profile: null };

describe('tokenStorage on native', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'android';
  });

  it('setToken/getToken use SecureStore', async () => {
    await setToken('jwt-abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('roomgrub_jwt', 'jwt-abc');

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('jwt-abc');
    await expect(getToken()).resolves.toBe('jwt-abc');
  });

  it('clearToken/clearUser delete from SecureStore', async () => {
    await clearToken();
    await clearUser();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('roomgrub_jwt');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('roomgrub_user');
  });

  it('setUser/getUser round-trip JSON via SecureStore', async () => {
    await setUser(mockUser);
    const storedValue = (SecureStore.setItemAsync as jest.Mock).mock.calls[0][1];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedValue);

    await expect(getUser()).resolves.toEqual(mockUser);
  });

  it('getUser returns null on malformed JSON', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('not-json');
    await expect(getUser()).resolves.toBeNull();
  });
});

describe('tokenStorage on web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'web';
  });

  afterAll(() => {
    (Platform as any).OS = 'android';
  });

  it('setToken/getToken use AsyncStorage', async () => {
    await setToken('jwt-web');
    await expect(getToken()).resolves.toBe('jwt-web');
    expect(await AsyncStorage.getItem('roomgrub_jwt')).toBe('jwt-web');
  });
});
