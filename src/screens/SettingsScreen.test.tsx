import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

  it('navigates to ActivityHistory when the row is pressed', () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    const navigation = makeNavigationMock();

    renderWithProviders(<SettingsScreen navigation={navigation} route={route} />);
    fireEvent.press(screen.getByText('Activity History'));

    expect(navigation.navigate).toHaveBeenCalledWith('ActivityHistory', { room_id: 10 });
  });
});
