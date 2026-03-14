import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import useUserRole from '../hooks/useUserRole';
import { formatCurrency, formatDate } from '../utils/format';
import { api } from '../services/api';
import { MemberDetail } from '../types/api';

export default function MemberDetailScreen({ route, navigation }: any) {
  const room_id = Number(route.params.room_id);
  const member_id = Number(route.params.member_id);
  const { role, loading: roleLoading } = useUserRole();

  const [data, setData] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [isSettling, setIsSettling] = useState(false);
  const [showContribution, setShowContribution] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSettlePayment = () => {
    if (!data || data.summary.pending_amount <= 0) return;

    Alert.alert('Confirm', `Settle payment of ${formatCurrency(data.summary.pending_amount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: async () => {
          setIsSettling(true);
          try {
            await api.createPayment(room_id, {
              user_id: data.member.user_id,
              amount: Math.abs(data.summary.pending_amount),
              status: 'debit',
            });
            Alert.alert('Success', 'Payment settled');
            loadMember();
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to settle payment');
          } finally {
            setIsSettling(false);
          }
        },
      },
    ]);
  };

  const handleContribution = async () => {
    if (!data) return;

    const amount = Number(contributionAmount);
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await api.createPayment(room_id, {
        user_id: data.member.user_id,
        amount,
        status: 'credit',
      });
      Alert.alert('Success', 'Contribution recorded');
      setContributionAmount('');
      setShowContribution(false);
      loadMember();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to record contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: '#f0f0f0' }]}>
        <ActivityIndicator size="large" color="#7b61ff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{data.member.name}'s Account</Text>

      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Account Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Purchases</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {formatCurrency(data.summary.total_purchases)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Amount Received</Text>
            <Text style={[styles.statValue, { color: '#7b61ff' }]}>
              {formatCurrency(data.summary.total_received)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Contributions</Text>
            <Text style={[styles.statValue, { color: '#ff9800' }]}>
              {formatCurrency(data.summary.total_contributed)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text
              style={[
                styles.statValue,
                { color: data.summary.pending_amount > 0 ? '#ef4444' : '#4caf50' },
              ]}
            >
              {formatCurrency(data.summary.pending_amount)}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          {data.summary.pending_amount > 0 && !roleLoading && role === 'Admin' && (
            <TouchableOpacity
              style={styles.settleButton}
              onPress={handleSettlePayment}
              disabled={isSettling}
            >
              <Text style={styles.settleButtonText}>
                {isSettling ? 'Settling...' : `Settle (${formatCurrency(data.summary.pending_amount)})`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.contributeButton}
            onPress={() => setShowContribution(true)}
          >
            <Text style={styles.contributeButtonText}>Contribute</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Purchase History</Text>
      {data.purchases.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No purchases found</Text>
        </View>
      ) : (
        data.purchases.map((p) => (
          <View key={p.expense_id} style={styles.historyCard}>
            <View>
              <Text style={styles.historyItem}>{p.material}</Text>
              <Text style={styles.historyDate}>{formatDate(p.created_at)}</Text>
            </View>
            <Text style={[styles.historyAmount, { color: '#4caf50' }]}>
              {formatCurrency(Number(p.money))}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Payment History</Text>
      {data.payments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No payments found</Text>
        </View>
      ) : (
        data.payments.map((p) => (
          <View key={p.payment_id} style={styles.historyCard}>
            <View>
              <Text style={styles.historyItem}>
                {p.status === 'credit' ? 'Money In' : 'Money Out'}
              </Text>
              <Text style={styles.historyDate}>{formatDate(p.created_at)}</Text>
            </View>
            <Text
              style={[
                styles.historyAmount,
                { color: p.status === 'credit' ? '#4caf50' : '#ff9800' },
              ]}
            >
              {p.status === 'credit' ? '+' : ''}{formatCurrency(Math.abs(Number(p.amount)))}
            </Text>
          </View>
        ))
      )}

      <Modal visible={showContribution} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Contribution</Text>
            <Text style={styles.modalLabel}>
              Record {data.member?.name}'s contribution to the room.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={contributionAmount}
              onChangeText={(text) => setContributionAmount(text.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.contributeSubmit}
                onPress={handleContribution}
                disabled={isSubmitting}
              >
                <Text style={styles.contributeSubmitText}>
                  {isSubmitting ? 'Saving...' : 'Contribute'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowContribution(false);
                  setContributionAmount('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#7b61ff', marginTop: 12, fontSize: 15 },
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
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
  },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  settleButton: {
    flex: 1,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  settleButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  contributeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#7b61ff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  contributeButtonText: { color: '#7b61ff', fontWeight: '600', fontSize: 14 },
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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: { color: '#888', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#333' },
  modalLabel: { fontSize: 14, color: '#666', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  modalButtonRow: { flexDirection: 'row', gap: 8 },
  contributeSubmit: {
    flex: 1,
    backgroundColor: '#7b61ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  contributeSubmitText: { color: '#fff', fontWeight: '600' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666' },
});
