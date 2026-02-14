import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import useUserRole from '../hooks/useUserRole';
import { formatCurrency, formatDate } from '../utils/format';
import { MOCK_USERS, MOCK_EXPENSES, MOCK_BALANCE } from '../utils/mockData';

export default function MemberDetailScreen({ route, navigation }: any) {
  const { room_id, member_id } = route.params;
  const { role, loading: roleLoading } = useUserRole();

  const [isSettling, setIsSettling] = useState(false);
  const [showContribution, setShowContribution] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const member = MOCK_USERS.find((u) => u.id === member_id) || null;
  const purchases = useMemo(
    () => MOCK_EXPENSES.filter((e) => member && e.user === member.email),
    [member]
  );
  const payments = useMemo(
    () => MOCK_BALANCE.filter((b) => member && b.user === member.email),
    [member]
  );

  const summary = useMemo(() => {
    const totalPurchases = purchases.reduce((sum, p) => sum + parseFloat(p.money), 0);
    const purchaseSettlements = payments.filter((p) => p.status === 'debit');
    const monthlyContributions = payments.filter((p) => p.status === 'credit');
    const totalReceived = purchaseSettlements.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalContributed = monthlyContributions.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const pendingAmount = totalPurchases + totalReceived;
    return { totalPurchases, totalReceived, totalContributed, pendingAmount };
  }, [purchases, payments]);

  const handleSettlePayment = () => {
    if (summary.pendingAmount <= 0) return;
    Alert.alert('Confirm', `Settle payment of ${formatCurrency(summary.pendingAmount)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle',
        onPress: () => {
          setIsSettling(true);
          setTimeout(() => {
            Alert.alert('Success', 'Payment settled! (mock)');
            setIsSettling(false);
          }, 500);
        },
      },
    ]);
  };

  const handleContribution = () => {
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) return;
    setIsSubmitting(true);
    setTimeout(() => {
      Alert.alert('Success', 'Contribution recorded! (mock)');
      setContributionAmount('');
      setShowContribution(false);
      setIsSubmitting(false);
    }, 500);
  };

  if (!member) {
    return (
      <View style={styles.center}>
        <Text>Member not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{member.name}'s Account</Text>

      {/* Account Overview */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>Account Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Purchases</Text>
            <Text style={[styles.statValue, { color: '#4caf50' }]}>
              {formatCurrency(summary.totalPurchases)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Amount Received</Text>
            <Text style={[styles.statValue, { color: '#7b61ff' }]}>
              {formatCurrency(summary.totalReceived)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Contributions</Text>
            <Text style={[styles.statValue, { color: '#ff9800' }]}>
              {formatCurrency(summary.totalContributed)}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text
              style={[
                styles.statValue,
                { color: summary.pendingAmount > 0 ? '#ef4444' : '#4caf50' },
              ]}
            >
              {formatCurrency(summary.pendingAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          {summary.pendingAmount > 0 && !roleLoading && role === 'Admin' && (
            <TouchableOpacity
              style={styles.settleButton}
              onPress={handleSettlePayment}
              disabled={isSettling}
            >
              <Text style={styles.settleButtonText}>
                {isSettling ? 'Settling...' : `Settle (${formatCurrency(summary.pendingAmount)})`}
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

      {/* Purchase History */}
      <Text style={styles.sectionTitle}>Purchase History</Text>
      {purchases.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No purchases found</Text>
        </View>
      ) : (
        purchases.map((p) => (
          <View key={p.id} style={styles.historyCard}>
            <View>
              <Text style={styles.historyItem}>{p.material}</Text>
              <Text style={styles.historyDate}>{formatDate(p.created_at)}</Text>
            </View>
            <Text style={[styles.historyAmount, { color: '#4caf50' }]}>
              {formatCurrency(parseFloat(p.money))}
            </Text>
          </View>
        ))
      )}

      {/* Payment History */}
      <Text style={styles.sectionTitle}>Payment History</Text>
      {payments.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No payments found</Text>
        </View>
      ) : (
        payments.map((p) => (
          <View key={p.id} style={styles.historyCard}>
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
              {p.status === 'credit' ? '+' : ''}{formatCurrency(parseFloat(p.amount))}
            </Text>
          </View>
        ))
      )}

      {/* Contribution Modal */}
      <Modal visible={showContribution} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Contribution</Text>
            <Text style={styles.modalLabel}>
              Record {member?.name}'s contribution to the room.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={contributionAmount}
              onChangeText={setContributionAmount}
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
