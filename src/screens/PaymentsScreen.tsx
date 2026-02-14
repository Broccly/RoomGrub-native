import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatAmount, formatShortDate, formatMonthYear } from '../utils/format';
import { MOCK_BALANCE_WITH_USERS } from '../utils/mockData';

export default function PaymentsScreen({ navigation, route }: any) {
  const { room_id } = route.params;

  const payments = useMemo(
    () =>
      [...MOCK_BALANCE_WITH_USERS].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    []
  );

  const groupedPayments = useMemo(() => {
    const groups: Record<string, any> = {};

    payments.forEach((payment) => {
      const date = new Date(payment.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const monthName = formatMonthYear(payment.created_at);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          monthName,
          monthKey,
          payments: [],
          moneyIn: 0,
          moneyOut: 0,
          runningBalance: 0,
        };
      }
      groups[monthKey].payments.push(payment);

      const amount = parseFloat(payment.amount);
      if (payment.status === 'credit') {
        groups[monthKey].moneyIn += amount;
      } else if (payment.status === 'debit') {
        groups[monthKey].moneyOut += amount;
      }
    });

    const sorted = Object.values(groups).sort((a: any, b: any) =>
      a.monthKey.localeCompare(b.monthKey)
    );

    let runningBalance = 0;
    sorted.forEach((group: any) => {
      group.monthlyNet = group.moneyIn + group.moneyOut;
      runningBalance += group.monthlyNet;
      group.runningBalance = runningBalance;
    });

    return sorted.reverse();
  }, [payments]);

  return (
    <View style={styles.container}>
      <ScrollView>
        {payments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No payments found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or add a new payment
            </Text>
          </View>
        ) : (
          groupedPayments.map((group: any) => (
            <View key={group.monthKey} style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <View style={styles.monthHeaderRow}>
                  <Text style={styles.monthTitle}>{group.monthName}</Text>
                  <Text
                    style={[
                      styles.monthBalance,
                      {
                        color:
                          group.runningBalance >= 0 ? '#4caf50' : '#ff9800',
                      },
                    ]}
                  >
                    {formatAmount(group.runningBalance)}
                  </Text>
                </View>
              </View>

              {group.payments.map((payment: any, index: number) => (
                <View key={payment.id}>
                  <View style={styles.paymentCard}>
                    <View style={styles.paymentIcon}>
                      <View
                        style={[
                          styles.iconFallback,
                          {
                            backgroundColor:
                              payment.status === 'credit'
                                ? '#e8f5e9'
                                : '#fff3e0',
                            borderColor:
                              payment.status === 'credit'
                                ? '#a5d6a7'
                                : '#ffe0b2',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            payment.status === 'credit'
                              ? 'trending-up'
                              : 'trending-down'
                          }
                          size={18}
                          color={
                            payment.status === 'credit'
                              ? '#4caf50'
                              : '#ff9800'
                          }
                        />
                      </View>
                    </View>
                    <View style={styles.paymentInfo}>
                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentUser}>
                          {payment.Users?.name || payment.user || 'Unknown'}
                        </Text>
                        <Text
                          style={[
                            styles.paymentAmount,
                            {
                              color:
                                payment.status === 'credit'
                                  ? '#4caf50'
                                  : '#ff9800',
                            },
                          ]}
                        >
                          {payment.status === 'credit' ? '+' : '-'}
                          {formatAmount(Math.abs(parseFloat(payment.amount)))}
                        </Text>
                      </View>
                      <View style={styles.paymentRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                payment.status === 'credit'
                                  ? '#e8f5e9'
                                  : '#fff3e0',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  payment.status === 'credit'
                                    ? '#4caf50'
                                    : '#ff9800',
                              },
                            ]}
                          >
                            {payment.status === 'credit' ? 'Money In' : 'Money Out'}
                          </Text>
                        </View>
                        <Text style={styles.paymentDate}>
                          {formatShortDate(payment.created_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < group.payments.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('RecordPayment', { room_id })}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  emptyText: { fontSize: 14, color: '#888' },
  monthSection: { marginBottom: 8 },
  monthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  monthBalance: { fontSize: 15, fontWeight: '700' },
  paymentCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  paymentIcon: { marginRight: 12 },
  iconFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  paymentInfo: { flex: 1 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentUser: { fontSize: 15, fontWeight: '600', color: '#333' },
  paymentAmount: { fontSize: 15, fontWeight: '700' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: '500' },
  paymentDate: { fontSize: 13, color: '#666' },
  divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginHorizontal: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
