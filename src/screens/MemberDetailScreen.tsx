import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { formatCurrency, formatDate } from '../utils/format';
import { api } from '../services/api';
import { MemberDetail } from '../types/api';

export default function MemberDetailScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const member_id = Number(route.params.member_id);
  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMember = async () => {
    setLoading(true);
    try {
      const result = await api.getMemberDetail(room_id, member_id);
      setData(result);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load member');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMember();
  }, [room_id, member_id]);

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: '#faf5ff' }]}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{data.member.name}'s Account</Text>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Account Overview</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: '#f3fbf6' }]}>
            <Text style={[styles.statLabel, { color: '#166534' }]}>Total Purchases</Text>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>
              {formatCurrency(data.summary.total_purchases)}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: '#fdf3f3' }]}>
            <Text style={[styles.statLabel, { color: '#991b1b' }]}>Pending</Text>
            <Text style={[styles.statValue, { color: data.summary.pending_amount > 0 ? '#dc2626' : '#16a34a' }]}>
              {formatCurrency(data.summary.pending_amount)}
            </Text>
          </View>
        </View>

      </View>

      <Text style={styles.sectionTitle}>Purchase History</Text>
      {data.purchases.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No purchases found</Text>
        </View>
      ) : (
        data.purchases.map((p) => (
          <View key={p.expense_id} style={[styles.historyCard, p.settled && styles.historyCardSettled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyItem}>{p.material}</Text>
              <Text style={styles.historyDate}>{formatDate(p.created_at)}</Text>
              {p.settled && (
                <Text style={styles.settledLabel}>Settled</Text>
              )}
            </View>
            <Text style={[styles.historyAmount, { color: p.settled ? '#16a34a' : '#4caf50' }]}>
              {formatCurrency(Number(p.money))}
            </Text>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#9333ea', marginTop: 12, fontSize: 15 },
  heading: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 16 },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 1,
  },
  overviewTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#333' },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10, marginTop: 8 },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  historyItem: { fontSize: 15, fontWeight: '500', color: '#333' },
  historyDate: { fontSize: 12, color: '#888', marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: '700' },
  historyCardSettled: { backgroundColor: '#f0fdf4' },
  settledLabel: { fontSize: 11, color: '#16a34a', fontWeight: '500', marginTop: 2 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: { color: '#888', fontSize: 14 },
});
