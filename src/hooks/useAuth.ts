import { useCallback, useEffect, useState } from 'react';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/httpClient';
import * as tokenStorage from '../utils/tokenStorage';
import { StoredUser } from '../utils/tokenStorage';

export function useAuth() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [token, storedUser] = await Promise.all([
        tokenStorage.getToken(),
        tokenStorage.getUser(),
      ]);
      if (!mounted) return;
      setUser(token && storedUser ? storedUser : null);
      setLoading(false);
    })();

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
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await tokenStorage.clearToken();
    await tokenStorage.clearUser();
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
