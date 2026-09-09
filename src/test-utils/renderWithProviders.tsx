import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RoomProvider } from '../context/RoomContext';

export const testSafeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Options = {
  roomId?: number | null;
};

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: React.ReactElement, { roomId = 10 }: Options = {}) {
  const queryClient = createTestQueryClient();
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RoomProvider initialRoomId={roomId}>{ui}</RoomProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

export function makeNavigationMock() {
  return {
    navigate: jest.fn(),
    replace: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };
}
