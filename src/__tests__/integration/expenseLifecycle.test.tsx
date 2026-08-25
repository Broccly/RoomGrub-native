import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExpensesScreen from '../../screens/ExpensesScreen';
import AddGroceryScreen from '../../screens/AddGroceryScreen';
import useUserRole from '../../hooks/useUserRole';
import { api } from '../../services/api';
import { mockMembers, mockPaginatedExpenses } from '../../test-utils/fixtures';
import { createTestQueryClient } from '../../test-utils/renderWithProviders';

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
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <QueryClientProvider client={createTestQueryClient()}>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Expenses">
            <Stack.Screen name="Expenses" component={GoToAddGroceryButton} />
            <Stack.Screen name="AddGrocery" component={AddGroceryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>,
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

    fireEvent.changeText(screen.getByTestId('amount-input-ADD EXPENSE'), '50');
    fireEvent.changeText(screen.getByPlaceholderText('What did you buy?'), 'Milk');
    fireEvent.press(screen.getByText('Add Expense'));

    await waitFor(() =>
      expect(mockedApi.createExpense).toHaveBeenCalledWith(10, {
        material: 'Milk',
        money: 50,
        created_at: undefined,
        participant_user_ids: [1, 2],
      }),
    );
    expect(screen.getByText('🎉 Expense added!')).toBeTruthy();
  });
});
