import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import { renderWithProviders, makeNavigationMock } from '../test-utils/renderWithProviders';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { ApiError } from '../services/httpClient';
import { navigationRef } from '../navigation/navigationRef';
import { showAlert } from '../utils/alert';
import { getLastRoomId, setLastRoomId } from '../utils/lastRoom';
import { mockUser } from '../test-utils/fixtures';
import { SplitMemberBalance, SplitsData } from '../types/api';

jest.mock('../hooks/useAuth');
jest.mock('../services/api');
jest.mock('../navigation/navigationRef', () => ({ navigationRef: { reset: jest.fn() } }));
jest.mock('../utils/alert', () => ({ showAlert: jest.fn() }));

const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

const alice: SplitMemberBalance = {
  user_id: 1,
  user_email: 'alice@example.com',
  name: 'Alice',
  profile: null,
  role: 'Admin',
  pending_amount: 100,
  unsettled_spent: 300,
  unsettled_share: 200,
  total_spent: 3500,
};
const bob: SplitMemberBalance = {
  user_id: 2,
  user_email: 'bob@example.com',
  name: 'Bob',
  profile: null,
  role: 'Member',
  pending_amount: -100,
  unsettled_spent: 100,
  unsettled_share: 200,
  total_spent: 1500,
};

// Since the last settle-up Alice paid 300 and Bob 100, split equally: each owes 200,
// so Bob pays Alice 100. All time, Alice paid 3,500 and Bob 1,500.
const splits: SplitsData = {
  members: [alice, bob],
  unsettled_expenses: [],
  settlements: [
    {
      from_user_id: 2,
      from_user_email: 'bob@example.com',
      from_name: 'Bob',
      to_user_id: 1,
      to_user_email: 'alice@example.com',
      to_name: 'Alice',
      amount: 100,
    },
  ],
  total_pending: 400,
  unsettled_count: 3,
  total_spent: 5000,
  last_settled_at: null,
};

const barWidth = (id: number) => StyleSheet.flatten(screen.getByTestId(`member-bar-${id}`).props.style).width;

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAuth.mockReturnValue({ user: mockUser });
    mockedApi.getSplits.mockResolvedValue(splits);
  });

  it('loads everything from one totals-only splits request', async () => {
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('You get back')).toBeTruthy());
    expect(mockedApi.getSplits).toHaveBeenCalledTimes(1);
    expect(mockedApi.getSplits).toHaveBeenCalledWith(10, { includeExpenses: false });
    expect(mockedApi.listMembers).not.toHaveBeenCalled();
    expect(mockedApi.getRoomSummary).not.toHaveBeenCalled();
    expect(mockedApi.getMemberDetail).not.toHaveBeenCalled();
  });

  it('shows what you spent, your share, and who owes you', async () => {
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('You get back')).toBeTruthy());
    expect(screen.getByText('Your share ₹200')).toBeTruthy();
    expect(screen.getByText('From 1 person')).toBeTruthy();
    expect(screen.getByText('Bob owes you')).toBeTruthy();
  });

  it('shows who you owe when your balance is negative', async () => {
    mockedUseAuth.mockReturnValue({ user: { ...mockUser, id: 2, email: 'bob@example.com', name: 'Bob' } });
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('You owe Alice')).toBeTruthy());
    expect(screen.getByText('You owe')).toBeTruthy();
    expect(screen.getByText('Your share ₹200')).toBeTruthy();
  });

  it('shows first names instead of full names', async () => {
    mockedApi.getSplits.mockResolvedValue({
      ...splits,
      members: splits.members.map((m) => ({ ...m, name: `${m.name} Smith` })),
      settlements: [{ ...splits.settlements[0], from_name: 'Bob Smith', to_name: 'Alice Smith' }],
    });
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('Bob owes you')).toBeTruthy());
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.queryByText(/Bob Smith/)).toBeNull();
  });

  it('says you are square when nothing is pending', async () => {
    mockedApi.getSplits.mockResolvedValue({
      ...splits,
      members: [
        { ...alice, pending_amount: 0, unsettled_spent: 0, unsettled_share: 0 },
        { ...bob, pending_amount: 0, unsettled_spent: 0, unsettled_share: 0 },
      ],
      settlements: [],
      total_pending: 0,
      unsettled_count: 0,
    });
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('You are square with everyone')).toBeTruthy());
    expect(screen.getByText('Settled up')).toBeTruthy();
    expect(screen.getByText('Since last settle-up · 0 expenses')).toBeTruthy();
  });

  it('breaks down unsettled room spending per member', async () => {
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('Since last settle-up · 3 expenses')).toBeTruthy());
    expect(screen.getByText('₹400')).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(barWidth(1)).toBe('75%');
    expect(barWidth(2)).toBe('25%');
  });

  it('switches to all-time totals without another request', async () => {
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('All time')).toBeTruthy());
    fireEvent.press(screen.getByText('All time'));

    expect(screen.getByText('₹5,000')).toBeTruthy();
    expect(screen.getByText(/^₹3,500/)).toBeTruthy();
    expect(screen.getByText(/^₹1,500/)).toBeTruthy();
    expect(barWidth(1)).toBe('70%');
    expect(mockedApi.getSplits).toHaveBeenCalledTimes(1);
  });

  it('gives no bar to someone who left, but still shows what they owe you', async () => {
    const carol: SplitMemberBalance = {
      ...bob,
      user_id: 3,
      user_email: 'carol@example.com',
      name: 'Carol',
      role: null,
      pending_amount: -50,
    };
    mockedApi.getSplits.mockResolvedValue({
      ...splits,
      members: [alice, bob, carol],
      settlements: [
        ...splits.settlements,
        {
          from_user_id: 3,
          from_user_email: 'carol@example.com',
          from_name: 'Carol',
          to_user_id: 1,
          to_user_email: 'alice@example.com',
          to_name: 'Alice',
          amount: 50,
        },
      ],
    });
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() => expect(screen.getByText('Carol owes you')).toBeTruthy());
    expect(screen.queryByTestId('member-bar-3')).toBeNull();
    expect(screen.getByTestId('member-bar-2')).toBeTruthy();
  });

  it('navigates to MemberDetail when a member row is pressed', async () => {
    const navigation = makeNavigationMock();
    renderWithProviders(<HomeScreen navigation={navigation} />);

    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
    fireEvent.press(screen.getByText('Bob'));

    expect(navigation.navigate).toHaveBeenCalledWith('MemberDetail', { room_id: 10, member_id: 2 });
  });

  it('shows a retry message when the room fails to load', async () => {
    mockedApi.getSplits.mockRejectedValue(new Error('network error'));
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() =>
      expect(screen.getByText("Couldn't load this room. Pull down to try again.")).toBeTruthy(),
    );
    expect(navigationRef.reset).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'Room not found'],
    [403, 'Not a member of this room'],
  ])('leaves a room that answers %i and forgets it', async (status, detail) => {
    setLastRoomId(10);
    mockedApi.getSplits.mockRejectedValue(new ApiError(status, detail));
    renderWithProviders(<HomeScreen navigation={makeNavigationMock()} />);

    await waitFor(() =>
      expect(navigationRef.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'RoomsList' }] }),
    );
    expect(showAlert).toHaveBeenCalledWith('Room unavailable', 'This room is no longer available.');
    expect(getLastRoomId()).toBeNull();
    expect(screen.queryByText("Couldn't load this room. Pull down to try again.")).toBeNull();
  });
});
