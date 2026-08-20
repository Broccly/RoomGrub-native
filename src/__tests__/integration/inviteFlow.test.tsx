import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import InviteMemberScreen from '../../screens/InviteMemberScreen';
import InviteAcceptScreen from '../../screens/InviteAcceptScreen';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { RoomProvider } from '../../context/RoomContext';
import { createTestQueryClient } from '../../test-utils/renderWithProviders';

// Generates an invite token via InviteMemberScreen, then feeds that same
// token into InviteAcceptScreen (as a deep link would) and accepts it —
// verifying the two screens agree on the invite payload shape through the
// shared (mocked) api boundary.
jest.mock('../../hooks/useAuth');
jest.mock('../../services/api');

const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;
const Stack = createNativeStackNavigator();

describe('invite flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
  });

  it('generates a link in InviteMemberScreen and accepts it in InviteAcceptScreen', async () => {
    mockedApi.createInvite.mockResolvedValue({
      token: 'shared-token',
      room_id: 10,
      invited_by_email: 'alice@example.com',
      days_left: 5,
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <NavigationContainer>
          <RoomProvider initialRoomId={10}>
            <InviteMemberScreen />
          </RoomProvider>
        </NavigationContainer>
      </QueryClientProvider>,
    );

    fireEvent.press(screen.getByText('Generate Invite Link'));
    await waitFor(() => expect(screen.getByText('roomgrub://invite/shared-token')).toBeTruthy());

    const generatedToken = (mockedApi.createInvite.mock.results[0].value as Promise<any>);
    const invite = await generatedToken;
    expect(invite.token).toBe('shared-token');

    mockedApi.validateInvite.mockResolvedValue(invite);
    mockedApi.acceptInvite.mockResolvedValue({ room_id: 10, message: 'Joined' });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} initialParams={{ token: invite.token }} />
            <Stack.Screen name="RoomHome">{() => null}</Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText('Room Invitation')).toBeTruthy());
    expect(mockedApi.validateInvite).toHaveBeenCalledWith('shared-token');

    fireEvent.press(screen.getByText('Accept'));
    await waitFor(() => expect(mockedApi.acceptInvite).toHaveBeenCalledWith('shared-token'));
  });
});
