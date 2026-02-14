import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useUserRole from '../hooks/useUserRole';
import { formatAmount } from '../utils/format';
import { MOCK_USERS, MOCK_EXPENSES, MOCK_BALANCE } from '../utils/mockData';

export default function SplitsScreen({ route }: any) {
  const { room_id } = route.params;
  const { role } = useUserRole();
  const [isSettling, setIsSettling] = useState(false);

  const members = MOCK_USERS;
  const expenses = MOCK_EXPENSES;
  const payments = MOCK_BALANCE;

  const splitCalculation = useMemo(() => {
    const memberExpenses: Record<string, number> = {};
    const memberSettlements: Record<string, number> = {};

    members.forEach((m) => {
      memberExpenses[m.email] = 0;
      memberSettlements[m.email] = 0;
    });

    expenses.forEach((e) => {
      if (memberExpenses.hasOwnProperty(e.user)) {
        memberExpenses[e.user] += parseFloat(e.money || '0');
      }
    });

    payments.forEach((p) => {
      if (memberSettlements.hasOwnProperty(p.user) && p.status === 'debit') {
        memberSettlements[p.user] += parseFloat(p.amount || '0');
      }
    });

    const memberPending: Record<string, number> = {};
    members.forEach((m) => {
      memberPending[m.email] = memberExpenses[m.email] + memberSettlements[m.email];
    });

    const totalPendingExpenses = Object.values(memberPending).reduce(
      (sum, amount) => sum + (amount > 0 ? amount : 0),
      0
    );

    const numberOfMembers = members.length;
    const equalShare = numberOfMembers > 0 ? totalPendingExpenses / numberOfMembers : 0;

    const memberBalances = members.map((member) => {
      const pendingAmount = memberPending[member.email] || 0;
      const shouldPay = equalShare;
      const balance = pendingAmount - shouldPay;

      return {
        member,
        spent: memberExpenses[member.email] || 0,
        pendingAmount,
        shouldPay,
        balance,
        status: balance > 0 ? 'credit' : balance < 0 ? 'debit' : 'even',
      };
    });

    const pendingSettlements = memberBalances.filter(
      (mb) => Math.abs(mb.balance) > 0.01
    );

    return {
      totalPendingExpenses,
      equalShare,
      memberBalances,
      numberOfMembers,
      pendingSettlements,
    };
  }, [expenses, payments, members]);

  const handleSettleAll = () => {
    Alert.alert(
      'Settle All',
      `Settle all ${splitCalculation.pendingSettlements.length} pending balances?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: () => {
            setIsSettling(true);
            setTimeout(() => {
              Alert.alert('Success', 'All balances settled! (mock)');
              setIsSettling(false);
            }, 500);
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Splits</Text>
      <Text style={styles.subheading}>
        Split expenses and settle all balances
      </Text>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#ede9fe' }]}>
          <Text style={styles.summaryLabel}>Total Pending</Text>
          <Text style={styles.summaryValue}>
            {formatAmount(splitCalculation.totalPendingExpenses)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
          <Text style={styles.summaryLabel}>Per Person</Text>
          <Text style={styles.summaryValue}>
            {formatAmount(splitCalculation.equalShare)}
          </Text>
        </View>
      </View>

      {/* All Settled or Member Balances */}
      {splitCalculation.pendingSettlements.length === 0 ? (
        <View style={styles.allClearContainer}>
          <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
          <Text style={styles.allClearTitle}>All Clear!</Text>
          <Text style={styles.allClearText}>
            No pending expenses to settle. Everyone is even!
          </Text>
        </View>
      ) : (
        <>
          {splitCalculation.memberBalances.map((mb) => {
            const cardColor =
              mb.status === 'credit'
                ? '#dcfce7'
                : mb.status === 'debit'
                ? '#fee2e2'
                : '#f3f4f6';

            return (
              <View
                key={mb.member.email}
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
                      Pending: {formatAmount(mb.pendingAmount)}
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

          {/* Settle All Button */}
          {role === 'Admin' && (
            <TouchableOpacity
              style={[styles.settleButton, isSettling && { opacity: 0.6 }]}
              onPress={handleSettleAll}
              disabled={isSettling}
            >
              <Text style={styles.settleButtonText}>
                {isSettling
                  ? 'Settling...'
                  : `Settle All (${splitCalculation.pendingSettlements.length})`}
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
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 16 },
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
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  settleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
