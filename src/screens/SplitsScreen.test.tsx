import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import SplitsScreen from './SplitsScreen';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { mockSplitsData } from '../test-utils/fixtures';

jest.mock('../hooks/useUserRole');
jest.mock('../services/api');

const mockedUseUserRole = useUserRole as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

describe('SplitsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getSplits.mockResolvedValue(mockSplitsData);
  });

  it('renders balances computed from splits data', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    renderWithProviders(<SplitsScreen />);

    await waitFor(() => expect(screen.getAllByText('Alice').length).toBeGreaterThan(0));
    expect(screen.getByText('Gets back')).toBeTruthy();
    expect(screen.getByText('Owes')).toBeTruthy();
    expect(screen.getByText('Who Pays Whom')).toBeTruthy();
  });

  it('shows the all-clear state when there are no pending settlements', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    mockedApi.getSplits.mockResolvedValue({
      ...mockSplitsData,
      members: [{ ...mockSplitsData.members[0], user_email: 'a@x.com', name: 'A', pending_amount: 0 }],
      unsettled_expenses: [],
      settlements: [],
    });

    renderWithProviders(<SplitsScreen />);

    await waitFor(() => expect(screen.getByText('All Clear!')).toBeTruthy());
  });

  it('shows settle controls only for admins', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    renderWithProviders(<SplitsScreen />);

    await waitFor(() => expect(screen.getAllByText('Alice').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Settle All/)).toBeNull();
  });

  it('settles all pending balances when an admin confirms', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Admin' });
    mockedApi.settleAll.mockResolvedValue(undefined);
    renderWithProviders(<SplitsScreen />);

    await waitFor(() => expect(screen.getByText(/Settle All/)).toBeTruthy());
    fireEvent.press(screen.getByText(/Settle All/));

    await waitFor(() =>
      expect(mockedApi.settleAll).toHaveBeenCalledWith(
        10,
        [
          { user_email: 'alice@example.com', pending_amount: 50 },
          { user_email: 'bob@example.com', pending_amount: -50 },
        ],
        { date_from: null, date_to: null, member_emails: null },
      ),
    );
  });
});
