import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authApi } from '../services/authApi';
import { clearSession, setSession, setUnauthorizedHandler } from '../services/httpClient';
import * as tokenStorage from '../utils/tokenStorage';
import { StoredUser } from '../utils/tokenStorage';
import { getAuthBootstrap, setAuthBootstrap } from '../utils/authBootstrap';
import { resetToLogin } from '../navigation/navigationRef';
import { syncPushToken, unregisterPushToken } from '../services/pushNotifications';

export function useAuth() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getAuthBootstrap().then(({ user: storedUser }) => {
      if (!mounted) return;
      setUser(storedUser);
      setLoading(false);
    });

    setUnauthorizedHandler(() => {
      if (mounted) setUser(null);
      resetToLogin();
    });

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (provider: 'google' | 'facebook', providerToken: string) => {
    const result = await authApi.login(provider, providerToken);
    await setSession(result);
    await tokenStorage.setUser(result.user);
    setAuthBootstrap({ user: result.user });
    setUser(result.user);
    syncPushToken();
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    // Authenticated, so it must run before the session is cleared.
    await unregisterPushToken();
    if (Platform.OS !== 'web') {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch {
        // best-effort — don't block local logout if the native SDK isn't signed in
      }
    }
    // Revoke this device's session on the backend; local sign-out doesn't wait for it.
    const refreshToken = await tokenStorage.getRefreshToken().catch(() => null);
    if (refreshToken) authApi.logout(refreshToken).catch(() => {});
    await clearSession();
    // LoginScreen clears the query cache once it mounts, after the signed-in
    // screens (and their queries) have unmounted.
    resetToLogin();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
  };
}
