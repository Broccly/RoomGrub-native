import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { formatCurrency } from '../utils/format';
import { api } from '../services/api';
import { UserSummary, ExpenseItem, PaymentItem } from '../types/api';

export default function AdminScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [membersResult, expensesResult, paymentsResult] = await Promise.all([
        api.listMembers(room_id),
        api.listExpenses(room_id, { limit: 200 }),
        api.listPayments(room_id, { limit: 200 }),
      ]);

      setMembers(membersResult.members);
      setExpenses(expensesResult.items);
      setPayments(paymentsResult.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [room_id]);

  const { memberStats, totalRoomStats } = useMemo(() => {
    const purchasesByUser = new Map<number, ExpenseItem[]>();
    const paymentsByUser = new Map<number, PaymentItem[]>();

    expenses.forEach((p) => {
      if (!p.user_id) return;
      if (!purchasesByUser.has(p.user_id)) purchasesByUser.set(p.user_id, []);
      purchasesByUser.get(p.user_id)!.push(p);
    });

    payments.forEach((p) => {
      if (!p.user_id) return;
      if (!paymentsByUser.has(p.user_id)) paymentsByUser.set(p.user_id, []);
      paymentsByUser.get(p.user_id)!.push(p);
    });

    const stats = members.map((member) => {
      const memberPurchases = purchasesByUser.get(member.user_id) || [];
      const memberPayments = paymentsByUser.get(member.user_id) || [];

      const totalPurchases = memberPurchases.reduce(
        (sum, p) => sum + Number(p.money),
        0
      );
      const purchaseSettlements = memberPayments.filter((p) => p.status === 'debit');
      const monthlyContributions = memberPayments.filter((p) => p.status === 'credit');

      const totalReceived = purchaseSettlements.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const totalContributed = monthlyContributions.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      const pendingAmount = totalPurchases + totalReceived;

      return {
        member,
        totalPurchases,
        totalReceived,
        totalContributed,
        pendingAmount,
        status: pendingAmount > 0 ? 'pending' : 'settled',
      };
    });

    const roomTotals = stats.reduce(
      (acc, stat) => ({
        totalPurchases: acc.totalPurchases + stat.totalPurchases,
        totalPaid: acc.totalPaid + stat.totalReceived,
        totalContributions: acc.totalContributions + stat.totalContributed,
        pendingPayments:
          acc.pendingPayments +
          (stat.pendingAmount > 0 ? stat.pendingAmount : 0),
      }),
      {
        totalPurchases: 0,
        totalPaid: 0,
        totalContributions: 0,
        pendingPayments: 0,
      }
    );

    return { memberStats: stats, totalRoomStats: roomTotals };
  }, [members, expenses, payments]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}>
      <Text style={styles.heading}>Admin Dashboard</Text>

      <View style={styles.overviewCard}>
        <Text style={styles.cardTitle}>Room Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Purchases</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {formatCurrency(totalRoomStats.totalPurchases)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Paid Out</Text>
            <Text style={[styles.statValue, { color: '#9333ea' }]}>
              {formatCurrency(totalRoomStats.totalPaid)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Contributions</Text>
            <Text style={[styles.statValue, { color: '#ff9800' }]}>
              {formatCurrency(totalRoomStats.totalContributions)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending Payments</Text>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>
              {formatCurrency(totalRoomStats.pendingPayments)}
            </Text>
          </View>
        </View>
      </View>

      {totalRoomStats.pendingPayments > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertText}>
            Total pending: {formatCurrency(totalRoomStats.pendingPayments)}
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Members</Text>
      {memberStats.map((stat) => (
        <View key={stat.member.user_id} style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.avatarText}>
              {stat.member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{stat.member.name}</Text>
            <Text style={styles.memberEmail}>{stat.member.email}</Text>
          </View>
          <View style={styles.memberStats}>
            <Text
              style={[
                styles.memberAmount,
                {
                  color:
                    stat.pendingAmount > 0 ? '#ef4444' : '#4caf50',
                },
              ]}
            >
              {formatCurrency(stat.pendingAmount)}
            </Text>
            <Text
              style={[
                styles.memberStatus,
                {
                  color:
                    stat.status === 'pending' ? '#ef4444' : '#4caf50',
                },
              ]}
            >
              {stat.status}
            </Text>
          </View>
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 16 },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#333' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
  },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  alertCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  alertText: { color: '#b91c1c', fontWeight: '600', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#555' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#333' },
  memberEmail: { fontSize: 12, color: '#888' },
  memberStats: { alignItems: 'flex-end' },
  memberAmount: { fontSize: 16, fontWeight: '700' },
  memberStatus: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
});
