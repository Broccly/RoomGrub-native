import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from './useAuth';
import { authApi } from '../services/authApi';
import * as tokenStorage from '../utils/tokenStorage';
import * as httpClient from '../services/httpClient';
import { __resetAuthBootstrapForTests } from '../utils/authBootstrap';

import { resetToLogin } from '../navigation/navigationRef';
import { queryClient } from '../services/queryClient';

jest.mock('../services/authApi');
jest.mock('../utils/tokenStorage');
jest.mock('../navigation/navigationRef', () => ({ resetToLogin: jest.fn() }));

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;
const mockedTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

const mockUser = { id: 1, email: 'alice@example.com', name: 'Alice', profile: null };

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetAuthBootstrapForTests();
    mockedTokenStorage.getRefreshToken.mockResolvedValue(null);
    mockedAuthApi.logout.mockResolvedValue(undefined);
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
    mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('treats a stored user without a refresh token as signed out and clears the leftovers', async () => {
    // What a build that only stored the access JWT (<= 1.0.6) leaves behind.
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockedTokenStorage.clearRefreshToken).toHaveBeenCalled();
    expect(mockedTokenStorage.clearUser).toHaveBeenCalled();
  });

  it('login persists the refresh token and user (never the access token) and updates state', async () => {
    mockedAuthApi.login.mockResolvedValue({
      access_token: 'jwt-new',
      token_type: 'bearer',
      expires_in: 900,
      refresh_token: 'refresh-new',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('google', 'id-token');
    });

    expect(mockedTokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh-new');
    expect(mockedTokenStorage.setRefreshToken).not.toHaveBeenCalledWith('jwt-new');
    expect(mockedTokenStorage.setUser).toHaveBeenCalledWith(mockUser);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('logout clears storage and state', async () => {
    mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedAuthApi.logout).toHaveBeenCalledWith('refresh-abc');
    expect(mockedTokenStorage.clearRefreshToken).toHaveBeenCalled();
    expect(mockedTokenStorage.clearUser).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout still signs out locally when revoking the session on the backend fails', async () => {
    mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);
    mockedAuthApi.logout.mockRejectedValue(new Error('Failed to reach backend'));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockedTokenStorage.clearRefreshToken).toHaveBeenCalled();
    expect(resetToLogin).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout navigates to Login and leaves clearing the query cache to LoginScreen', async () => {
    const clearSpy = jest.spyOn(queryClient, 'clear');
    mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-abc');
    mockedTokenStorage.getUser.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(resetToLogin).toHaveBeenCalledTimes(1);
    expect(clearSpy).not.toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('clears the user when a request receives a 401', async () => {
    mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-abc');
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
    mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-abc');
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
