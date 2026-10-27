import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import AddGroceryScreen from './AddGroceryScreen';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import useUserRole from '../hooks/useUserRole';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { mockExpense, mockMembers, mockUser } from '../test-utils/fixtures';

jest.mock('../hooks/useUserRole');
jest.mock('../hooks/useAuth');
jest.mock('../services/api');

const mockedUseUserRole = useUserRole as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;
const route = { params: { room_id: 10 } };

const submitButton = () => screen.getByTestId('submit-button-ADD EXPENSE');
const amountInput = () => screen.getByTestId('amount-input-ADD EXPENSE');
const descriptionInput = () => screen.getByLabelText('What was it for');

async function renderScreen(role: 'Admin' | 'Member' = 'Member') {
  mockedUseUserRole.mockReturnValue({ role });
  renderWithProviders(<AddGroceryScreen route={route} />);
  await waitFor(() => expect(screen.getByText('Split with everyone')).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({ user: mockUser });
  mockedApi.listMembers.mockResolvedValue(mockMembers);
  mockedApi.getFrequentItems.mockResolvedValue({ items: [] });
  mockedApi.createExpense.mockResolvedValue({ ...mockExpense, id: 77 });
  mockedApi.createExpenseForMember.mockResolvedValue({ ...mockExpense, id: 78 });
  mockedApi.deleteExpense.mockResolvedValue(undefined);
});

describe('AddGroceryScreen submit button', () => {
  it('stays disabled until there is an amount and a description', async () => {
    await renderScreen();
    expect(submitButton().props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(amountInput(), '50');
    expect(submitButton().props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(descriptionInput(), 'Milk');
    expect(submitButton().props.accessibilityState.disabled).toBe(false);
    expect(screen.getByText('Add ₹50')).toBeTruthy();

    fireEvent.changeText(amountInput(), '');
    expect(submitButton().props.accessibilityState.disabled).toBe(true);
  });

  it('lets the description be typed before the amount', async () => {
    await renderScreen();
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.changeText(amountInput(), '50');
    expect(submitButton().props.accessibilityState.disabled).toBe(false);
  });

  it('is busy while saving and ignores a second tap', async () => {
    let finish!: (value: unknown) => void;
    mockedApi.createExpense.mockReturnValue(new Promise((resolve) => (finish = resolve)) as never);
    await renderScreen();

    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.press(submitButton());
    fireEvent.press(submitButton());

    await waitFor(() => expect(submitButton().props.accessibilityState.busy).toBe(true));
    expect(mockedApi.createExpense).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({ ...mockExpense, id: 77 });
    });
    await waitFor(() => expect(submitButton().props.accessibilityState.busy).toBe(false));
  });
});

