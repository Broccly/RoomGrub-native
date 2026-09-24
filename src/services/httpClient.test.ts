import { request, setUnauthorizedHandler } from './httpClient';
import * as tokenStorage from '../utils/tokenStorage';
import { getAuthBootstrap, setAuthBootstrap } from '../utils/authBootstrap';

jest.mock('../utils/tokenStorage');

const mockedTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('httpClient.request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    setUnauthorizedHandler(null);
  });

  it('builds URL with query params and JSON body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ ok: true }));
    mockedTokenStorage.getToken.mockResolvedValueOnce(null);

    await request('/rooms/1/expenses', 'GET', { query: { limit: 10, cursor: undefined } });

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/v1/rooms/1/expenses?limit=10`);
  });

  it('attaches Authorization header when a token exists and auth is not disabled', async () => {
    mockedTokenStorage.getToken.mockResolvedValueOnce('jwt-abc');
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}));

    await request('/rooms', 'GET');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer jwt-abc');
  });

  it('omits Authorization header when auth: false', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}));

    await request('/auth/login', 'POST', { auth: false, payload: { provider: 'google', token: 'x' } });

    expect(mockedTokenStorage.getToken).not.toHaveBeenCalled();
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.body).toBe(JSON.stringify({ provider: 'google', token: 'x' }));
  });

  it('clears token/user and calls onUnauthorized on 401', async () => {
    mockedTokenStorage.getToken.mockResolvedValueOnce('stale-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}, 401));
    const handler = jest.fn();
    setUnauthorizedHandler(handler);

    await expect(request('/rooms', 'GET')).rejects.toThrow('Session expired');

    expect(mockedTokenStorage.clearToken).toHaveBeenCalled();
    expect(mockedTokenStorage.clearUser).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });

  it('resets the cached auth bootstrap on 401', async () => {
    setAuthBootstrap({ token: 'stale-token', user: { id: 1, email: 'a@b.c', name: null, profile: null } });
    mockedTokenStorage.getToken.mockResolvedValueOnce('stale-token');
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}, 401));

    await expect(request('/rooms', 'GET')).rejects.toThrow('Session expired');

    await expect(getAuthBootstrap()).resolves.toEqual({ token: null, user: null });
  });

  it('returns undefined for 204 responses', async () => {
    mockedTokenStorage.getToken.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse(null, 204));

    await expect(request('/rooms/1', 'DELETE')).resolves.toBeUndefined();
  });

  it('throws server detail message on non-OK response', async () => {
    mockedTokenStorage.getToken.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({ detail: 'Room not found' }, 404));

    await expect(request('/rooms/999', 'GET')).rejects.toThrow('Room not found');
  });

  it('throws a generic message when non-OK response has no detail', async () => {
    mockedTokenStorage.getToken.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(request('/rooms', 'GET')).rejects.toThrow('Request failed (500)');
  });

  it('throws when the network request itself fails', async () => {
    mockedTokenStorage.getToken.mockResolvedValueOnce(null);
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network down'));

    await expect(request('/rooms', 'GET')).rejects.toThrow('Failed to reach backend');
  });
});
