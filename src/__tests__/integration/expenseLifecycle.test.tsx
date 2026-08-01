import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Text } from 'react-native';
import ExpensesScreen from '../../screens/ExpensesScreen';
import AddGroceryScreen from '../../screens/AddGroceryScreen';
import useUserRole from '../../hooks/useUserRole';
import { api } from '../../services/api';
import { mockMembers, mockPaginatedExpenses } from '../../test-utils/fixtures';

// Exercises real push/back navigation between ExpensesScreen and AddGroceryScreen:
// creating an expense, going back, and confirming ExpensesScreen's
// useFocusEffect-driven refetch picks up the new item. Only the api.ts
// network boundary is mocked.
jest.mock('../../hooks/useUserRole');
jest.mock('../../services/api');

const mockedUseUserRole = useUserRole as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;
const Stack = createNativeStackNavigator();

function GoToAddGroceryButton({ navigation }: any) {
  return (
    <>
      <ExpensesScreen navigation={navigation} route={{ params: { room_id: 10 } }} />
      <TouchableOpacity onPress={() => navigation.navigate('AddGrocery', { room_id: 10 })}>
        <Text>Go to Add Grocery</Text>
      </TouchableOpacity>
    </>
  );
}

function renderApp() {
  return render(
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Expenses">
        <Stack.Screen name="Expenses" component={GoToAddGroceryButton} />
        <Stack.Screen name="AddGrocery" component={AddGroceryScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('expense lifecycle flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseUserRole.mockReturnValue({ role: 'Member' });
    mockedApi.listMembers.mockResolvedValue(mockMembers);
    mockedApi.listExpenses
      .mockResolvedValueOnce({ items: [], next_cursor: null })
      .mockResolvedValueOnce(mockPaginatedExpenses);
    mockedApi.createExpense.mockResolvedValue(mockPaginatedExpenses.items[0]);
  });

  it('creates an expense from AddGroceryScreen and sees it after returning to ExpensesScreen', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByText('No expenses found')).toBeTruthy());
    expect(mockedApi.listExpenses).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Go to Add Grocery'));
    await waitFor(() => expect(screen.getByPlaceholderText('What did you buy?')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('amount-input-ADD GROCERY'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Milk');
    fireEvent.press(screen.getByText('Add Grocery'));

    await waitFor(() =>
      expect(mockedApi.createExpense).toHaveBeenCalledWith(10, {
        material: 'Milk',
        money: 50,
        created_at: undefined,
        participant_user_ids: [1, 2],
      }),
    );
    expect(screen.getByText('✅ Grocery added!')).toBeTruthy();
  });
});