describe('AddGroceryScreen description chips', () => {
  it('turns comma-separated text into chips and saves them joined', async () => {
    await renderScreen();
    fireEvent.changeText(amountInput(), '120');
    fireEvent.changeText(descriptionInput(), 'Milk,');
    fireEvent.changeText(descriptionInput(), 'Bread, eggs,');

    expect(screen.getByLabelText('Remove Milk')).toBeTruthy();
    expect(screen.getByLabelText('Remove Bread')).toBeTruthy();
    expect(screen.getByLabelText('Remove eggs')).toBeTruthy();

    fireEvent.press(submitButton());
    await waitFor(() =>
      expect(mockedApi.createExpense).toHaveBeenCalledWith(10, {
        material: 'Milk, Bread, eggs',
        money: 120,
        created_at: undefined,
        participant_user_ids: [1, 2],
      }),
    );
  });

  it('ignores duplicate items regardless of case', async () => {
    await renderScreen();
    fireEvent.changeText(descriptionInput(), 'Milk,');
    fireEvent.changeText(descriptionInput(), 'milk,');
    expect(screen.getAllByLabelText(/^Remove /)).toHaveLength(1);
  });

  it('removes a chip with its close button and with backspace on an empty input', async () => {
    await renderScreen();
    fireEvent.changeText(descriptionInput(), 'Milk, Bread,');

    fireEvent.press(screen.getByLabelText('Remove Milk'));
    expect(screen.queryByLabelText('Remove Milk')).toBeNull();

    fireEvent(descriptionInput(), 'keyPress', { nativeEvent: { key: 'Backspace' } });
    expect(screen.queryByLabelText('Remove Bread')).toBeNull();
  });

  it('toggles frequent suggestions in and out as chips', async () => {
    await renderScreen();
    fireEvent.press(screen.getByText('Milk'));
    fireEvent.press(screen.getByText('Gas'));
    expect(screen.getByLabelText('Remove Milk')).toBeTruthy();
    expect(screen.getByLabelText('Remove Gas')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Remove Gas'));
    expect(screen.queryByLabelText('Remove Gas')).toBeNull();
  });

  it('shortens long suggestions to 10 characters but adds the full name', async () => {
    mockedApi.getFrequentItems.mockResolvedValue({ items: ['Basmati rice 5kg'] });
    await renderScreen();

    await waitFor(() => expect(screen.getByText('Basmati ri…')).toBeTruthy());
    expect(screen.queryByText('Basmati rice 5kg')).toBeNull();
    expect(screen.getByText('Milk')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Basmati rice 5kg'));
    expect(screen.getByLabelText('Remove Basmati rice 5kg')).toBeTruthy();
  });

  it("shows the room's frequent items from the backend, topped up with starter items", async () => {
    mockedApi.getFrequentItems.mockResolvedValue({ items: ['Paneer', 'Curd', 'milk'] });
    await renderScreen();

    await waitFor(() => expect(screen.getByText('Paneer')).toBeTruthy());
    expect(screen.getByText('Curd')).toBeTruthy();
    expect(mockedApi.getFrequentItems).toHaveBeenCalledWith(10, 6);
    expect(mockedApi.listExpenses).not.toHaveBeenCalled();
    // The room's own spelling wins over the starter "Milk"; the rest of the row is starters.
    expect(screen.getByText('milk')).toBeTruthy();
    expect(screen.queryByText('Milk')).toBeNull();
    expect(screen.getByText('Water can')).toBeTruthy();
    expect(screen.getByText('Vegetables')).toBeTruthy();
    expect(screen.getByText('Groceries')).toBeTruthy();
    expect(screen.queryByText('Gas')).toBeNull(); // six chips at most
  });
});

describe('AddGroceryScreen split with', () => {
  it('starts with everyone selected and keeps the payer locked in', async () => {
    await renderScreen();

    fireEvent.press(screen.getByLabelText('You'));
    expect(screen.getByText('Split with everyone')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Bob'));
    expect(screen.getByText('Split with 1 of 2')).toBeTruthy();
  });

  it('shows the per-person amount for the selected people', async () => {
    await renderScreen();
    fireEvent.changeText(amountInput(), '100');
    expect(screen.getByText('₹50 each')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Bob'));
    expect(screen.getByText('₹100 each')).toBeTruthy();
  });
});

describe('AddGroceryScreen paid by', () => {
  it('shows a fixed "You" for members', async () => {
    await renderScreen('Member');
    expect(screen.queryByLabelText('Paid by You')).toBeNull();
  });

  it('defaults to "You" when the signed-in user loads after the first render', async () => {
    // useAuth reads the user from storage, so the first render has none.
    mockedUseAuth.mockReturnValueOnce({ user: null });
    await renderScreen('Admin');
    expect(screen.getByLabelText('Paid by You')).toBeTruthy();
  });

  it('lets admins pick another payer and saves it for that member', async () => {
    await renderScreen('Admin');
    fireEvent.press(screen.getByLabelText('Paid by You'));
    fireEvent.press(screen.getAllByText('Bob').at(-1)!);
    expect(screen.getByLabelText('Paid by Bob')).toBeTruthy();

    fireEvent.changeText(amountInput(), '80');
    fireEvent.changeText(descriptionInput(), 'Water can');
    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockedApi.createExpenseForMember).toHaveBeenCalledWith(10, {
        user_id: 2,
        material: 'Water can',
        money: 80,
        created_at: undefined,
        participant_user_ids: [1, 2],
      }),
    );
    expect(mockedApi.createExpense).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Added ₹80 · Water can for Bob')).toBeTruthy());
  });

  it('moves the split lock to the chosen payer so the admin can leave themselves out', async () => {
    await renderScreen('Admin');
    fireEvent.press(screen.getByLabelText('Paid by You'));
    fireEvent.press(screen.getAllByText('Bob').at(-1)!);

    // Bob paid, so he stays in; the admin can now opt out.
    fireEvent.press(screen.getByLabelText('Bob'));
    fireEvent.press(screen.getByLabelText('You'));
    expect(screen.getByText('Split with 1 of 2')).toBeTruthy();

    fireEvent.changeText(amountInput(), '80');
    fireEvent.changeText(descriptionInput(), 'Water can');
    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockedApi.createExpenseForMember).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ user_id: 2, participant_user_ids: [2] }),
      ),
    );
  });

  it('adds the admin back when they switch the payer back to themselves', async () => {
    await renderScreen('Admin');
    fireEvent.press(screen.getByLabelText('Paid by You'));
    fireEvent.press(screen.getAllByText('Bob').at(-1)!);
    fireEvent.press(screen.getByLabelText('You'));
    expect(screen.getByText('Split with 1 of 2')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Paid by Bob'));
    fireEvent.press(screen.getAllByText('You').at(-1)!);
    expect(screen.getByText('Split with everyone')).toBeTruthy();
  });
});

