import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import ExpensesScreen from './ExpensesScreen';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import { api } from '../services/api';
import useUserRole from '../hooks/useUserRole';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../services/httpClient';
import { mockExpense, mockExpenseDetail, mockMembers, mockPaginatedExpenses, mockUser } from '../test-utils/fixtures';
import { formatShortDate } from '../utils/format';

jest.mock('../services/api');
jest.mock('../hooks/useUserRole');
jest.mock('../hooks/useAuth');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedUseUserRole = useUserRole as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
// Alice (user 1) paid for the fixture expense; Bob (user 2) is the other participant.
const bob = { ...mockUser, id: 2, email: 'bob@example.com', name: 'Bob' };
const route = { params: { room_id: 10 } };

beforeEach(() => {
  mockedUseUserRole.mockReturnValue({ role: 'Member' });
  mockedUseAuth.mockReturnValue({ user: bob });
});

// The sheet closes with an animation, which can outlast waitFor's 1s default
// when the whole suite runs in parallel.
const SHEET_CLOSE = { timeout: 3000 };

async function openDetail() {
  renderWithProviders(<ExpensesScreen route={route} />);
  await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());
  fireEvent.press(screen.getByText('Milk'));
  await waitFor(() => expect(screen.getByText('₹50 · paid by Alice')).toBeTruthy());
}

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

  it('has no close button and closes when tapping outside the sheet', async () => {
    mockedApi.getExpenseDetail.mockResolvedValue(mockExpenseDetail);
    await openDetail();

    expect(screen.queryByTestId('close-expense-detail')).toBeNull();
    expect(screen.getByTestId('expense-detail-drag-handle')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close expense details'));
    await waitFor(() => expect(screen.queryByText('Expense Details')).toBeNull(), SHEET_CLOSE);
  });

  it('shows an error message in the dialog when loading details fails', async () => {
    mockedApi.getExpenseDetail.mockRejectedValue(new Error('Expense not found'));

    renderWithProviders(<ExpensesScreen route={route} />);
    await waitFor(() => expect(screen.getByText('Milk')).toBeTruthy());

    fireEvent.press(screen.getByText('Milk'));

    await waitFor(() => expect(screen.getByText('Expense not found')).toBeTruthy());
  });
});

describe('ExpensesScreen expense card', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  it('caps a long description at two lines and still shows the date', async () => {
    const longDescription =
      'Weekly groceries: rice, dal, vegetables, fruits, milk, eggs, bread, cooking oil, spices and cleaning supplies';
    mockedApi.listExpenses.mockResolvedValue({
      items: [{ ...mockExpense, material: longDescription }],
      next_cursor: null,
    });

    renderWithProviders(<ExpensesScreen route={route} />);

    await waitFor(() => expect(screen.getByText(longDescription)).toBeTruthy());
    expect(screen.getByText(longDescription).props.numberOfLines).toBe(2);
    expect(screen.getByText(formatShortDate(mockExpense.created_at))).toBeTruthy();
  });
});

