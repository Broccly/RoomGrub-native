import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import RoomsListScreen from '../../screens/RoomsListScreen';
import CreateRoomScreen from '../../screens/CreateRoomScreen';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { mockMembers, mockRoom } from '../../test-utils/fixtures';
import { createTestQueryClient } from '../../test-utils/renderWithProviders';

// Exercises real cross-screen navigation and RoomsListScreen/CreateRoomScreen
// wiring together; only the network boundary (api.ts) is mocked.
jest.mock('../../hooks/useAuth');
jest.mock('../../services/api');

const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;
const Stack = createNativeStackNavigator();

function renderApp() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="RoomsList">
          <Stack.Screen name="RoomsList" component={RoomsListScreen} />
          <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
          <Stack.Screen name="RoomHome">{() => null}</Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

describe('room creation flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({
      user: { id: 1, email: 'alice@example.com', name: 'Alice', profile: null },
      logout: jest.fn(),
    });
    mockedApi.listRooms.mockResolvedValue([mockRoom]);
    mockedApi.listMembers.mockResolvedValue(mockMembers);
    mockedApi.createRoom.mockResolvedValue({ id: 20, members: 1, admin: 'alice@example.com' });
  });

  it('lists the existing room, then creates a new one from CreateRoomScreen', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByText('Room #10')).toBeTruthy());

    fireEvent.press(screen.getByText('New Room'));
    await waitFor(() => expect(screen.getByText('Create Your First Room')).toBeTruthy());

    fireEvent.press(screen.getByText('Create New Room'));

    await waitFor(() => expect(mockedApi.createRoom).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Create Your First Room')).toBeNull());
  });
});