describe('AddGroceryScreen after saving', () => {
  it('confirms and clears the form', async () => {
    await renderScreen('Member');
    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.press(submitButton());

    await waitFor(() => expect(screen.getByText('Added ₹50 · Milk')).toBeTruthy());
    expect(amountInput().props.value).toBe('');
  });

  it('lets members undo their own expense', async () => {
    await renderScreen('Member');
    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.press(submitButton());

    await waitFor(() => expect(screen.getByText('Undo')).toBeTruthy());
    fireEvent.press(screen.getByText('Undo'));

    await waitFor(() => expect(mockedApi.deleteExpense).toHaveBeenCalledWith(10, 77));
    await waitFor(() => expect(amountInput().props.value).toBe('50'));
  });

  it('lets admins undo, deleting the expense and restoring the form', async () => {
    await renderScreen('Admin');
    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.press(submitButton());

    await waitFor(() => expect(screen.getByText('Undo')).toBeTruthy());
    fireEvent.press(screen.getByText('Undo'));

    await waitFor(() => expect(mockedApi.deleteExpense).toHaveBeenCalledWith(10, 77));
    await waitFor(() => expect(amountInput().props.value).toBe('50'));
    expect(screen.getByLabelText('Remove Milk')).toBeTruthy();
  });

  it('shows the error and keeps the form when saving fails', async () => {
    mockedApi.createExpense.mockRejectedValue(new Error('Server unavailable'));
    await renderScreen();
    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.press(submitButton());

    await waitFor(() => expect(screen.getByText('Server unavailable')).toBeTruthy());
    expect(amountInput().props.value).toBe('50');
  });
});

describe('AddGroceryScreen date', () => {
  it('defaults to today', async () => {
    await renderScreen();
    expect(screen.getByLabelText('Date Today')).toBeTruthy();
  });

  it('sends a picked day as its local calendar date', async () => {
    await renderScreen();
    fireEvent.press(screen.getByLabelText('Date Today'));
    // Local midnight — the old toISOString() path sent the previous day in IST.
    act(() => {
      screen.UNSAFE_getByType('DateTimePickerModal' as any).props.onConfirm(new Date(2026, 9, 12));
    });
    expect(screen.getByLabelText('Date 12 Oct 2026')).toBeTruthy();

    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    fireEvent.press(submitButton());

    await waitFor(() =>
      expect(mockedApi.createExpense).toHaveBeenCalledWith(10, expect.objectContaining({ created_at: '2026-10-12' })),
    );
  });
});

describe('AddGroceryScreen member load failure', () => {
  it('shows the error with a retry instead of a dead form', async () => {
    mockedApi.listMembers.mockRejectedValue(new Error('Network down'));
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    renderWithProviders(<AddGroceryScreen route={route} />);

    await waitFor(() => expect(screen.getByText('Network down')).toBeTruthy());
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText(/Split with/)).toBeNull();
  });

  it('loads the form once a retry succeeds', async () => {
    mockedApi.listMembers.mockRejectedValueOnce(new Error('Network down'));
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    renderWithProviders(<AddGroceryScreen route={route} />);

    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy());
    fireEvent.press(screen.getByText('Try again'));

    await waitFor(() => expect(screen.getByText('Split with everyone')).toBeTruthy());
    fireEvent.changeText(amountInput(), '50');
    fireEvent.changeText(descriptionInput(), 'Milk');
    expect(submitButton().props.accessibilityState.disabled).toBe(false);
  });
});
