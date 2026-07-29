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
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import useUserRole from '../hooks/useUserRole';
import { useRoomContext } from '../context/RoomContext';
import { formatAmount } from '../utils/format';
import { api } from '../services/api';
import { SplitsData, UserSummary } from '../types/api';
import { computeSplitsFiltered, ComputedSplits } from '../utils/splitCalculations';

const formatDisplayDate = (d: Date | null) =>
  d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function SplitsScreen() {
  const { roomId } = useRoomContext();
  const { role } = useUserRole();
  const [isSettling, setIsSettling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [splitsData, setSplitsData] = useState<SplitsData | null>(null);
  const [members, setMembers] = useState<UserSummary[]>([]);

  // Applied filters
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);
  const [tempEmails, setTempEmails] = useState<Set<string>>(new Set());
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);

  const activeFilterCount =
    (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (selectedEmails.size > 0 ? 1 : 0);

  const computed: ComputedSplits | null = splitsData
    ? computeSplitsFiltered(splitsData, {
        dateFrom,
        dateTo,
        memberEmails: selectedEmails.size > 0 ? Array.from(selectedEmails) : undefined,
      })
    : null;

  const loadSplits = useCallback(
    async (isRefresh = false) => {
      if (!roomId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await api.getSplits(roomId);
        setSplitsData(data);
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load splits');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roomId],
  );

  useEffect(() => {
    if (!roomId) return;
    api.listMembers(roomId).then(setMembers).catch(() => {});
  }, [roomId]);

  useFocusEffect(
    useCallback(() => {
      loadSplits();
    }, [loadSplits])
  );

  const openFilterModal = () => {
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setTempEmails(new Set(selectedEmails));
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setSelectedEmails(new Set(tempEmails));
    setShowFilterModal(false);
  };

  const clearAllFilters = () => {
    setTempDateFrom(null);
    setTempDateTo(null);
    setTempEmails(new Set());
  };

  const toggleTempMember = (email: string) => {
    setTempEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const handleSettleAll = () => {
    if (!roomId || !computed) return;

    Alert.alert(
      'Settle All',
      `Settle all ${computed.pendingSettlements.length} pending balances?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            setIsSettling(true);
            try {
              await api.settleAll(
                roomId,
                computed.pendingSettlements.map((mb) => ({
                  user_email: mb.member.user_email,
                  pending_amount: mb.balance,
                })),
                {
                  date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
                  date_to: dateTo ? dateTo.toISOString().split('T')[0] : null,
                  member_emails: selectedEmails.size > 0 ? Array.from(selectedEmails) : null,
                },
              );
              Alert.alert('Success', 'Balances settled.');
              await loadSplits(true);
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

  if (loading || !computed) {
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSplits(true)} />}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#ede9fe' }]}>
            <Text style={styles.summaryLabel}>Total Pending</Text>
            <Text style={styles.summaryValue}>{formatAmount(computed.totalPendingExpenses)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
            <Text style={styles.summaryLabel}>Transfers Needed</Text>
            <Text style={styles.summaryValue}>{computed.settlements.length}</Text>
          </View>
        </View>

        {computed.pendingSettlements.length === 0 ? (
          <View style={styles.allClearContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
            <Text style={styles.allClearTitle}>All Clear!</Text>
            <Text style={styles.allClearText}>
              No pending expenses to settle. Everyone is even!
            </Text>
          </View>
        ) : (
          <>
            {computed.memberBalances.map((mb) => {
              const cardColor =
                mb.status === 'credit' ? '#dcfce7' : mb.status === 'debit' ? '#fee2e2' : '#f3f4f6';

              return (
                <View key={mb.member.user_email} style={[styles.memberCard, { backgroundColor: cardColor }]}>
                  <View style={styles.memberHeader}>
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>
                        {(mb.member.name || mb.member.user_email).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{mb.member.name || mb.member.user_email}</Text>
                      <Text style={styles.pendingText}>
                        {mb.status === 'credit' ? 'Gets back' : mb.status === 'debit' ? 'Owes' : 'Settled up'}
                      </Text>
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

            {computed.settlements.length > 0 && (
              <View style={styles.whoPaysSection}>
                <Text style={styles.whoPaysHeading}>Who Pays Whom</Text>
                {computed.settlements.map((s, idx) => (
                  <View key={`${s.from_user_email}-${s.to_user_email}-${idx}`} style={styles.whoPaysCard}>
                    <Text style={styles.whoPaysName}>{s.from_name || s.from_user_email}</Text>
                    <Text style={styles.whoPaysVerb}>pays</Text>
                    <Text style={styles.whoPaysName}>{s.to_name || s.to_user_email}</Text>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.whoPaysAmount}>{formatAmount(s.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {role === 'Admin' && (
              <TouchableOpacity
                style={[styles.settleButton, isSettling && { opacity: 0.6 }]}
                onPress={handleSettleAll}
                disabled={isSettling}
              >
                <Text style={styles.settleButtonText}>
                  {isSettling ? 'Settling...' : `Settle All (${computed.pendingSettlements.length})`}
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
                    style={[styles.chip, tempEmails.size === 0 && styles.chipActive]}
                    onPress={() => setTempEmails(new Set())}
                  >
                    <Text style={[styles.chipText, tempEmails.size === 0 && styles.chipTextActive]}>All</Text>
                  </TouchableOpacity>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.email}
                      style={[styles.chip, tempEmails.has(m.email) && styles.chipActive]}
                      onPress={() => toggleTempMember(m.email)}
                    >
                      <Text style={[styles.chipText, tempEmails.has(m.email) && styles.chipTextActive]}>
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
  whoPaysSection: { marginTop: 4, marginBottom: 8 },
  whoPaysHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  whoPaysCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 6,
  },
  whoPaysName: { fontSize: 14, fontWeight: '600', color: '#333' },
  whoPaysVerb: { fontSize: 14, color: '#888' },
  whoPaysAmount: { fontSize: 14, fontWeight: '700', color: '#7e22ce' },
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
