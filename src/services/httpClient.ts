import { getRefreshToken, setRefreshToken, clearRefreshToken, clearUser } from '../utils/tokenStorage';
import { setAuthBootstrap } from '../utils/authBootstrap';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 15000;
// Refresh this long before the access token expires, so it outlives the request it is attached to.
const EXPIRY_MARGIN_MS = 30000;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  query?: Query;
  payload?: unknown;
  /** Set false for endpoints that must not attach a bearer token (e.g. login). */
  auth?: boolean;
};

type SessionTokens = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
};

// The access token is never persisted: it lives here and is re-derived from
// the stored refresh token after a cold start.
let accessToken: string | null = null;
let accessTokenExpiresAt = 0;
let refreshing: Promise<string | null> | null = null;
// Bumped on every clearSession() so a refresh that lands after sign-out is dropped.
let sessionEpoch = 0;

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function setSession(tokens: SessionTokens): Promise<void> {
  accessToken = tokens.access_token;
  accessTokenExpiresAt = Date.now() + tokens.expires_in * 1000;
  await setRefreshToken(tokens.refresh_token);
}

export async function clearSession(): Promise<void> {
  sessionEpoch += 1;
  accessToken = null;
  await clearRefreshToken();
  await clearUser();
  // Screens mounted after this (e.g. Login) read auth state from the cached
  // bootstrap — leaving the old user there bounces them straight back into
  // AuthCallback and loops until the app is killed.
  setAuthBootstrap({ user: null });
}

async function send(
  path: string,
  method: Method,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }

  const url = new URL(`${API_BASE_URL}/api/v1${path}`);
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url.toString(), {
      method,
      headers,
      body: options.payload !== undefined ? JSON.stringify(options.payload) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error('Failed to reach backend');
  } finally {
    clearTimeout(timeoutId);
  }
}

// Trades the stored refresh token for a new pair. Resolves to null when there
// is no session or the backend rejects the token; throws when the backend
// can't be reached, which must not sign the user out. The backend rotates the
// refresh token on every call, so concurrent callers share one request.
function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    const epoch = sessionEpoch;
    refreshing = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await send('/auth/refresh', 'POST', { payload: { refresh_token: refreshToken } }, null);
      if (response.status === 401) return null;
      if (!response.ok) throw new Error('Failed to reach backend');

      const tokens = (await response.json()) as SessionTokens;
      if (epoch !== sessionEpoch) throw new Error('Session expired');
      await setSession(tokens);
      return tokens.access_token;
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < accessTokenExpiresAt - EXPIRY_MARGIN_MS) return accessToken;
  return refreshAccessToken();
}

export async function request<T>(
  path: string,
  method: Method,
  options: RequestOptions = {},
): Promise<T> {
  const authenticated = options.auth !== false;
  const epoch = sessionEpoch;
  let token = authenticated ? await getAccessToken() : null;
  let response = await send(path, method, options, token);

  if (authenticated && response.status === 401) {
    // Signed out (and maybe in as someone else) while this was in flight:
    // neither replay it under the new session nor tear that session down.
    if (epoch !== sessionEpoch) throw new Error('Session expired');
    if (token) {
      // Unless a concurrent request already replaced it, the token we sent is dead.
      if (accessToken === token) accessToken = null;
      token = await getAccessToken();
      if (token) response = await send(path, method, options, token);
    }
    if (!token || response.status === 401) {
      await clearSession();
      onUnauthorized?.();
      throw new Error('Session expired');
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // No JSON body (e.g. some error responses) — fall through to status check below.
  }

  if (!response.ok) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : `Request failed (${response.status})`;
    throw new Error(detail);
  }

  return data as T;
}
