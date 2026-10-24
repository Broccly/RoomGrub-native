import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import { useAuth } from '../hooks/useAuth';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';

jest.mock('../hooks/useAuth');
jest.mock('../hooks/useUserRole');
jest.mock('../services/api');

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseUserRole = useUserRole as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

const route = { params: { room_id: 10 } };

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ logout: jest.fn().mockResolvedValue(undefined) });
  });

  it('shows Delete Room only for admins', () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin' });
    renderWithProviders(<SettingsScreen navigation={makeNavigationMock()} route={route} />);
    expect(screen.getByText('Delete Room')).toBeTruthy();
    expect(screen.queryByText('Exit Room')).toBeNull();
  });

  it('shows Exit Room for non-admin members', () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    renderWithProviders(<SettingsScreen navigation={makeNavigationMock()} route={route} />);
    expect(screen.getByText('Exit Room')).toBeTruthy();
    expect(screen.queryByText('Delete Room')).toBeNull();
  });

  it('signs out via useAuth, which owns the navigation to Login', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    const logout = jest.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({ logout });
    const navigation = makeNavigationMock();

    renderWithProviders(<SettingsScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('Sign Out'));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(navigation.reset).not.toHaveBeenCalled();
  });

  it('deletes the room after confirmation and resets to RoomsList', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin' });
    mockedApi.deleteRoom.mockResolvedValue(undefined);
    const navigation = makeNavigationMock();

    renderWithProviders(<SettingsScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('Delete Room'));

    await waitFor(() => expect(mockedApi.deleteRoom).toHaveBeenCalledWith(10));
    expect(navigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'RoomsList' }] });
  });
});

describe('SettingsScreen delete room loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ logout: jest.fn().mockResolvedValue(undefined) });
    mockedUseUserRole.mockReturnValue({ role: 'Admin' });
  });

  it('shows Delete Room as busy while the delete request is in flight', async () => {
    let finish!: () => void;
    mockedApi.deleteRoom.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));

    renderWithProviders(<SettingsScreen navigation={makeNavigationMock()} route={route} />);
    fireEvent.press(screen.getByText('Delete Room'));

    const button = () => screen.getByRole('button', { name: /Delete Room/ });
    await waitFor(() => expect(button().props.accessibilityState.busy).toBe(true));
    expect(mockedApi.deleteRoom).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish();
    });
  });
});
