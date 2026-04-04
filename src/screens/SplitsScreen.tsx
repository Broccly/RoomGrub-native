import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import useUserRole from '../hooks/useUserRole';
import { formatAmount } from '../utils/format';
import { api } from '../services/api';
import { SplitsSummary, UserSummary } from '../types/api';

const formatDisplayDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function SplitsScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const { role } = useUserRole();
  const [isSettling, setIsSettling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<SplitsSummary | null>(null);
  const [members, setMembers] = useState<UserSummary[]>([]);

  // Applied filters
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
  const [tempMembers, setTempMembers] = useState<Set<number>>(new Set());
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);

  const activeFilterCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (selectedMembers.size > 0 ? 1 : 0);

  const buildQuery = useCallback(
    (from: Date | null, to: Date | null, memberIds: Set<number>) => {
      const q: Record<string, string | undefined> = {};
      if (from) q.date_from = from.toISOString().split('T')[0];
      if (to) q.date_to = to.toISOString().split('T')[0];
      if (memberIds.size > 0) q.user_ids = Array.from(memberIds).join(',');
      return q;
    },
    [],
  );

  const loadSummary = async (
    isRefresh = false,
    from = dateFrom,
    to = dateTo,
    memberIds = selectedMembers,
  ) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const query = buildQuery(from, to, memberIds);
      const data = await api.getSplitsSummary(room_id, Object.keys(query).length ? query : undefined);
      setSummary(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load splits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    api.listMembers(room_id)
      .then((res) => setMembers(res.members))
      .catch(() => {});
    loadSummary();
  }, [room_id]);

  const openFilterModal = () => {
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setTempMembers(new Set(selectedMembers));
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setSelectedMembers(new Set(tempMembers));
    setShowFilterModal(false);
    loadSummary(false, tempDateFrom, tempDateTo, tempMembers);
  };

  const clearAllFilters = () => {
    setTempDateFrom(null);
    setTempDateTo(null);
    setTempMembers(new Set());
  };

  const toggleTempMember = (id: number) => {
    setTempMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSettleAll = () => {
    if (!summary) return;

    Alert.alert(
      'Settle All',
      `Settle all ${summary.pending_settlements_count} pending balances?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            setIsSettling(true);
            try {
              const result = await api.settleAll(room_id);
              Alert.alert('Success', `${result.expenses_settled} expense${result.expenses_settled !== 1 ? 's' : ''} settled.`);
              await loadSummary(true);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to settle balances');
            } finally {
              setIsSettling(false);
            }
          },
        },
      ]
    );
  };

  if (loading || !summary) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Splits</Text>
          <Text style={styles.subheading}>Split expenses and settle all balances</Text>
        </View>
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

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSummary(true)} />}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#ede9fe' }]}>
            <Text style={styles.summaryLabel}>Total Pending</Text>
            <Text style={styles.summaryValue}>{formatAmount(summary.total_pending_expenses)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.summaryLabel}>Per Person</Text>
            <Text style={styles.summaryValue}>{formatAmount(summary.equal_share)}</Text>
          </View>
        </View>

        {summary.pending_settlements_count === 0 ? (
          <View style={styles.allClearContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
            <Text style={styles.allClearTitle}>All Clear!</Text>
            <Text style={styles.allClearText}>
              No pending expenses to settle. Everyone is even!
            </Text>
          </View>
        ) : (
          <>
            {summary.member_balances.map((mb) => {
              const cardColor =
                mb.status === 'credit' ? '#dcfce7' : mb.status === 'debit' ? '#fee2e2' : '#f3f4f6';

              return (
                <View key={mb.user_id} style={[styles.memberCard, { backgroundColor: cardColor }]}>
                  <View style={styles.memberHeader}>
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {(mb.member.name || mb.member.email).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{mb.member.name || mb.member.email}</Text>
                      <Text style={styles.pendingText}>Pending: {formatAmount(mb.pending_amount)}</Text>
                    </View>
                    <View style={styles.balanceContainer}>
                      <Ionicons
                        name={
                          mb.status === 'credit'
                            ? 'trending-up'
                            : mb.status === 'debit'
                            ? 'trending-down'
                            : 'checkmark-circle'
                        }
                        size={20}
                        color={
                          mb.status === 'credit' ? '#4caf50' : mb.status === 'debit' ? '#ef4444' : '#888'
                        }
                      />
                      <Text style={styles.balanceAmount}>
                        {mb.status === 'even' ? '₹0' : formatAmount(mb.balance)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {role === 'Admin' && (
              <TouchableOpacity
                style={[styles.settleButton, isSettling && { opacity: 0.6 }]}
                onPress={handleSettleAll}
                disabled={isSettling}
              >
                <Text style={styles.settleButtonText}>
                  {isSettling ? 'Settling...' : `Settle All (${summary.pending_settlements_count})`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

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

            {members.length > 0 && (
              <>
                <Text style={styles.filterLabel}>Member</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.memberChipsScroll}
                  contentContainerStyle={styles.memberChips}
                >
                  <TouchableOpacity
                    style={[styles.chip, tempMembers.size === 0 && styles.chipActive]}
                    onPress={() => setTempMembers(new Set())}
                  >
                    <Text style={[styles.chipText, tempMembers.size === 0 && styles.chipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.user_id}
                      style={[styles.chip, tempMembers.has(m.user_id) && styles.chipActive]}
                      onPress={() => toggleTempMember(m.user_id)}
                    >
                      <Text style={[styles.chipText, tempMembers.has(m.user_id) && styles.chipTextActive]}>
                        {m.name || m.email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <DateTimePickerModal
              isVisible={pickerTarget !== null}
              mode="date"
              date={pickerTarget === 'from' ? (tempDateFrom ?? new Date()) : (tempDateTo ?? new Date())}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#faf5ff' },
  container: { flex: 1, padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#888' },
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 14 },
  summaryLabel: { fontSize: 12, fontWeight: '500', color: '#555', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#333' },
  allClearContainer: { alignItems: 'center', paddingVertical: 48 },
  allClearTitle: { fontSize: 24, fontWeight: '700', color: '#2e7d32', marginTop: 12 },
  allClearText: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', maxWidth: 300 },
  memberCard: { borderRadius: 12, padding: 16, marginBottom: 10 },
  memberHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#555' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#333' },
  pendingText: { fontSize: 12, color: '#888', marginTop: 2 },
  balanceContainer: { alignItems: 'flex-end' },
  balanceAmount: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 4 },
  settleButton: {
    backgroundColor: '#7e22ce',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  settleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
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
  dateBtnActive: { borderColor: '#c4b5fd', backgroundColor: '#f3e8ff' },
  dateBtnText: { flex: 1, fontSize: 14, color: '#999' },
  dateBtnTextActive: { color: '#9333ea', fontWeight: '500' },
  memberChipsScroll: { flexGrow: 0, flexShrink: 0 },
  memberChips: {
    paddingBottom: 16,
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
  chipActive: { backgroundColor: '#9333ea', borderColor: '#9333ea' },
  chipText: { fontSize: 14, fontWeight: '500', color: '#666', lineHeight: 18 },
  chipTextActive: { color: '#fff' },
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
});
