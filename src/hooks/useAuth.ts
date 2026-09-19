import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/httpClient';
import * as tokenStorage from '../utils/tokenStorage';
import { StoredUser } from '../utils/tokenStorage';
import { getAuthBootstrap, setAuthBootstrap } from '../utils/authBootstrap';
import { resetToLogin } from '../navigation/navigationRef';
import { queryClient } from '../services/queryClient';
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
      queryClient.clear();
      resetToLogin();
    });

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (provider: 'google' | 'facebook', providerToken: string) => {
    const result = await authApi.login(provider, providerToken);
    await tokenStorage.setToken(result.access_token);
    await tokenStorage.setUser(result.user);
    setAuthBootstrap({ token: result.access_token, user: result.user });
    setUser(result.user);
    syncPushToken();
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    // Needs the JWT, so it must run before clearToken().
    await unregisterPushToken();
    if (Platform.OS !== 'web') {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
      } catch {
        // best-effort — don't block local logout if the native SDK isn't signed in
      }
    }
    await tokenStorage.clearToken();
    await tokenStorage.clearUser();
    setAuthBootstrap({ token: null, user: null });
    queryClient.clear();
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
