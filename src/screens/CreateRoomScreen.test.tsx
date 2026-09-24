import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import CreateRoomScreen from './CreateRoomScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import { api } from '../services/api';
import { RoomListItem } from '../types/api';

jest.mock('../services/api');

const mockedApi = api as jest.Mocked<typeof api>;

describe('CreateRoomScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates only one room on a double tap and stays busy until it is created', async () => {
    let finish!: (room: RoomListItem) => void;
    mockedApi.createRoom.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const navigation = makeNavigationMock();

    renderWithProviders(<CreateRoomScreen navigation={navigation} />);

    fireEvent.press(screen.getByText('Create New Room'));
    fireEvent.press(screen.getByText('Create New Room'));

    const button = () => screen.getByRole('button', { name: /Create New Room/ });
    await waitFor(() => expect(button().props.accessibilityState.busy).toBe(true));
    expect(mockedApi.createRoom).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ id: 20, members: 1, admin: 'alice@example.com' });
    });
    expect(navigation.replace).toHaveBeenCalledWith('RoomHome', { room_id: 20 });
  });
});