describe('ExpensesScreen edit/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseUserRole.mockReturnValue({ role: 'Admin' });
    mockedApi.listMembers.mockResolvedValue(mockMembers);
    mockedApi.listExpenses.mockResolvedValue(mockPaginatedExpenses);
    mockedApi.getExpenseDetail.mockResolvedValue(mockExpenseDetail);
    mockedApi.updateExpense.mockResolvedValue({ ...mockExpense, material: 'Curd', money: 80 });
    mockedApi.deleteExpense.mockResolvedValue(undefined);
  });

  it('shows the pencil to admins on unsettled expenses', async () => {
    await openDetail();
    expect(screen.getByLabelText('Edit expense')).toBeTruthy();
  });

  it('hides the pencil from members who did not pay', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    await openDetail();
    expect(screen.queryByLabelText('Edit expense')).toBeNull();
  });

  it('shows the pencil to the member who paid', async () => {
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    mockedUseAuth.mockReturnValue({ user: mockUser });
    await openDetail();
    expect(screen.getByLabelText('Edit expense')).toBeTruthy();
  });

  it('locks an expense whose payer has left the room, and says why', async () => {
    mockedApi.listMembers.mockResolvedValue(mockMembers.filter((m) => m.user_id !== 1));
    await openDetail();
    expect(screen.queryByLabelText('Edit expense')).toBeNull();
    expect(
      screen.getByText("The person who paid has left the room, so this expense can't be changed."),
    ).toBeTruthy();
  });

  it('hides the pencil on settled expenses', async () => {
    mockedApi.getExpenseDetail.mockResolvedValue({ ...mockExpenseDetail, settled: true });
    await openDetail();
    expect(screen.queryByLabelText('Edit expense')).toBeNull();
  });

  it('saves edits and returns to the details view', async () => {
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));

    expect(screen.getByText('Edit Expense')).toBeTruthy();
    expect(screen.getByLabelText('Item name').props.value).toBe('Milk');
    fireEvent.changeText(screen.getByLabelText('Item name'), 'Curd');
    fireEvent.changeText(screen.getByLabelText('Amount'), '80');
    fireEvent.press(screen.getByText('Save'));

    // Only what changed: the untouched date isn't resent, so its time is kept.
    await waitFor(() => expect(mockedApi.updateExpense).toHaveBeenCalledWith(10, 1, { material: 'Curd', money: 80 }));
    await waitFor(() => expect(screen.getByText('Expense Details')).toBeTruthy());
  });

  it('sends the date only when it was changed', async () => {
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.press(screen.getByLabelText('Expense date'));
    act(() => {
      screen
        .UNSAFE_getAllByType('DateTimePickerModal' as any)
        .find((picker) => picker.props.isVisible)!
        .props.onConfirm(new Date(2026, 5, 15));
    });
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(mockedApi.updateExpense).toHaveBeenCalledWith(10, 1, { created_at: '2026-06-15' }));
  });

  it('changes who the expense is split between, keeping the payer in', async () => {
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));

    // The payer can't be taken out of the split.
    expect(screen.getByLabelText('Alice (paid)').props.accessibilityState).toEqual(
      expect.objectContaining({ checked: true, disabled: true }),
    );
    fireEvent.press(screen.getByLabelText('Bob'));
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(mockedApi.updateExpense).toHaveBeenCalledWith(10, 1, { participant_user_ids: [1] }),
    );
  });

  it('shows each member in the split by first name', async () => {
    mockedApi.listMembers.mockResolvedValue([
      { ...mockMembers[0], name: 'Alice Smith' },
      { ...mockMembers[1], name: null as any },
    ]);
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('paid')).toBeTruthy();
    // No name: the email's local part stands in.
    expect(screen.getByText('bob')).toBeTruthy();
  });

  it('adds a payer missing from an older split back in when saving', async () => {
    mockedApi.getExpenseDetail.mockResolvedValue({
      ...mockExpenseDetail,
      participants: [mockExpenseDetail.participants[1]],
    });
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.changeText(screen.getByLabelText('Amount'), '60');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() =>
      expect(mockedApi.updateExpense).toHaveBeenCalledWith(10, 1, { money: 60, participant_user_ids: [2, 1] }),
    );
  });

  it('leaves edit mode without a request when nothing changed', async () => {
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.press(screen.getByText('Save'));

    expect(screen.getByText('Expense Details')).toBeTruthy();
    expect(mockedApi.updateExpense).not.toHaveBeenCalled();
  });

  it("shows the server's reason when saving is refused", async () => {
    mockedApi.updateExpense.mockRejectedValue(new ApiError(409, "Settled expenses can't be changed"));
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.changeText(screen.getByLabelText('Item name'), 'Curd');
    fireEvent.press(screen.getByText('Save'));

    await waitFor(() => expect(screen.getByText("Settled expenses can't be changed")).toBeTruthy());
    expect(screen.getByText('Edit Expense')).toBeTruthy();
  });

  it('rejects an invalid amount without calling the API', async () => {
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.changeText(screen.getByLabelText('Amount'), '0');
    fireEvent.press(screen.getByText('Save'));

    expect(screen.getByText('Please enter a valid item name and amount.')).toBeTruthy();
    expect(mockedApi.updateExpense).not.toHaveBeenCalled();
  });

  it('cancel goes back to the details without saving', async () => {
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.press(screen.getByText('Cancel'));

    expect(screen.getByText('Expense Details')).toBeTruthy();
    expect(mockedApi.updateExpense).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and closes the sheet', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    await openDetail();
    fireEvent.press(screen.getByLabelText('Edit expense'));
    fireEvent.press(screen.getByText('Delete expense'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete expense?',
      'Milk — ₹50, by Alice. This action cannot be undone.',
      expect.any(Array),
    );
    const buttons = alertSpy.mock.calls[0][2]!;
    buttons.find((b) => b.style === 'destructive')!.onPress!();

    await waitFor(() => expect(mockedApi.deleteExpense).toHaveBeenCalledWith(10, 1));
    await waitFor(() => expect(screen.queryByText('Edit Expense')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Expense Details')).toBeNull(), SHEET_CLOSE);
  });
});
