import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AppNavigator from './src/navigation/AppNavigator';
import { queryClient } from './src/services/queryClient';
import { queryPersister } from './src/services/queryPersister';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
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
