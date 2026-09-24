import { getToken, clearToken, clearUser } from '../utils/tokenStorage';
import { setAuthBootstrap } from '../utils/authBootstrap';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 15000;

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  query?: Query;
  payload?: unknown;
  /** Set false for endpoints that must not attach a bearer token (e.g. login). */
  auth?: boolean;
};

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export async function request<T>(
  path: string,
  method: Method,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured');
  }

  const url = new URL(`${API_BASE_URL}/api/v1${path}`);
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
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

  if (response.status === 401) {
    await clearToken();
    await clearUser();
    // Screens mounted after this (e.g. Login) read auth state from the cached
    // bootstrap — leaving the old user there bounces them straight back into
    // AuthCallback and loops until the app is killed.
    setAuthBootstrap({ token: null, user: null });
    onUnauthorized?.();
    throw new Error('Session expired');
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
