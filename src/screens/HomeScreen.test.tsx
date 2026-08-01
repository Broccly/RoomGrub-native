import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { mockDashboard, mockRoomSummary, mockUser } from '../test-utils/fixtures';

jest.mock('../hooks/useAuth');
jest.mock('../services/api');

const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ user: mockUser });
    mockedApi.getRoomSummary.mockResolvedValue(mockRoomSummary);
    mockedApi.getRoomDashboard.mockResolvedValue(mockDashboard);
  });

  it('shows a personalized greeting and loads room summary/members', async () => {
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('Hi Alice 👋')).toBeTruthy());
    expect(screen.getByText('₹500')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('navigates to Members when a member row is pressed', async () => {
    const navigation = makeNavigationMock();
    renderWithProviders(<HomeScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
    fireEvent.press(screen.getByText('Bob'));

    expect(navigation.navigate).toHaveBeenCalledWith('Members');
  });

  it('silently ignores dashboard load failures', async () => {
    mockedApi.getRoomSummary.mockRejectedValue(new Error('network error'));
    mockedApi.getRoomDashboard.mockRejectedValue(new Error('network error'));

    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('Hi Alice 👋')).toBeTruthy());
    expect(screen.queryByText('Room Overview')).toBeNull();
  });
});
