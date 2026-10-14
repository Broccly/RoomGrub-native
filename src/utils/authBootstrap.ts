import * as tokenStorage from './tokenStorage';
import { StoredUser } from './tokenStorage';

export type AuthBootstrapResult = {
  user: StoredUser | null;
};

let bootstrapPromise: Promise<AuthBootstrapResult> | null = null;

// Reads the stored session exactly once per app session and caches the
// result so AppNavigator's cold-start check and useAuth's own effect don't
// each hit storage separately (that duplicate read was the second spinner).
export function getAuthBootstrap(): Promise<AuthBootstrapResult> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const [refreshToken, user] = await Promise.all([
        tokenStorage.getRefreshToken(),
        tokenStorage.getUser(),
      ]);
      if (!refreshToken) {
        // No session: drop leftovers, e.g. the user and JWT a pre-refresh-token
        // build (<= 1.0.6) left behind.
        await Promise.all([tokenStorage.clearRefreshToken(), tokenStorage.clearUser()]).catch(() => {});
        return { user: null };
      }
      return { user };
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
