import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { formatAmount, formatShortDate, formatMonthYear } from '../utils/format';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { ExpenseItem } from '../types/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function ExpensesScreen({ route }: any) {
  const room_id = Number(route.params.room_id);

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
    setDetailExpenseId(expenseId);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailExpenseId(null);
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
            <Text style={styles.expenseUser}>
              {userDisplayName || 'Unknown'}
            </Text>
            <Text style={styles.expenseAmount}>{formatAmount(item.money)}</Text>
          </View>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseMaterial}>{item.material}</Text>
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
          <View style={styles.modalContent}>
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

      {/* Expense Detail Modal */}
      <Modal visible={detailOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expense Details</Text>
              <TouchableOpacity testID="close-expense-detail" onPress={closeDetail}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {detailLoading && (
              <ActivityIndicator size="large" color="#9333ea" style={{ paddingVertical: 24 }} />
            )}

            {!detailLoading && detailError !== '' && (
              <View style={styles.detailErrorBanner}>
                <Text style={styles.detailErrorBannerText}>{detailError}</Text>
              </View>
            )}

            {!detailLoading && detailError === '' && detail && (
              <View>
                <Text style={styles.detailMaterial}>{detail.material}</Text>
                <Text style={styles.detailSubtitle}>
                  {formatAmount(detail.money)} · paid by {detail.payer_name || 'Unknown'}
                </Text>

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
          </View>
        </View>
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
});
