import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import InviteAcceptScreen from './InviteAcceptScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

jest.mock('../hooks/useAuth');
jest.mock('../services/api');

const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

const invite = {
  token: 'tok123',
  room_id: 10,
  invited_by_email: 'alice@example.com',
  days_left: 3,
};

function renderScreen(navigation = makeNavigationMock()) {
  renderWithProviders(
    <InviteAcceptScreen navigation={navigation} route={{ params: { token: 'tok123' } }} />,
  );
  return navigation;
}

describe('InviteAcceptScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prompts an unauthenticated user to log in first', async () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    mockedApi.validateInvite.mockResolvedValue(invite);

    const navigation = renderScreen();
    await waitFor(() => expect(screen.getByText("You've been invited!")).toBeTruthy());

    fireEvent.press(screen.getByText('Log In to Continue'));
    expect(navigation.replace).toHaveBeenCalledWith('Login');
  });

  it('shows accept/decline for an authenticated user with a valid invite', async () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockedApi.validateInvite.mockResolvedValue(invite);
    mockedApi.acceptInvite.mockResolvedValue({ room_id: 10, message: 'Joined' });

    const navigation = renderScreen();
    await waitFor(() => expect(screen.getByText('Room Invitation')).toBeTruthy());

    fireEvent.press(screen.getByText('Accept'));

    await waitFor(() => expect(mockedApi.acceptInvite).toHaveBeenCalledWith('tok123'));
    expect(navigation.replace).toHaveBeenCalledWith('RoomHome', { room_id: 10 });
  });

  it('declines the invite and returns to RoomsList', async () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockedApi.validateInvite.mockResolvedValue(invite);
    mockedApi.rejectInvite.mockResolvedValue(undefined);

    const navigation = renderScreen();
    await waitFor(() => expect(screen.getByText('Room Invitation')).toBeTruthy());

    fireEvent.press(screen.getByText('Decline'));

    await waitFor(() => expect(mockedApi.rejectInvite).toHaveBeenCalledWith('tok123'));
    expect(navigation.replace).toHaveBeenCalledWith('RoomsList');
  });

  it('shows an invalid-invite state when validation fails', async () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockedApi.validateInvite.mockRejectedValue(new Error('Invite expired'));

    renderScreen();

    await waitFor(() => expect(screen.getByText('Invite Unavailable')).toBeTruthy());
    expect(screen.getByText('Invite expired')).toBeTruthy();
  });
});

describe('InviteAcceptScreen loading state', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows Accept as busy and disables Decline while joining', async () => {
    mockedUseAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    mockedApi.validateInvite.mockResolvedValue(invite);
    let finish!: (value: { room_id: number; message: string }) => void;
    mockedApi.acceptInvite.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    renderScreen();
    await waitFor(() => expect(screen.getByText('Room Invitation')).toBeTruthy());

    fireEvent.press(screen.getByText('Accept'));

    const accept = () => screen.getByRole('button', { name: /Accept/ });
    const decline = () => screen.getByRole('button', { name: /Decline/ });
    await waitFor(() => expect(accept().props.accessibilityState.busy).toBe(true));
    expect(decline().props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByText('Decline'));
    expect(mockedApi.rejectInvite).not.toHaveBeenCalled();

    await act(async () => {
      finish({ room_id: 10, message: 'Joined' });
    });
  });
});
