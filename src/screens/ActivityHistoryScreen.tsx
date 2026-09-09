import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CrossPlatformDatePicker, { CrossPlatformDatePickerHandle } from '../components/CrossPlatformDatePicker';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { ExpenseItem } from '../types/api';
import { formatAmount, formatShortDate } from '../utils/format';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import Avatar from '../components/Avatar';

function sanitizeAmountInput(text: string): string {
  return text.replace(/[^0-9.]/g, '');
}

const ACTIVITY_FILTERS = { settled: 'false', limit: 100 };

export default function ActivityHistoryScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const { role } = useUserRole();
  const isAdmin = role === 'Admin';
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses(room_id, ACTIVITY_FILTERS),
    queryFn: () => api.listExpenses(room_id, ACTIVITY_FILTERS),
  });
  const membersQuery = useQuery({
    queryKey: queryKeys.members(room_id),
    queryFn: () => api.listMembers(room_id),
  });
  const expenses = expensesQuery.data?.items ?? [];
  const members = membersQuery.data ?? [];
  const loading = expensesQuery.isPending || membersQuery.isPending;
  const refreshing = (expensesQuery.isFetching || membersQuery.isFetching) && !loading;

  const handleRefresh = () => {
    expensesQuery.refetch();
    membersQuery.refetch();
  };

  const [editing, setEditing] = useState<ExpenseItem | null>(null);
  const [editMaterial, setEditMaterial] = useState('');
  const [editMoney, setEditMoney] = useState('');
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editError, setEditError] = useState('');
  const datePickerRef = useRef<CrossPlatformDatePickerHandle>(null);

  const invalidateExpenseData = () => {
    queryClient.invalidateQueries({ queryKey: ['room', room_id, 'expenses'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.roomDashboard(room_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.roomSummary(room_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.splits(room_id) });
  };

  const updateExpenseMutation = useMutation({
    mutationFn: (payload: { expenseId: number; material: string; money: number; created_at: string }) =>
      api.updateExpense(room_id, payload.expenseId, {
        material: payload.material,
        money: payload.money,
        created_at: payload.created_at,
      }),
    onSuccess: () => {
      invalidateExpenseData();
      closeEdit();
    },
    onError: (error) => {
      setEditError(error instanceof Error ? error.message : 'Failed to update activity');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: number) => api.deleteExpense(room_id, expenseId),
    onSuccess: invalidateExpenseData,
    onError: (error) => {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to delete activity');
    },
  });

  const saving = updateExpenseMutation.isPending;

  const memberNameByEmail = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      if (m.email) map[m.email] = m.name || m.email;
    });
    return map;
  }, [members]);

  const memberProfileByEmail = useMemo(() => {
    const map: Record<string, string | null> = {};
    members.forEach((m) => {
      if (m.email) map[m.email] = m.profile;
    });
    return map;
  }, [members]);

  const openEdit = (expense: ExpenseItem) => {
    setEditing(expense);
    setEditMaterial(expense.material);
    setEditMoney(String(expense.money));
    setEditDate(new Date(expense.created_at));
    setEditError('');
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError('');
  };

  const saveEdit = () => {
    if (!editing) return;
    const numericMoney = Number(editMoney);

    if (!editMaterial.trim() || !editMoney || Number.isNaN(numericMoney) || numericMoney <= 0) {
      setEditError('Please enter a valid item name and amount.');
      return;
    }

    setEditError('');
    updateExpenseMutation.mutate({
      expenseId: editing.id,
      material: editMaterial.trim(),
      money: numericMoney,
      created_at: editDate.toISOString().split('T')[0],
    });
  };

  const confirmDelete = (expense: ExpenseItem) => {
    const userName = memberNameByEmail[expense.user] || expense.user;
    showAlert(
      'Delete Activity?',
      `${expense.material} — ${formatAmount(expense.money)}, by ${userName}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteExpenseMutation.mutate(expense.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: ExpenseItem }) => {
    const userName = memberNameByEmail[item.user] || item.user;
    const userProfile = memberProfileByEmail[item.user];

    return (
      <View style={styles.card}>
        <Avatar
          uri={userProfile}
          label={userName || '?'}
          size={44}
          backgroundColor={colors.purpleAvatar}
          textColor={colors.textSecondary}
          style={styles.avatarFallback}
        />


        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.material} numberOfLines={1}>{item.material}</Text>
            <Text style={styles.amount}>{formatAmount(item.money)}</Text>
          </View>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>Pending</Text>
          </View>
          <Text style={styles.byLine}>By: {userName}</Text>
          <Text style={styles.dateText}>{formatShortDate(item.created_at)}</Text>
        </View>

        {isAdmin && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
              <Ionicons name="create-outline" size={18} color={colors.brand} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending expenses found</Text>
          </View>
        }
      />

      <Modal visible={editing !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Expense</Text>
              <TouchableOpacity onPress={closeEdit}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={editMaterial}
              onChangeText={setEditMaterial}
              placeholder="Item name"
              placeholderTextColor="#999"
            />

            <Text style={styles.fieldLabel}>Amount</Text>
            <TextInput
              style={styles.input}
              value={editMoney}
              onChangeText={(t) => setEditMoney(sanitizeAmountInput(t))}
              keyboardType="decimal-pad"
              placeholder="Amount"
              placeholderTextColor="#999"
            />

            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => {
                datePickerRef.current?.open();
                setShowDatePicker(true);
              }}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.brand} />
              <Text style={styles.dateBtnText}>
                {editDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </TouchableOpacity>

            <CrossPlatformDatePicker
              ref={datePickerRef}
              isVisible={showDatePicker}
              mode="date"
              date={editDate}
              maximumDate={new Date()}
              onConfirm={(d) => { setEditDate(d); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
            />

            {editError !== '' && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{editError}</Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEdit}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purpleAvatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  material: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginRight: 8 },
  amount: { fontSize: 16, fontWeight: '700', color: colors.brand },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '600', color: '#92400e' },
  byLine: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  dateText: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  actions: { justifyContent: 'center', gap: 8, marginLeft: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purple100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    marginTop: 32,
  },
  emptyText: { fontSize: 14, color: colors.textLight },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#333',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.purple200,
    backgroundColor: colors.purple100,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dateBtnText: { fontSize: 14, color: colors.brand, fontWeight: '500' },
  errorBanner: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { color: colors.dangerDark, fontSize: 13 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});
