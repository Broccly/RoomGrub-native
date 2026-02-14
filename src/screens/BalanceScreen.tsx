import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { formatDate } from '../utils/format';
import { MOCK_BALANCE } from '../utils/mockData';

export default function BalanceScreen({ route }: any) {
  const { room_id } = route.params;

  const balanceData = useMemo(() => {
    const transactions = [...MOCK_BALANCE].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const totalCredit = transactions.reduce(
      (sum, t) => (t.status === 'credit' ? sum + parseFloat(t.amount) : sum),
      0
    );
    const totalDebit = transactions.reduce(
      (sum, t) => (t.status === 'debit' ? sum + parseFloat(t.amount) : sum),
      0
    );

    return {
      totalCredit,
      totalDebit,
      currentBalance: totalCredit + totalDebit,
      transactions,
    };
  }, []);

  const { totalCredit, totalDebit, currentBalance, transactions } = balanceData;
  const debitAbs = Math.abs(totalDebit);
  const progressRatio = totalCredit > 0 ? debitAbs / totalCredit : 0;

  return (
    <ScrollView style={styles.container}>
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <Text style={styles.balanceAmount}>
          ₹{currentBalance.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.balanceSubtext}>Balance Available</Text>

        <View style={styles.amountRow}>
          <Text style={styles.debitAmount}>
            ₹{debitAbs.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.creditAmount}>
            ₹{totalCredit.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressDebit,
              { width: `${Math.min(progressRatio * 100, 100)}%` },
            ]}
          />
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.debitLabel}>Balance Used</Text>
          <Text style={styles.creditLabel}>Total Balance</Text>
        </View>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No transactions found.</Text>
        </View>
      ) : (
        transactions.map((txn, idx) => (
          <View key={txn.id || idx} style={styles.txnCard}>
            <View
              style={[
                styles.txnIcon,
                {
                  backgroundColor:
                    txn.status === 'credit' ? '#e8f5e9' : '#ffebee',
                },
              ]}
            >
              <Text
                style={{
                  color: txn.status === 'credit' ? '#388e3c' : '#d32f2f',
                  fontWeight: '700',
                  fontSize: 18,
                }}
              >
                {txn.status === 'credit' ? '+' : '-'}
              </Text>
            </View>
            <View style={styles.txnInfo}>
              <Text style={styles.txnUser}>{txn.user || 'Unknown User'}</Text>
              <Text style={styles.txnDate}>{formatDate(txn.created_at)}</Text>
            </View>
            <Text
              style={[
                styles.txnAmount,
                {
                  color:
                    txn.status === 'credit' ? '#388e3c' : '#d32f2f',
                },
              ]}
            >
              {txn.status === 'credit' ? '₹+' : '₹'}
              {parseFloat(txn.amount).toLocaleString('en-IN')}
            </Text>
          </View>
        ))
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 16 },
  balanceCard: {
    backgroundColor: '#f5f3ff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 13, color: '#888' },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: '#333', marginVertical: 4 },
  balanceSubtext: { fontSize: 12, color: '#888', marginBottom: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  debitAmount: { fontSize: 12, color: '#d32f2f' },
  creditAmount: { fontSize: 12, color: '#4caf50' },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressDebit: { height: '100%', backgroundColor: '#f44336' },
  debitLabel: { fontSize: 11, color: '#d32f2f' },
  creditLabel: { fontSize: 11, color: '#4caf50' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: '#888', fontSize: 14 },
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txnInfo: { flex: 1 },
  txnUser: { fontSize: 15, fontWeight: '500', color: '#333' },
  txnDate: { fontSize: 12, color: '#888' },
  txnAmount: { fontSize: 15, fontWeight: '600' },
});
