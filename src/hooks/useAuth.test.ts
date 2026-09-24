import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from './useAuth';
import { authApi } from '../services/authApi';
import * as tokenStorage from '../utils/tokenStorage';
import * as httpClient from '../services/httpClient';
import { __resetAuthBootstrapForTests } from '../utils/authBootstrap';

jest.mock('../services/authApi');
jest.mock('../utils/tokenStorage');

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockedTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

const mockUser = { id: 1, email: 'alice@example.com', name: 'Alice', profile: null };

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAuthBootstrapForTests();
    mockedTokenStorage.getToken.mockResolvedValue(null);
    mockedTokenStorage.getUser.mockResolvedValue(null);
  });

  it('starts loading, then resolves unauthenticated when no stored session', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('restores an existing session from storage', async () => {
    mockedTokenStorage.getToken.mockResolvedValue('jwt-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('login persists token/user and updates state', async () => {
    mockedAuthApi.login.mockResolvedValue({ access_token: 'jwt-new', token_type: 'bearer', user: mockUser });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('google', 'id-token');
    });

    expect(mockedTokenStorage.setToken).toHaveBeenCalledWith('jwt-new');
    expect(mockedTokenStorage.setUser).toHaveBeenCalledWith(mockUser);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears storage and state', async () => {
    mockedTokenStorage.getToken.mockResolvedValue('jwt-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedTokenStorage.clearToken).toHaveBeenCalled();
    expect(mockedTokenStorage.clearUser).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('clears the user when a request receives a 401', async () => {
    mockedTokenStorage.getToken.mockResolvedValue('jwt-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await httpClient.request('/rooms', 'GET').catch(() => undefined);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('a screen mounted after a 401 (e.g. Login) sees the user as signed out', async () => {
    mockedTokenStorage.getToken.mockResolvedValue('jwt-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);
    global.fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: () => Promise.resolve({}),
    } as Response);

    const first = renderHook(() => useAuth());
    await waitFor(() => expect(first.result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await httpClient.request('/rooms', 'GET').catch(() => undefined);
    });

    const next = renderHook(() => useAuth());
    await waitFor(() => expect(next.result.current.loading).toBe(false));

    expect(next.result.current.user).toBeNull();
    expect(next.result.current.isAuthenticated).toBe(false);
  });
});
