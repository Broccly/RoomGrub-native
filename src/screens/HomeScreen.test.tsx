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

  it('navigates to MemberDetail when a member row is pressed', async () => {
    const navigation = makeNavigationMock();
    renderWithProviders(<HomeScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
    fireEvent.press(screen.getByText('Bob'));

    expect(navigation.navigate).toHaveBeenCalledWith('MemberDetail', { room_id: 10, member_id: 2 });
  });

  it('truncates a long member name to one line and still shows the amount', async () => {
    const longName = 'Bartholomew Maximilian Fitzgerald-Worthington III';
    mockedApi.getRoomDashboard.mockResolvedValue({
      ...mockDashboard,
      members: [{ ...mockDashboard.members[0], name: longName, pending_amount: 1234 }],
    });

    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText(longName)).toBeTruthy());
    expect(screen.getByText(longName).props.numberOfLines).toBe(1);
    expect(screen.getByText('₹1,234')).toBeTruthy();
  });

  it('silently ignores dashboard load failures', async () => {
    mockedApi.getRoomSummary.mockRejectedValue(new Error('network error'));
    mockedApi.getRoomDashboard.mockRejectedValue(new Error('network error'));

    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('Hi Alice 👋')).toBeTruthy());
    expect(screen.queryByText('Room Overview')).toBeNull();
  });
});
