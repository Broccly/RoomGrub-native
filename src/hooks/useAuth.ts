import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/httpClient';
import * as tokenStorage from '../utils/tokenStorage';
import { StoredUser } from '../utils/tokenStorage';
import { getAuthBootstrap, setAuthBootstrap } from '../utils/authBootstrap';

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
    return result.user;
  }, []);

  const logout = useCallback(async () => {
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
