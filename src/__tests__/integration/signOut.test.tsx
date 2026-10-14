import React, { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from '../../screens/LoginScreen';
import RoomsListScreen from '../../screens/RoomsListScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import AuthCallbackScreen from '../../screens/AuthCallbackScreen';
import { RoomProvider } from '../../context/RoomContext';
import { navigationRef } from '../../navigation/navigationRef';
import { queryClient } from '../../services/queryClient';
import * as tokenStorage from '../../utils/tokenStorage';
import { __resetAuthBootstrapForTests } from '../../utils/authBootstrap';
import { mockMembers, mockRoom } from '../../test-utils/fixtures';
import { testSafeAreaMetrics } from '../../test-utils/renderWithProviders';

// Real useAuth, httpClient, React Query client and navigation; only storage
// and the network (fetch) are faked. Guards against sign-out navigating to
// Login more than once, which shows up on device as the screen "shaking".
jest.mock('../../utils/tokenStorage');

const mockedTokenStorage = tokenStorage as jest.Mocked<typeof tokenStorage>;
const Stack = createNativeStackNavigator();
const alice = { id: 1, email: 'alice@example.com', name: 'Alice', profile: null };

let loginMounts = 0;
function CountingLogin(props: any) {
  useEffect(() => {
    loginMounts += 1;
  }, []);
  return <LoginScreen {...props} />;
}

function jsonResponse(body: unknown, status = 200) {
  return { status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) } as Response;
}

const fetchMock = jest.fn((url: string, init: RequestInit) => {
  const headers = init.headers as Record<string, string>;
  if (url.endsWith('/auth/refresh')) {
    return Promise.resolve(
      jsonResponse({ access_token: 'jwt-abc', token_type: 'bearer', expires_in: 900, refresh_token: 'refresh-next' }),
    );
  }
  if (url.endsWith('/auth/logout')) return Promise.resolve(jsonResponse(null, 204));
  if (!headers.Authorization) return Promise.resolve(jsonResponse({ detail: 'Not authenticated' }, 401));
  if (url.endsWith('/rooms')) return Promise.resolve(jsonResponse([mockRoom]));
  if (url.endsWith('/members')) return Promise.resolve(jsonResponse(mockMembers));
  return Promise.resolve(jsonResponse({}));
});

function renderApp() {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer ref={navigationRef}>
          <RoomProvider initialRoomId={10}>
            <Stack.Navigator initialRouteName="RoomsList">
              <Stack.Screen name="Login" component={CountingLogin} />
              <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
              <Stack.Screen name="RoomsList" component={RoomsListScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="RoomHome">{() => null}</Stack.Screen>
              <Stack.Screen name="CreateRoom">{() => null}</Stack.Screen>
            </Stack.Navigator>
          </RoomProvider>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('manual sign-out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loginMounts = 0;
    queryClient.clear();
    __resetAuthBootstrapForTests();
    let token: string | null = 'refresh-abc';
    let user: typeof alice | null = alice;
    mockedTokenStorage.getRefreshToken.mockImplementation(async () => token);
    mockedTokenStorage.setRefreshToken.mockImplementation(async (next) => {
      token = next;
    });
    mockedTokenStorage.getUser.mockImplementation(async () => user);
    mockedTokenStorage.clearRefreshToken.mockImplementation(async () => {
      token = null;
    });
    mockedTokenStorage.clearUser.mockImplementation(async () => {
      user = null;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    // The shared client schedules 24h gc timers; drop them so Jest can exit.
    queryClient.clear();
  });

  // The /auth/* endpoints are public and never carry a bearer.
  function unauthenticatedRequests() {
    return fetchMock.mock.calls.filter(
      ([url, init]) => !url.includes('/auth/') && !(init.headers as Record<string, string>).Authorization,
    );
  }

  it('from Settings lands on Login exactly once, with no requests after credentials are cleared', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText('Room #10')).toBeTruthy());

    act(() => {
      (navigationRef as any).navigate('Settings', { room_id: 10 });
    });
    await waitFor(() => expect(screen.getByText('Sign Out')).toBeTruthy());

    fireEvent.press(screen.getByText('Sign Out'));

    await waitFor(() => expect(screen.getByText('Continue with Google')).toBeTruthy());
    // Let any stray refetches and their 401 handling settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(unauthenticatedRequests()).toEqual([]);
    expect(loginMounts).toBe(1);
  });

  it('from the Rooms list icon lands on Login exactly once', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText('Room #10')).toBeTruthy());

    fireEvent.press(screen.getByLabelText('Sign out'));

    await waitFor(() => expect(screen.getByText('Continue with Google')).toBeTruthy());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(unauthenticatedRequests()).toEqual([]);
    expect(loginMounts).toBe(1);
  });
});
