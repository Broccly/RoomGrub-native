import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import useUserRole from '../hooks/useUserRole';
import { useRoomContext } from '../context/RoomContext';
import { formatAmount } from '../utils/format';
import { api } from '../services/api';
import { SplitsData } from '../types/api';
import { computeSplitsFiltered, ComputedSplits, MemberBalance } from '../utils/splitCalculations';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import Avatar from '../components/Avatar';

const statusColors = {
  credit: { border: '#86efac', bg: '#f0fdf4', text: '#16a34a' },
  debit: { border: '#fca5a5', bg: '#fff5f5', text: '#dc2626' },
  even: { border: '#d8b4fe', bg: colors.background, text: colors.brand },
};

function ShareCard({ computed }: { computed: ComputedSplits }) {
  return (
    <View style={styles.shareCard}>
      <Text style={styles.shareHeader}>🏠 RoomGrub</Text>
      <View style={styles.shareSummaryRow}>
        <View style={[styles.shareSummaryTile, { backgroundColor: colors.purple100 }]}>
          <Text style={styles.shareSummaryLabel}>Total Pending</Text>
          <Text style={styles.shareSummaryValue}>{formatAmount(computed.totalPendingExpenses)}</Text>
        </View>
        <View style={[styles.shareSummaryTile, { backgroundColor: '#d1fae5' }]}>
          <Text style={styles.shareSummaryLabel}>Transfers</Text>
          <Text style={styles.shareSummaryValue}>{computed.settlements.length}</Text>
        </View>
      </View>
      {computed.memberBalances.map((mb) => (
        <View key={mb.member.user_email} style={styles.shareMemberRow}>
          <Avatar
            uri={mb.member.profile}
            label={mb.member.name || mb.member.user_email}
            size={32}
            fontSize={14}
            backgroundColor={colors.purpleAvatar}
            textColor={colors.textSecondary}
            style={styles.shareAvatar}
          />
          <Text style={styles.shareMemberName}>{mb.member.name || mb.member.user_email}</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.shareMemberAmount, { color: statusColors[mb.status].text }]}>
            {mb.status === 'even' ? '₹0' : formatAmount(mb.balance)}
          </Text>
        </View>
      ))}
      <Text style={styles.shareFooter}>Shared via RoomGrub</Text>
    </View>
  );
}

export default function SplitsScreen() {
  const { roomId } = useRoomContext();
  const { role } = useUserRole();
  const [isSettling, setIsSettling] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [splitsData, setSplitsData] = useState<SplitsData | null>(null);
  const shareRef = useRef<ViewShot>(null);

  const computed: ComputedSplits | null = splitsData ? computeSplitsFiltered(splitsData, {}) : null;

  const loadSplits = useCallback(
    async (isRefresh = false) => {
      if (!roomId) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await api.getSplits(roomId);
        setSplitsData(data);
      } catch (error) {
        showAlert('Error', error instanceof Error ? error.message : 'Failed to load splits');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roomId],
  );

  useFocusEffect(
    useCallback(() => {
      loadSplits();
    }, [loadSplits])
  );

  const handleSettleAll = () => {
    if (!roomId || !computed) return;

    showAlert(
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
                { date_from: null, date_to: null, member_emails: null },
              );
              showAlert('Success', 'Balances settled.');
              await loadSplits(true);
            } catch (error) {
              showAlert('Error', error instanceof Error ? error.message : 'Failed to settle balances');
            } finally {
              setIsSettling(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!shareRef.current?.capture) return;
    setIsSharing(true);
    try {
      const uri = await shareRef.current.capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'RoomGrub Splits' });
      }
    } catch (error) {
      showAlert('Error', 'Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  if (loading || !computed) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Splits</Text>
        <Text style={styles.subheading}>Split expenses and settle all balances</Text>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSplits(true)} />}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#fdf3f3' }]}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="calculator-outline" size={18} color="#dc2626" />
              <Text style={[styles.summaryLabel, { color: '#991b1b' }]}>Total Pending</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
              {formatAmount(computed.totalPendingExpenses)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#f3fbf6' }]}>
            <View style={styles.summaryLabelRow}>
              <Ionicons name="receipt-outline" size={18} color="#16a34a" />
              <Text style={[styles.summaryLabel, { color: '#166534' }]}>Transfers Needed</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{computed.settlements.length}</Text>
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
            {computed.memberBalances.map((mb: MemberBalance) => {
              const sc = statusColors[mb.status];

              return (
                <View
                  key={mb.member.user_email}
                  style={[styles.memberCard, { backgroundColor: sc.bg, borderColor: sc.border }]}
                >
                  <View style={styles.memberHeader}>
                    <Avatar
                      uri={mb.member.profile}
                      label={mb.member.name || mb.member.user_email}
                      size={44}
                      backgroundColor={colors.purpleAvatar}
                      textColor={colors.textSecondary}
                      style={styles.avatarFallback}
                    />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{mb.member.name || mb.member.user_email}</Text>
                      <Text style={styles.pendingText}>
                        {mb.status === 'credit' ? 'Gets back' : mb.status === 'debit' ? 'Owes' : 'Settled up'}
                      </Text>
                    </View>
                    <Text style={[styles.balanceAmount, { color: sc.text }]}>
                      {mb.status === 'even' ? '₹0' : formatAmount(mb.balance)}
                    </Text>
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
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare} disabled={isSharing}>
                  {isSharing ? (
                    <ActivityIndicator size="small" color={colors.brandDark} />
                  ) : (
                    <Ionicons name="share-outline" size={22} color={colors.brandDark} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settleButton, isSettling && { opacity: 0.6 }]}
                  onPress={handleSettleAll}
                  disabled={isSettling}
                >
                  {!isSettling && <Ionicons name="card-outline" size={18} color="#fff" />}
                  <Text style={styles.settleButtonText}>
                    {isSettling ? 'Settling...' : `Settle All (${computed.pendingSettlements.length})`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={shareRef} options={{ format: 'png', quality: 1 }}>
          <ShareCard computed={computed} />
        </ViewShot>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 16 },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subheading: { fontSize: 14, color: '#888' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  summaryLabel: { fontSize: 12, fontWeight: '500' },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  allClearContainer: { alignItems: 'center', paddingVertical: 48 },
  allClearTitle: { fontSize: 24, fontWeight: '700', color: '#2e7d32', marginTop: 12 },
  allClearText: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', maxWidth: 300 },
  memberCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  memberHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purpleAvatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.textSecondary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  pendingText: { fontSize: 12, color: '#888', marginTop: 2 },
  balanceAmount: { fontSize: 20, fontWeight: '700' },
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
    backgroundColor: colors.purple100,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 6,
  },
  whoPaysName: { fontSize: 14, fontWeight: '600', color: '#333' },
  whoPaysVerb: { fontSize: 14, color: '#888' },
  whoPaysAmount: { fontSize: 14, fontWeight: '700', color: colors.brandDark },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  shareButton: {
    width: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.brandDark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
  shareCard: {
    width: 380,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
  },
  shareHeader: { fontSize: 20, fontWeight: '700', color: colors.brandDark, marginBottom: 16, textAlign: 'center' },
  shareSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  shareSummaryTile: { flex: 1, borderRadius: 12, padding: 12 },
  shareSummaryLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  shareSummaryValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  shareMemberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  shareAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.purpleAvatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  shareAvatarText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  shareMemberName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  shareMemberAmount: { fontSize: 14, fontWeight: '700' },
  shareFooter: { fontSize: 11, color: colors.brandMid, textAlign: 'center', marginTop: 8 },
});
