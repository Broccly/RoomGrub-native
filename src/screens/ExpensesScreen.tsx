import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount, formatShortDate, formatMonthYear } from '../utils/format';
import { MOCK_EXPENSES_WITH_USERS } from '../utils/mockData';

export default function ExpensesScreen({ route }: any) {
  const { room_id } = route.params;
  const [filter, setFilter] = useState('');

  const expenses = useMemo(() => {
    if (!filter) return MOCK_EXPENSES_WITH_USERS;
    return MOCK_EXPENSES_WITH_USERS.filter((e) =>
      e.material.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { monthKey: string; monthName: string; expenses: any[]; total: number }> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const monthName = formatMonthYear(expense.created_at);

      if (!groups[monthKey]) {
        groups[monthKey] = { monthKey, monthName, expenses: [], total: 0 };
      }
      groups[monthKey].expenses.push(expense);
      groups[monthKey].total += parseFloat(expense.money);
    });

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [expenses]);

  const flatData = useMemo(() => {
    const items: any[] = [];
    groupedExpenses.forEach((group) => {
      items.push({ type: 'header', monthName: group.monthName, total: group.total, key: `h-${group.monthKey}` });
      group.expenses.forEach((e) => {
        items.push({ type: 'expense', ...e, key: `e-${e.id}` });
      });
    });
    return items;
  }, [groupedExpenses]);

  const renderItem = ({ item }: any) => {
    if (item.type === 'header') {
      return (
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>{item.monthName}</Text>
          <Text style={styles.monthTotal}>{formatAmount(item.total)}</Text>
        </View>
      );
    }

    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseIcon}>
          <View style={styles.iconFallback}>
            <Ionicons name="cart" size={18} color="#7b61ff" />
          </View>
        </View>
        <View style={styles.expenseInfo}>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseUser}>
              {item.Users?.name || item.user || 'Unknown'}
            </Text>
            <Text style={styles.expenseAmount}>{formatAmount(item.money)}</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseMaterial}>{item.material}</Text>
            <Text style={styles.expenseDate}>
              {formatShortDate(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search expenses..."
        value={filter}
        onChangeText={setFilter}
        placeholderTextColor="#999"
      />

      <FlatList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No expenses found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or add a new expense
            </Text>
          </View>
        }
        ListFooterComponent={
          expenses.length > 0 ? (
            <Text style={styles.endText}>No more expenses</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  searchInput: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  monthTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  monthTotal: { fontSize: 15, fontWeight: '700', color: '#333' },
  expenseCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  expenseIcon: { marginRight: 12 },
  iconFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  expenseInfo: { flex: 1 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  expenseUser: { fontSize: 15, fontWeight: '600', color: '#333' },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: '#333' },
  expenseMaterial: { fontSize: 13, color: '#888' },
  expenseDate: { fontSize: 13, color: '#666' },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  emptyText: { fontSize: 14, color: '#888' },
  endText: { textAlign: 'center', padding: 16, color: '#888', fontSize: 13 },
});
