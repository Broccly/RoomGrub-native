import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearRefreshToken, clearUser, getRefreshToken, getUser, setRefreshToken, setUser, StoredUser } from './tokenStorage';

const mockUser: StoredUser = { id: 1, email: 'alice@example.com', name: 'Alice', profile: null };

describe('tokenStorage on native', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'android';
  });

  it('setRefreshToken/getRefreshToken use SecureStore', async () => {
    await setRefreshToken('refresh-abc');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('roomgrub_refresh_token', 'refresh-abc');

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('refresh-abc');
    await expect(getRefreshToken()).resolves.toBe('refresh-abc');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('roomgrub_refresh_token');
  });

  it('clearRefreshToken/clearUser delete from SecureStore', async () => {
    await clearRefreshToken();
    await clearUser();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('roomgrub_refresh_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('roomgrub_user');
  });

  it('clearRefreshToken also removes the JWT stored by builds before refresh tokens', async () => {
    await clearRefreshToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('roomgrub_jwt');
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

  it('setRefreshToken/getRefreshToken use AsyncStorage', async () => {
    await setRefreshToken('refresh-web');
    await expect(getRefreshToken()).resolves.toBe('refresh-web');
    expect(await AsyncStorage.getItem('roomgrub_refresh_token')).toBe('refresh-web');
  });
});
