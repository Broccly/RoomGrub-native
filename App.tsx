import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AppNavigator from './src/navigation/AppNavigator';
import { queryClient } from './src/services/queryClient';
import { queryPersister } from './src/services/queryPersister';
import {
  listenForForegroundMessages,
  listenForTokenRefresh,
  syncPushToken,
} from './src/services/pushNotifications';
import { listenForAppUpdates } from './src/services/appUpdates';
import { getAuthBootstrap } from './src/utils/authBootstrap';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    // Returning users: re-register every launch (the backend upserts). New
    // users are registered from useAuth.login() instead.
    getAuthBootstrap().then(({ user }) => {
      if (user) syncPushToken();
    });
    const stopForeground = listenForForegroundMessages();
    const stopRefresh = listenForTokenRefresh();
    const stopAppUpdates = listenForAppUpdates();
    return () => {
      stopForeground();
      stopRefresh();
      stopAppUpdates();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: Infinity }}
    >
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}
