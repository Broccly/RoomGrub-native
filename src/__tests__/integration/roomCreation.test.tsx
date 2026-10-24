import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import RoomsListScreen from '../../screens/RoomsListScreen';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { mockRoom } from '../../test-utils/fixtures';
import { createTestQueryClient } from '../../test-utils/renderWithProviders';

// Exercises real cross-screen navigation from RoomsListScreen; only the
// network boundary (api.ts) is mocked.
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
          <Stack.Screen name="RoomHome">
            {({ route }: any) => <Text>Opened room {route.params.room_id}</Text>}
          </Stack.Screen>
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
    mockedApi.createRoom.mockResolvedValue({ id: 20, members: 1, admin: 'alice@example.com' });
  });

  it('creates a room straight from the New Room button and opens it', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByText('Room #10')).toBeTruthy());

    fireEvent.press(screen.getByText('New Room'));
    fireEvent.press(screen.getByText('New Room'));

    await waitFor(() => expect(screen.getByText('Opened room 20')).toBeTruthy());
    expect(mockedApi.createRoom).toHaveBeenCalledTimes(1);
  });

  it('draws each room\'s avatars from member_preview, without fetching members', async () => {
    mockedApi.listRooms.mockResolvedValue([
      {
        ...mockRoom,
        members: 6,
        member_preview: [
          { profile: 'https://example.com/alice.png', label: 'Alice' },
          { profile: null, label: 'bob@example.com' },
          { profile: null, label: 'Carol' },
          { profile: null, label: 'Dan' },
        ],
      },
    ]);
    renderApp();

    await waitFor(() => expect(screen.getByText('Room #10')).toBeTruthy());
    // A photo where there is one, initials from the label otherwise.
    expect(screen.UNSAFE_getAllByType(Image).map((img) => img.props.source)).toEqual([
      { uri: 'https://example.com/alice.png' },
    ]);
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    // 6 members, 4 avatars shown.
    expect(screen.getByText('+2')).toBeTruthy();
    expect(mockedApi.listMembers).not.toHaveBeenCalled();
  });
});
