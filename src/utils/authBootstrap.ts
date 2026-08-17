import * as tokenStorage from './tokenStorage';
import { StoredUser } from './tokenStorage';

export type AuthBootstrapResult = {
  token: string | null;
  user: StoredUser | null;
};

let bootstrapPromise: Promise<AuthBootstrapResult> | null = null;

// Reads the stored token/user exactly once per app session and caches the
// result so AppNavigator's cold-start check and useAuth's own effect don't
// each hit storage separately (that duplicate read was the second spinner).
export function getAuthBootstrap(): Promise<AuthBootstrapResult> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const [token, user] = await Promise.all([tokenStorage.getToken(), tokenStorage.getUser()]);
      return { token, user: token && user ? user : null };
    })();
  }
  return bootstrapPromise;
}

export function setAuthBootstrap(result: AuthBootstrapResult) {
  bootstrapPromise = Promise.resolve(result);
}

// Test-only: force the next getAuthBootstrap() call to re-read storage.
export function __resetAuthBootstrapForTests() {
  bootstrapPromise = null;
}
