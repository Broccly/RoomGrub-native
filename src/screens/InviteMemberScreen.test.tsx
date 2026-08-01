import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import InviteMemberScreen from './InviteMemberScreen';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import { api } from '../services/api';

jest.mock('../services/api');

const mockedApi = api as jest.Mocked<typeof api>;

describe('InviteMemberScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('generates and displays an invite link', async () => {
    mockedApi.createInvite.mockResolvedValue({
      token: 'tok123',
      room_id: 10,
      invited_by_email: 'alice@example.com',
      days_left: 7,
    });

    renderWithProviders(<InviteMemberScreen />);
    fireEvent.press(screen.getByText('Generate Invite Link'));

    await waitFor(() => expect(screen.getByText('roomgrub://invite/tok123')).toBeTruthy());
    expect(screen.getByText('Expires in 7 days')).toBeTruthy();
  });

  it('shows an error alert when invite creation fails', async () => {
    mockedApi.createInvite.mockRejectedValue(new Error('Room not found'));
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert');

    renderWithProviders(<InviteMemberScreen />);
    fireEvent.press(screen.getByText('Generate Invite Link'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error', 'Room not found'));
  });
});
