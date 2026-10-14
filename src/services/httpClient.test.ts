import { clearSession, request, setSession, setUnauthorizedHandler } from './httpClient';
import * as tokenStorage from '../utils/tokenStorage';
import { getAuthBootstrap, setAuthBootstrap } from '../utils/authBootstrap';

jest.mock('../utils/tokenStorage');

const mockedTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const fetchMock = () => global.fetch as jest.Mock;

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

function tokenPair(n: number) {
  return { access_token: `access-${n}`, token_type: 'bearer', expires_in: 900, refresh_token: `refresh-${n}` };
}

function callsTo(path: string) {
  return fetchMock().mock.calls.filter(([url]) => String(url).endsWith(path));
}

function bearerOf(call: unknown[]) {
  return (call[1] as { headers: Record<string, string> }).headers.Authorization;
}

describe('httpClient.request', () => {
  beforeEach(async () => {
    jest.resetAllMocks();
    await clearSession();
    jest.clearAllMocks();
    global.fetch = jest.fn();
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds URL with query params and JSON body', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ ok: true }));

    await request('/rooms/1/expenses', 'GET', { query: { limit: 10, cursor: undefined } });

    const [url] = fetchMock().mock.calls[0];
    expect(url).toBe(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1/rooms/1/expenses?limit=10`);
  });

  it('attaches the in-memory access token without touching storage', async () => {
    await setSession(tokenPair(1));
    fetchMock().mockResolvedValueOnce(jsonResponse({}));

    await request('/rooms', 'GET');

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(bearerOf(fetchMock().mock.calls[0])).toBe('Bearer access-1');
    expect(mockedTokenStorage.getRefreshToken).not.toHaveBeenCalled();
  });

  it('sends the request without a bearer when there is no session', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ id: 1 }));

    await expect(request('/invites/abc', 'GET')).resolves.toEqual({ id: 1 });

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(bearerOf(fetchMock().mock.calls[0])).toBeUndefined();
  });

  it('omits Authorization header when auth: false', async () => {
    await setSession(tokenPair(1));
    fetchMock().mockResolvedValueOnce(jsonResponse({}));

    await request('/auth/login', 'POST', { auth: false, payload: { provider: 'google', token: 'x' } });

    const [, init] = fetchMock().mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBe(JSON.stringify({ provider: 'google', token: 'x' }));
  });

  it('a 401 on an auth: false request surfaces the detail and keeps the session', async () => {
    await setSession(tokenPair(1));
    fetchMock().mockResolvedValueOnce(jsonResponse({ detail: 'Invalid Google token' }, 401));
    const handler = jest.fn();
    setUnauthorizedHandler(handler);

    await expect(
      request('/auth/login', 'POST', { auth: false, payload: { provider: 'google', token: 'x' } }),
    ).rejects.toThrow('Invalid Google token');

    expect(handler).not.toHaveBeenCalled();
    expect(mockedTokenStorage.clearRefreshToken).not.toHaveBeenCalled();
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse(null, 204));

    await expect(request('/rooms/1', 'DELETE')).resolves.toBeUndefined();
  });

  it('throws server detail message on non-OK response', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({ detail: 'Room not found' }, 404));

    await expect(request('/rooms/999', 'GET')).rejects.toThrow('Room not found');
  });

  it('throws a generic message when non-OK response has no detail', async () => {
    fetchMock().mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(request('/rooms', 'GET')).rejects.toThrow('Request failed (500)');
  });

  it('throws when the network request itself fails', async () => {
    fetchMock().mockRejectedValueOnce(new Error('network down'));

    await expect(request('/rooms', 'GET')).rejects.toThrow('Failed to reach backend');
  });

  describe('token refresh', () => {
    it('after a cold start, refreshes before the first request and stores the rotated token', async () => {
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-0');
      fetchMock()
        .mockResolvedValueOnce(jsonResponse(tokenPair(1)))
        .mockResolvedValueOnce(jsonResponse([{ id: 10 }]));

      await expect(request('/rooms', 'GET')).resolves.toEqual([{ id: 10 }]);

      const [refreshUrl, refreshInit] = fetchMock().mock.calls[0];
      expect(refreshUrl).toBe(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1/auth/refresh`);
      expect(refreshInit.body).toBe(JSON.stringify({ refresh_token: 'refresh-0' }));
      expect(refreshInit.headers.Authorization).toBeUndefined();
      expect(mockedTokenStorage.setRefreshToken).toHaveBeenCalledWith('refresh-1');
      expect(bearerOf(fetchMock().mock.calls[1])).toBe('Bearer access-1');
    });

    it('refreshes ahead of expiry instead of sending a token about to die', async () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      await setSession(tokenPair(1));
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-1');
      fetchMock().mockImplementation((url: string) =>
        Promise.resolve(jsonResponse(url.endsWith('/auth/refresh') ? tokenPair(2) : {})),
      );

      now.mockReturnValue(1_000_000 + 860_000);
      await request('/rooms', 'GET');
      expect(callsTo('/auth/refresh')).toHaveLength(0);

      now.mockReturnValue(1_000_000 + 880_000);
      await request('/rooms', 'GET');
      expect(callsTo('/auth/refresh')).toHaveLength(1);
      expect(bearerOf(callsTo('/rooms')[1])).toBe('Bearer access-2');
    });

    it('on 401 refreshes and retries the request once', async () => {
      await setSession(tokenPair(1));
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-1');
      fetchMock()
        .mockResolvedValueOnce(jsonResponse({ detail: 'Token expired' }, 401))
        .mockResolvedValueOnce(jsonResponse(tokenPair(2)))
        .mockResolvedValueOnce(jsonResponse([{ id: 10 }]));
      const handler = jest.fn();
      setUnauthorizedHandler(handler);

      await expect(request('/rooms', 'GET')).resolves.toEqual([{ id: 10 }]);

      expect(fetchMock()).toHaveBeenCalledTimes(3);
      expect(bearerOf(fetchMock().mock.calls[2])).toBe('Bearer access-2');
      expect(mockedTokenStorage.setRefreshToken).toHaveBeenLastCalledWith('refresh-2');
      expect(handler).not.toHaveBeenCalled();
    });

    it('concurrent requests share a single refresh', async () => {
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-0');
      fetchMock().mockImplementation((url: string) =>
        Promise.resolve(jsonResponse(url.endsWith('/auth/refresh') ? tokenPair(1) : {})),
      );

      await Promise.all([request('/rooms', 'GET'), request('/rooms/1/members', 'GET'), request('/rooms/1/splits', 'GET')]);

      expect(callsTo('/auth/refresh')).toHaveLength(1);
      expect(fetchMock().mock.calls.filter((call) => bearerOf(call) === 'Bearer access-1')).toHaveLength(3);
    });

    it('ends the session when the refresh token is rejected', async () => {
      setAuthBootstrap({ user: { id: 1, email: 'a@b.c', name: null, profile: null } });
      await setSession(tokenPair(1));
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-1');
      fetchMock()
        .mockResolvedValueOnce(jsonResponse({ detail: 'Token expired' }, 401))
        .mockResolvedValueOnce(jsonResponse({ detail: 'Invalid refresh token' }, 401));
      const handler = jest.fn();
      setUnauthorizedHandler(handler);

      await expect(request('/rooms', 'GET')).rejects.toThrow('Session expired');

      expect(fetchMock()).toHaveBeenCalledTimes(2);
      expect(mockedTokenStorage.clearRefreshToken).toHaveBeenCalled();
      expect(mockedTokenStorage.clearUser).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      await expect(getAuthBootstrap()).resolves.toEqual({ user: null });
    });

    it('ends the session when the retried request is still rejected, without looping', async () => {
      await setSession(tokenPair(1));
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-1');
      fetchMock().mockImplementation((url: string) =>
        Promise.resolve(url.endsWith('/auth/refresh') ? jsonResponse(tokenPair(2)) : jsonResponse({}, 401)),
      );
      const handler = jest.fn();
      setUnauthorizedHandler(handler);

      await expect(request('/rooms', 'GET')).rejects.toThrow('Session expired');

      expect(callsTo('/rooms')).toHaveLength(2);
      expect(callsTo('/auth/refresh')).toHaveLength(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('ends the session when a request with no session gets a 401', async () => {
      fetchMock().mockResolvedValueOnce(jsonResponse({ detail: 'Not authenticated' }, 401));
      const handler = jest.fn();
      setUnauthorizedHandler(handler);

      await expect(request('/rooms', 'GET')).rejects.toThrow('Session expired');

      expect(fetchMock()).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['the network is down', () => Promise.reject(new Error('network down'))],
      ['the backend errors', () => Promise.resolve(jsonResponse({}, 503))],
    ])('keeps the session when the refresh fails because %s', async (_name, refreshResult) => {
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-0');
      fetchMock().mockImplementationOnce(refreshResult);
      const handler = jest.fn();
      setUnauthorizedHandler(handler);

      await expect(request('/rooms', 'GET')).rejects.toThrow('Failed to reach backend');

      expect(fetchMock()).toHaveBeenCalledTimes(1);
      expect(handler).not.toHaveBeenCalled();
      expect(mockedTokenStorage.clearRefreshToken).not.toHaveBeenCalled();
      expect(mockedTokenStorage.clearUser).not.toHaveBeenCalled();
    });

    it('a refresh that lands after sign-out does not restore the session', async () => {
      mockedTokenStorage.getRefreshToken.mockResolvedValue('refresh-0');
      let resolveRefresh: (response: Response) => void = () => {};
      fetchMock().mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveRefresh = resolve)));

      const pending = request('/rooms', 'GET');
      const outcome = expect(pending).rejects.toThrow('Session expired');
      await new Promise((resolve) => setTimeout(resolve, 0));
      await clearSession();
      resolveRefresh(jsonResponse(tokenPair(1)));
      await outcome;

      expect(mockedTokenStorage.setRefreshToken).not.toHaveBeenCalled();
      expect(fetchMock()).toHaveBeenCalledTimes(1);
    });
  });
});
