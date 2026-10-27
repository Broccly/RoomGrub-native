import React from 'react';
import { Linking, Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './AppNavigator';
import { getAuthBootstrap } from '../utils/authBootstrap';
import { getLastRoomId, setLastRoomId } from '../utils/lastRoom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { queryClient } from '../services/queryClient';
import { mockMembers, mockRoom, mockUser } from '../test-utils/fixtures';
import { testSafeAreaMetrics } from '../test-utils/renderWithProviders';

jest.mock('../utils/authBootstrap');
jest.mock('../hooks/useAuth');
jest.mock('../services/api');
// The app's client would leave gc timers running and keep Jest alive.
jest.mock('../services/queryClient', () => ({
  ...jest.requireActual('../services/queryClient'),
  queryClient: require('../test-utils/renderWithProviders').createTestQueryClient(),
}));
jest.mock('./BottomTabNavigator', () => {
  const { Text } = require('react-native');
  return ({ route }: any) => <Text>Inside room {route.params?.room_id}</Text>;
});

const mockedApi = api as jest.Mocked<typeof api>;

function renderApp() {
  return render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={queryClient}>
        <AppNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('AppNavigator launch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    setLastRoomId(null);
    (getAuthBootstrap as jest.Mock).mockResolvedValue({ user: mockUser });
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser, logout: jest.fn() });
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    mockedApi.listRooms.mockResolvedValue([mockRoom]);
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  it('opens the rooms list when no room was opened before', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByText(`Room #${mockRoom.id}`)).toBeTruthy());
  });

  it('reopens the last opened room', async () => {
    setLastRoomId(mockRoom.id);

    renderApp();

    await waitFor(() => expect(screen.getByText(`Inside room ${mockRoom.id}`)).toBeTruthy());
  });

  it('leaves a cold-start deep link to linking instead of reopening the room', async () => {
    setLastRoomId(mockRoom.id);
    (Linking.getInitialURL as jest.Mock).mockResolvedValue('roomgrub://invite/abc');
    mockedApi.validateInvite.mockReturnValue(new Promise(() => {}));

    renderApp();

    await waitFor(() => expect(mockedApi.validateInvite).toHaveBeenCalledWith('abc'));
    expect(screen.queryByText(`Inside room ${mockRoom.id}`)).toBeNull();
  });
});
