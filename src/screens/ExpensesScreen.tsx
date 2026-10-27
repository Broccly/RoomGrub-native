import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  PanResponder,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import CrossPlatformDatePicker, { CrossPlatformDatePickerHandle } from '../components/CrossPlatformDatePicker';
import ActionButton from '../components/ActionButton';
import Avatar from '../components/Avatar';
import useUserRole from '../hooks/useUserRole';
import { useAuth } from '../hooks/useAuth';
import { showAlert } from '../utils/alert';
import { formatAmount, formatShortDate, formatMonthYear } from '../utils/format';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { ExpenseItem } from '../types/api';
import { colors } from '../theme/colors';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
// How far the detail sheet must be dragged down before it closes.
const SHEET_DISMISS_DISTANCE = 100;

export default function ExpensesScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { role } = useUserRole();
  const { user } = useAuth();
  const isAdmin = role === 'Admin';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSettled, setShowSettled] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Temp state inside modal
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailExpenseId, setDetailExpenseId] = useState<number | null>(null);

  // Edit mode inside the detail sheet (admins and the payer, unsettled expenses only)
  const [editing, setEditing] = useState(false);
  const [editMaterial, setEditMaterial] = useState('');
  const [editMoney, setEditMoney] = useState('');
  const [editDate, setEditDate] = useState(() => new Date());
  const [editParticipantIds, setEditParticipantIds] = useState<number[]>([]);
  const [editError, setEditError] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const editDatePickerRef = useRef<CrossPlatformDatePickerHandle>(null);
  const sheetY = useRef(new Animated.Value(0)).current;

  // Debounce free-text search before it drives a server query, matching the web app.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = {
    limit: PAGE_SIZE,
    settled: showSettled ? undefined : 'false',
    search: debouncedSearch || undefined,
    user_email: selectedMember || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const expensesQuery = useInfiniteQuery({
    queryKey: queryKeys.expenses(room_id, filters),
    queryFn: ({ pageParam }) =>
      api.listExpenses(room_id, { ...filters, cursor: pageParam ?? undefined }),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [expensesQuery.data],
  );
  const loading = expensesQuery.isPending;
  const loadingMore = expensesQuery.isFetchingNextPage;
  const refreshing = expensesQuery.isFetching && !loading && !loadingMore;
  const hasMore = expensesQuery.hasNextPage;

  const loadMore = () => {
    if (expensesQuery.hasNextPage && !expensesQuery.isFetchingNextPage) {
      expensesQuery.fetchNextPage();
    }
  };

  const membersQuery = useQuery({
    queryKey: queryKeys.members(room_id),
    queryFn: () => api.listMembers(room_id),
  });
  const members = membersQuery.data ?? [];

  const detailQuery = useQuery({
    queryKey: detailExpenseId ? queryKeys.expenseDetail(room_id, detailExpenseId) : ['expense-detail', 'disabled'],
    queryFn: () => api.getExpenseDetail(room_id, detailExpenseId!),
    enabled: detailOpen && detailExpenseId !== null,
  });
  const detail = detailQuery.data ?? null;
  const detailLoading = detailQuery.isPending && detailOpen;
  const detailError = detailQuery.isError
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : 'Failed to load expense details'
    : '';

  const memberNameByEmail = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      if (m.email) map[m.email] = m.name || m.email;
    });
    return map;
  }, [members]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, { monthKey: string; monthName: string; expenses: ExpenseItem[]; total: number }> = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const monthName = formatMonthYear(expense.created_at);

      if (!groups[monthKey]) {
        groups[monthKey] = { monthKey, monthName, expenses: [], total: 0 };
      }
      groups[monthKey].expenses.push(expense);
      groups[monthKey].total += Number(expense.money);
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

  const activeFilterCount = [
    selectedMember !== null,
    dateFrom || dateTo,
    showSettled,
  ].filter(Boolean).length;

  const handleExpenseClick = (expenseId: number) => {
    // Start off-screen; onShow slides it up.
    sheetY.setValue(Dimensions.get('window').height);
    setDetailExpenseId(expenseId);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailExpenseId(null);
    setEditing(false);
    setEditError('');
  };

  // The sheet and the dimmed backdrop are animated together here (not by Modal's
  // own slide), so the backdrop fades out with the sheet instead of sliding after it.
  const backdropOpacity = sheetY.interpolate({
    inputRange: [0, Dimensions.get('window').height],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const showSheet = () => {
    Animated.timing(sheetY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };
  const dismissDetail = () => {
    Animated.timing(sheetY, {
      toValue: Dimensions.get('window').height,
      duration: 180,
      useNativeDriver: true,
    }).start(() => closeDetailRef.current());
  };

  // Drag the sheet's top area down to close it; a short drag springs back.
  const closeDetailRef = useRef(closeDetail);
  closeDetailRef.current = closeDetail;
  const dismissDetailRef = useRef(dismissDetail);
  dismissDetailRef.current = dismissDetail;
  const sheetPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderMove: (_, g) => sheetY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > SHEET_DISMISS_DISTANCE || g.vy > 1) {
          dismissDetailRef.current();
        } else {
          Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const invalidateExpenseData = () => {
    queryClient.invalidateQueries({ queryKey: ['room', room_id, 'expenses'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.roomDashboard(room_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.roomSummary(room_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.splits(room_id) });
    queryClient.invalidateQueries({ queryKey: ['room', room_id, 'member'] });
  };

  const updateExpenseMutation = useMutation({
    mutationFn: (p: { expenseId: number; changes: Parameters<typeof api.updateExpense>[2] }) =>
      api.updateExpense(room_id, p.expenseId, p.changes),
    onSuccess: (_data, p) => {
      invalidateExpenseData();
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseDetail(room_id, p.expenseId) });
      setEditing(false);
    },
    onError: (error) => {
      setEditError(error instanceof Error ? error.message : 'Failed to update expense');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: number) => api.deleteExpense(room_id, expenseId),
    onSuccess: (_data, expenseId) => {
      dismissDetail();
      // Drop the cached detail instead of refetching an expense that no longer exists.
      queryClient.removeQueries({ queryKey: queryKeys.expenseDetail(room_id, expenseId) });
      invalidateExpenseData();
    },
    onError: (error) => {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to delete expense');
    },
  });

  // The backend lets admins and the payer change an unsettled expense, as long as
  // the payer is still in the room.
  const payerId = detail?.payer_user_id ?? null;
  const payerLeft =
    payerId !== null && membersQuery.data !== undefined && !members.some((m) => m.user_id === payerId);
  const canEdit =
    (isAdmin || (payerId !== null && payerId === user?.id)) &&
    detail !== null &&
    !detail.settled &&
    detailError === '' &&
    !payerLeft;

  const startEdit = () => {
    if (!detail) return;
    setEditMaterial(detail.material);
    setEditMoney(String(detail.money));
    setEditDate(new Date(detail.created_at));
    // The payer is always part of the split, which also repairs older expenses that left them out.
    const ids = detail.participants.map((p) => p.user_id);
    setEditParticipantIds(payerId === null || ids.includes(payerId) ? ids : [...ids, payerId]);
    setEditError('');
    setEditing(true);
  };

  const toggleEditParticipant = (userId: number) => {
    if (userId === payerId) return;
    setEditParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  // Local calendar date, so it never shifts a day across the UTC boundary.
  const localDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const saveEdit = () => {
    if (!detail) return;
    const money = Number(editMoney);
    if (!editMaterial.trim() || !editMoney || Number.isNaN(money) || money <= 0) {
      setEditError('Please enter a valid item name and amount.');
      return;
    }
    // Send only what changed: a money or participant change re-splits the expense,
    // and resending the date would reset its time to midnight.
    const changes: Parameters<typeof api.updateExpense>[2] = {};
    if (editMaterial.trim() !== detail.material) changes.material = editMaterial.trim();
    if (money !== detail.money) changes.money = money;
    if (localDate(editDate) !== localDate(new Date(detail.created_at))) changes.created_at = localDate(editDate);
    const before = [...detail.participants.map((p) => p.user_id)].sort((a, b) => a - b);
    const after = [...editParticipantIds].sort((a, b) => a - b);
    if (before.join(',') !== after.join(',')) changes.participant_user_ids = editParticipantIds;

    setEditError('');
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    updateExpenseMutation.mutate({ expenseId: detail.id, changes });
  };

  const confirmDelete = () => {
    if (!detail) return;
    showAlert(
      'Delete expense?',
      `${detail.material} — ${formatAmount(detail.money)}, by ${detail.payer_name || 'Unknown'}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteExpenseMutation.mutate(detail.id) },
      ],
    );
  };

  const formatDisplayDate = (d: Date | null) =>
    d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  const openFilterModal = () => {
    setTempDateFrom(dateFrom ? new Date(dateFrom) : null);
    setTempDateTo(dateTo ? new Date(dateTo) : null);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setDateFrom(tempDateFrom ? tempDateFrom.toISOString().split('T')[0] : '');
    setDateTo(tempDateTo ? tempDateTo.toISOString().split('T')[0] : '');
    setShowFilterModal(false);
  };

  const clearAllFilters = () => {
    setSelectedMember(null);
    setDateFrom('');
    setDateTo('');
    setShowSettled(false);
    setTempDateFrom(null);
    setTempDateTo(null);
    setShowFilterModal(false);
  };

  const renderItem = ({ item }: any) => {
    if (item.type === 'header') {
      return (
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>{item.monthName}</Text>
          <Text style={styles.monthTotal}>{formatAmount(item.total)}</Text>
        </View>
      );
    }

    const userDisplayName = memberNameByEmail[item.user] || item.user;

    return (
      <TouchableOpacity
        style={[styles.expenseCard, item.settled && styles.expenseCardSettled]}
        activeOpacity={0.7}
        onPress={() => handleExpenseClick(item.id)}
      >
        <View style={styles.expenseIcon}>
          <View style={styles.iconFallback}>
            <Text style={styles.iconInitial}>
              {(userDisplayName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.expenseInfo}>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseUser} numberOfLines={1}>
              {userDisplayName || 'Unknown'}
            </Text>
            <Text style={styles.expenseAmount}>{formatAmount(item.money)}</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseMaterial} numberOfLines={2}>
              {item.material}
            </Text>
            <Text style={styles.expenseDate}>{formatShortDate(item.created_at)}</Text>
          </View>
          {item.settled && (
            <View style={styles.settledBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
              <Text style={styles.settledBadgeText}>Settled</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search + Filter button row */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search expenses..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={openFilterModal}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#fff' : '#9333ea'} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Member filter chips */}
      {members.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.memberChipsScroll}
          contentContainerStyle={styles.memberChips}
        >
          <TouchableOpacity
            style={[styles.chip, selectedMember === null && styles.chipActive]}
            onPress={() => setSelectedMember(null)}
          >
            <Text style={[styles.chipText, selectedMember === null && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {members.map((m) => (
            <TouchableOpacity
              key={m.user_id}
              style={[styles.chip, selectedMember === m.email && styles.chipActive]}
              onPress={() => setSelectedMember(selectedMember === m.email ? null : m.email)}
            >
              <Text style={[styles.chipText, selectedMember === m.email && styles.chipTextActive]}>
                {m.name || m.email}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9333ea" />
        </View>
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => expensesQuery.refetch()} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{ paddingBottom: 56 + insets.bottom + 32 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No expenses found</Text>
              <Text style={styles.emptyText}>Try adjusting your filters or add a new expense</Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color="#9333ea" />
            ) : expenses.length > 0 && !hasMore ? (
              <Text style={styles.endText}>No more expenses</Text>
            ) : null
          }
        />
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Status</Text>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setShowSettled((v) => !v)}
            >
              <Text style={styles.toggleLabel}>Show settled expenses</Text>
              <View style={[styles.toggleTrack, showSettled && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, showSettled && styles.toggleThumbActive]} />
              </View>
            </TouchableOpacity>

            <Text style={styles.filterLabel}>Date Range</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateBtn, tempDateFrom && styles.dateBtnActive]}
                onPress={() => setPickerTarget('from')}
              >
                <Ionicons name="calendar-outline" size={16} color={tempDateFrom ? '#9333ea' : '#999'} />
                <Text style={[styles.dateBtnText, tempDateFrom && styles.dateBtnTextActive]}>
                  {tempDateFrom ? formatDisplayDate(tempDateFrom) : 'From'}
                </Text>
                {tempDateFrom && (
                  <TouchableOpacity onPress={() => setTempDateFrom(null)}>
                    <Ionicons name="close-circle" size={16} color="#9333ea" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              <Text style={styles.dateSep}>–</Text>
              <TouchableOpacity
                style={[styles.dateBtn, tempDateTo && styles.dateBtnActive]}
                onPress={() => setPickerTarget('to')}
              >
                <Ionicons name="calendar-outline" size={16} color={tempDateTo ? '#9333ea' : '#999'} />
                <Text style={[styles.dateBtnText, tempDateTo && styles.dateBtnTextActive]}>
                  {tempDateTo ? formatDisplayDate(tempDateTo) : 'To'}
                </Text>
                {tempDateTo && (
                  <TouchableOpacity onPress={() => setTempDateTo(null)}>
                    <Ionicons name="close-circle" size={16} color="#9333ea" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>

            <DateTimePickerModal
              isVisible={pickerTarget !== null}
              mode="date"
              date={
                pickerTarget === 'from'
                  ? (tempDateFrom ?? new Date())
                  : (tempDateTo ?? new Date())
              }
              maximumDate={new Date()}
              onConfirm={(date) => {
                if (pickerTarget === 'from') setTempDateFrom(date);
                else setTempDateTo(date);
                setPickerTarget(null);
              }}
              onCancel={() => setPickerTarget(null)}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearAllFilters}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Expense Detail Modal — drag the top down, tap outside, or press back to close */}
      <Modal
        visible={detailOpen}
        transparent
        animationType="none"
        onShow={showSheet}
        onRequestClose={dismissDetail}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={[StyleSheet.absoluteFill, styles.sheetBackdrop, { opacity: backdropOpacity }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={dismissDetail}
              accessibilityLabel="Close expense details"
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalContent,
              styles.sheet,
              { paddingBottom: insets.bottom + 24, transform: [{ translateY: sheetY }] },
            ]}
          >
            <View testID="expense-detail-drag-handle" {...sheetPan.panHandlers}>
              <View style={styles.sheetGrabber} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Edit Expense' : 'Expense Details'}</Text>
                {canEdit && !editing && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={startEdit}
                    accessibilityLabel="Edit expense"
                    hitSlop={8}
                  >
                    <Ionicons name="pencil" size={16} color="#9333ea" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {detailLoading && (
              <ActivityIndicator size="large" color="#9333ea" style={{ paddingVertical: 24 }} />
            )}

            {!detailLoading && detailError !== '' && (
              <View style={styles.detailErrorBanner}>
                <Text style={styles.detailErrorBannerText}>{detailError}</Text>
              </View>
            )}

            {editing && (
              <View>
                <Text style={styles.filterLabel}>Item name</Text>
                <TextInput
                  style={styles.editInput}
                  value={editMaterial}
                  onChangeText={setEditMaterial}
                  placeholder="Item name"
                  placeholderTextColor="#999"
                  accessibilityLabel="Item name"
                />

                <Text style={styles.filterLabel}>Amount</Text>
                <TextInput
                  style={styles.editInput}
                  value={editMoney}
                  onChangeText={(t) => setEditMoney(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  placeholder="Amount"
                  placeholderTextColor="#999"
                  accessibilityLabel="Amount"
                />

                <Text style={styles.filterLabel}>Date</Text>
                <TouchableOpacity
                  style={[styles.dateBtn, styles.dateBtnActive, styles.editDateBtn]}
                  onPress={() => {
                    editDatePickerRef.current?.open();
                    setShowEditDatePicker(true);
                  }}
                  accessibilityLabel="Expense date"
                >
                  <Ionicons name="calendar-outline" size={16} color="#9333ea" />
                  <Text style={[styles.dateBtnText, styles.dateBtnTextActive]}>{formatDisplayDate(editDate)}</Text>
                </TouchableOpacity>
                <CrossPlatformDatePicker
                  ref={editDatePickerRef}
                  isVisible={showEditDatePicker}
                  mode="date"
                  date={editDate}
                  maximumDate={new Date()}
                  onConfirm={(d) => {
                    setEditDate(d);
                    setShowEditDatePicker(false);
                  }}
                  onCancel={() => setShowEditDatePicker(false)}
                />

                <Text style={styles.filterLabel}>Split with</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.editSplitList}
                  contentContainerStyle={styles.editSplitRow}
                >
                  {members.map((m) => {
                    const selected = editParticipantIds.includes(m.user_id);
                    const isPayer = m.user_id === payerId;
                    const label = m.name || m.email;
                    return (
                      <TouchableOpacity
                        key={m.user_id}
                        style={styles.editSplitPerson}
                        onPress={() => toggleEditParticipant(m.user_id)}
                        disabled={isPayer}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected, disabled: isPayer }}
                        accessibilityLabel={isPayer ? `${label} (paid)` : label}
                      >
                        <View style={[styles.avatarRing, selected ? styles.avatarRingOn : styles.avatarRingOff]}>
                          <Avatar
                            uri={m.profile}
                            label={label}
                            size={36}
                            fontSize={14}
                            backgroundColor={colors.purpleAvatar}
                            textColor={colors.brand}
                          />
                          {selected && (
                            <View style={styles.checkBadge}>
                              <Ionicons name="checkmark" size={9} color="#fff" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.splitName, !selected && styles.splitNameOff]} numberOfLines={1}>
                          {label.split(/[\s@]/)[0]}
                        </Text>
                        {isPayer && <Text style={styles.splitPaid}>paid</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {editError !== '' && (
                  <View style={styles.detailErrorBanner}>
                    <Text style={styles.detailErrorBannerText}>{editError}</Text>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.clearBtn} onPress={() => setEditing(false)}>
                    <Text style={styles.clearBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <ActionButton
                    style={styles.applyBtn}
                    onPress={saveEdit}
                    loading={updateExpenseMutation.isPending}
                  >
                    <Text style={styles.applyBtnText}>Save</Text>
                  </ActionButton>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={confirmDelete}
                  disabled={deleteExpenseMutation.isPending}
                >
                  <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  <Text style={styles.deleteBtnText}>Delete expense</Text>
                </TouchableOpacity>
              </View>
            )}

            {!editing && !detailLoading && detailError === '' && detail && (
              <View>
                <Text style={styles.detailMaterial}>{detail.material}</Text>
                <Text style={styles.detailSubtitle}>
                  {formatAmount(detail.money)} · paid by {detail.payer_name || 'Unknown'}
                </Text>
                {isAdmin && payerLeft && !detail.settled && (
                  <Text style={styles.detailHint}>
                    The person who paid has left the room, so this expense can't be changed.
                  </Text>
                )}

                <Text style={styles.filterLabel}>Participants</Text>

                {detail.participants.map((p) => {
                  const netColor = p.net > 0 ? '#16a34a' : p.net < 0 ? '#dc2626' : '#888';
                  return (
                    <View key={p.user_id} style={styles.participantRow}>
                      <View style={styles.participantLeft}>
                        <View style={styles.iconFallback}>
                          <Text style={styles.iconInitial}>
                            {(p.name || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.participantName}>{p.name || 'Unknown'}</Text>
                          <Text style={styles.participantMeta}>
                            paid {formatAmount(p.amount_paid)} · owes {formatAmount(p.amount_owed)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.participantNet, { color: netColor }]}>
                        {p.net > 0 ? '+' : ''}
                        {formatAmount(p.net)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#7e22ce',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  memberChipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  memberChips: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: '#9333ea',
    borderColor: '#9333ea',
  },
  chipText: { fontSize: 14, fontWeight: '500', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  iconInitial: { fontSize: 18, fontWeight: '700', color: '#9333ea' },
  expenseInfo: { flex: 1 },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  expenseUser: { flex: 1, marginRight: 8, fontSize: 15, fontWeight: '600', color: '#333' },
  expenseAmount: { flexShrink: 0, fontSize: 15, fontWeight: '700', color: '#333' },
  expenseMaterial: { flex: 1, marginRight: 8, fontSize: 13, color: '#888' },
  expenseDate: { flexShrink: 0, fontSize: 13, color: '#666' },
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
  expenseCardSettled: { backgroundColor: '#f0fdf4' },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  settledBadgeText: { fontSize: 11, color: '#16a34a', fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: { fontSize: 14, color: '#333' },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: { backgroundColor: '#9333ea' },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dateSep: { fontSize: 16, color: '#999' },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateBtnActive: {
    borderColor: '#c4b5fd',
    backgroundColor: '#f3e8ff',
  },
  dateBtnText: { flex: 1, fontSize: 14, color: '#999' },
  dateBtnTextActive: { color: '#9333ea', fontWeight: '500' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearBtnText: { color: '#666', fontWeight: '600' },
  applyBtn: {
    flex: 1,
    backgroundColor: '#9333ea',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '600' },
  detailMaterial: { fontSize: 17, fontWeight: '700', color: '#333' },
  detailSubtitle: { fontSize: 13, color: '#666', marginTop: 2, marginBottom: 16 },
  detailErrorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  detailErrorBannerText: { color: '#b91c1c', fontSize: 13 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  participantLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  participantName: { fontSize: 14, fontWeight: '600', color: '#333' },
  participantMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  participantNet: { fontSize: 14, fontWeight: '700' },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { paddingTop: 10 },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: 14,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
    color: '#333',
  },
  editDateBtn: { flex: 0, marginBottom: 16 },
  editSplitList: { marginBottom: 16 },
  editSplitRow: { gap: 4 },
  editSplitPerson: { width: 60, alignItems: 'center', gap: 4, paddingVertical: 4 },
  avatarRing: { borderRadius: 999, padding: 2, borderWidth: 2 },
  avatarRingOn: { borderColor: colors.brandMid },
  avatarRingOff: { borderColor: 'transparent', opacity: 0.35 },
  checkBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitName: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  splitNameOff: { color: colors.textMuted, textDecorationLine: 'line-through' },
  splitPaid: { fontSize: 10, color: colors.textMuted, marginTop: -4 },
  detailHint: { fontSize: 13, color: '#888', marginTop: -8, marginBottom: 16 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 14 },
});
