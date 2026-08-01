import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import ExpensesScreen from './ExpensesScreen';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import { api } from '../services/api';
import { mockExpenseDetail, mockMembers, mockPaginatedExpenses } from '../test-utils/fixtures';

jest.mock('../services/api');

const mockedApi = api as jest.Mocked<typeof api>;
const route = { params: { room_id: 10 } };

describe('ExpensesScreen expense detail dialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listMembers.mockResolvedValue(mockMembers);
    mockedApi.listExpenses.mockResolvedValue(mockPaginatedExpenses);
  });

  it('opens the detail modal and shows the fetched expense when a card is tapped', async () => {
    mockedApi.getExpenseDetail.mockResolvedValue(mockExpenseDetail);

    renderWithProviders(<ExpensesScreen route={route} />);

    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());
    expect(screen.queryByText('Expense Details')).toBeNull();

    fireEvent.press(screen.getByText('Milk'));

    expect(screen.getByText('Expense Details')).toBeTruthy();
    await waitFor(() => expect(mockedApi.getExpenseDetail).toHaveBeenCalledWith(10, 1));

    await waitFor(() => expect(screen.getByText('₹50 · paid by Alice')).toBeTruthy());
    expect(screen.getByText('paid ₹0 · owes ₹25')).toBeTruthy();
  });

  it('closes the detail modal when the close button is pressed', async () => {
    mockedApi.getExpenseDetail.mockResolvedValue(mockExpenseDetail);

    renderWithProviders(<ExpensesScreen route={route} />);
    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());

    fireEvent.press(screen.getByText('Milk'));
    await waitFor(() => expect(screen.getByText('₹50 · paid by Alice')).toBeTruthy());

    fireEvent.press(screen.getByTestId('close-expense-detail'));

    expect(screen.queryByText('Expense Details')).toBeNull();
  });

  it('shows an error message in the dialog when loading details fails', async () => {
    mockedApi.getExpenseDetail.mockRejectedValue(new Error('Expense not found'));

    renderWithProviders(<ExpensesScreen route={route} />);
    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());

    fireEvent.press(screen.getByText('Milk'));

    await waitFor(() => expect(screen.getByText('Expense not found')).toBeTruthy());
  });
});
