import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { formatCurrency } from '../utils/format';
import { MOCK_USERS, MOCK_EXPENSES, MOCK_BALANCE } from '../utils/mockData';

export default function AdminScreen({ route, navigation }: any) {
  const { room_id } = route.params;

  const { memberStats, totalRoomStats } = useMemo(() => {
    const membersData = MOCK_USERS;
    const allPurchases = MOCK_EXPENSES;
    const allPayments = MOCK_BALANCE;

    const purchasesByUser = new Map<string, any[]>();
    const paymentsByUser = new Map<string, any[]>();

    allPurchases.forEach((p) => {
      if (!purchasesByUser.has(p.user)) purchasesByUser.set(p.user, []);
      purchasesByUser.get(p.user)!.push(p);
    });

    allPayments.forEach((p) => {
      if (!paymentsByUser.has(p.user)) paymentsByUser.set(p.user, []);
      paymentsByUser.get(p.user)!.push(p);
    });

    const stats = membersData.map((member) => {
      const purchases = purchasesByUser.get(member.email) || [];
      const payments = paymentsByUser.get(member.email) || [];

      const totalPurchases = purchases.reduce(
        (sum, p) => sum + parseFloat(p.money),
        0
      );
      const purchaseSettlements = payments.filter((p) => p.status === 'debit');
      const monthlyContributions = payments.filter((p) => p.status === 'credit');

      const totalReceived = purchaseSettlements.reduce(
        (sum, p) => sum + parseFloat(p.amount),
        0
      );
      const totalContributed = monthlyContributions.reduce(
        (sum, p) => sum + parseFloat(p.amount),
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
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Admin Dashboard</Text>

      {/* Room Overview */}
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
            <Text style={[styles.statValue, { color: '#7b61ff' }]}>
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

      {/* Pending Payments Alert */}
      {totalRoomStats.pendingPayments > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertText}>
            Total pending: {formatCurrency(totalRoomStats.pendingPayments)}
          </Text>
        </View>
      )}

      {/* Members List */}
      <Text style={styles.sectionTitle}>Members</Text>
      {memberStats.map((stat) => (
        <View key={stat.member.id} style={styles.memberCard}>
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
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 16 },
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
