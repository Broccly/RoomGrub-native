import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useUserRole from '../hooks/useUserRole';
import { formatAmount } from '../utils/format';
import { api } from '../services/api';
import { SplitsSummary } from '../types/api';

export default function SplitsScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const { role } = useUserRole();
  const [isSettling, setIsSettling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<SplitsSummary | null>(null);

  const loadSummary = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await api.getSplitsSummary(room_id);
      setSummary(data);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load splits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [room_id]);

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
              Alert.alert('Success', `${result.settled_count} balance entries settled.`);
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
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSummary(true)} />}>
      <Text style={styles.heading}>Splits</Text>
      <Text style={styles.subheading}>
        Split expenses and settle all balances
      </Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#ede9fe' }]}>
          <Text style={styles.summaryLabel}>Total Pending</Text>
          <Text style={styles.summaryValue}>
            {formatAmount(summary.total_pending_expenses)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={styles.summaryLabel}>Per Person</Text>
          <Text style={styles.summaryValue}>
            {formatAmount(summary.equal_share)}
          </Text>
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
              mb.status === 'credit'
                ? '#dcfce7'
                : mb.status === 'debit'
                ? '#fee2e2'
                : '#f3f4f6';

            return (
              <View
                key={mb.user_id}
                style={[styles.memberCard, { backgroundColor: cardColor }]}
              >
                <View style={styles.memberHeader}>
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {(mb.member.name || mb.member.email)
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {mb.member.name || mb.member.email}
                    </Text>
                    <Text style={styles.pendingText}>
                      Pending: {formatAmount(mb.pending_amount)}
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
                        mb.status === 'credit'
                          ? '#4caf50'
                          : mb.status === 'debit'
                          ? '#ef4444'
                          : '#888'
                      }
                    />
                    <Text style={styles.balanceAmount}>
                      {mb.status === 'even'
                        ? '₹0'
                        : formatAmount(mb.balance)}
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
                {isSettling
                  ? 'Settling...'
                  : `Settle All (${summary.pending_settlements_count})`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#888', marginBottom: 20 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: { fontSize: 12, fontWeight: '500', color: '#555', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#333' },
  allClearContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  allClearTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2e7d32',
    marginTop: 12,
  },
  allClearText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 300,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
});
