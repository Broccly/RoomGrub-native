import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import AddGroceryScreen from './AddGroceryScreen';
import { renderWithProviders } from '../test-utils/renderWithProviders';
import useUserRole from '../hooks/useUserRole';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { mockMembers, mockUser } from '../test-utils/fixtures';

jest.mock('../hooks/useUserRole');
jest.mock('../hooks/useAuth');
jest.mock('../services/api');

const mockedUseUserRole = useUserRole as jest.Mock;
const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;
const route = { params: { room_id: 10 } };

function getAddGroceryButton() {
  return screen.getByTestId('submit-button-ADD EXPENSE');
}

describe('AddGroceryScreen submit button disabled state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    mockedUseAuth.mockReturnValue({ user: mockUser });
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  it('stays disabled when the form is empty', async () => {
    renderWithProviders(<AddGroceryScreen route={route} />);

    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    expect(getAddGroceryButton().props.accessibilityState.disabled).toBe(true);
  });

  it('stays disabled with only the price entered', async () => {
    renderWithProviders(<AddGroceryScreen route={route} />);
    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('amount-input-ADD EXPENSE'), '50');

    expect(getAddGroceryButton().props.accessibilityState.disabled).toBe(true);
  });

  it('stays disabled with only the grocery description entered', async () => {
    renderWithProviders(<AddGroceryScreen route={route} />);
    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    // The description input only becomes editable once a positive amount is
    // entered, so this exercises the "price missing/zero" branch of canSubmit.
    fireEvent.changeText(screen.getByTestId('amount-input-ADD EXPENSE'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Milk');
    fireEvent.changeText(screen.getByTestId('amount-input-ADD EXPENSE'), '');

    expect(getAddGroceryButton().props.accessibilityState.disabled).toBe(true);
  });

  it('becomes enabled once both grocery and a positive price are entered', async () => {
    renderWithProviders(<AddGroceryScreen route={route} />);
    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('amount-input-ADD EXPENSE'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Milk');

    expect(getAddGroceryButton().props.accessibilityState.disabled).toBe(false);
  });
});

describe('AddGroceryScreen participant selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    // mockUser (alice@example.com) matches mockMembers[0] (user_id: 1) — the
    // member who is adding this expense.
    mockedUseAuth.mockReturnValue({ user: mockUser });
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  // NOT YET IMPLEMENTED: AddGroceryScreen's main ParticipantPicker has no
  // lockedUserId (unlike the "for friend" form, which locks the selected
  // friend) and toggleParticipant() unconditionally removes whoever is
  // tapped. This test specifies the desired behavior — the person adding
  // the expense should always stay checked — and is expected to fail until
  // that lock is wired up (mirroring the friendSlot's lockedUserId pattern).
  it('does not let the user who is adding the expense deselect themselves', async () => {
    renderWithProviders(<AddGroceryScreen route={route} />);
    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    fireEvent.press(screen.getByText('Everyone'));
    await waitFor(() => expect(screen.getByText('Split Between')).toBeTruthy());

    fireEvent.press(screen.getByText('Alice'));
    fireEvent.press(screen.getByText('Done'));

    expect(screen.getByText('Everyone')).toBeTruthy();
  });
});

describe('AddGroceryScreen submit loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    mockedUseAuth.mockReturnValue({ user: mockUser });
    mockedApi.listMembers.mockResolvedValue(mockMembers);
  });

  it('is busy while the expense is being saved and ignores a second tap', async () => {
    let finish!: (value: unknown) => void;
    mockedApi.createExpense.mockReturnValue(new Promise((resolve) => (finish = resolve)) as never);

    renderWithProviders(<AddGroceryScreen route={route} />);
    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('amount-input-ADD EXPENSE'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Milk');
    fireEvent.press(getAddGroceryButton());
    fireEvent.press(getAddGroceryButton());

    await waitFor(() => expect(getAddGroceryButton().props.accessibilityState.busy).toBe(true));
    expect(mockedApi.createExpense).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish({});
    });
    await waitFor(() => expect(getAddGroceryButton().props.accessibilityState.busy).toBe(false));
  });
});
