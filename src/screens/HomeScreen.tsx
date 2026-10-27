import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createMMKV } from 'react-native-mmkv';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useRoomContext } from '../context/RoomContext';
import { api } from '../services/api';
import { ApiError } from '../services/httpClient';
import { queryKeys } from '../services/queryClient';
import { colors } from '../theme/colors';
import { formatAmount } from '../utils/format';
import Avatar from '../components/Avatar';
import { syncPushToken } from '../services/pushNotifications';
import { navigationRef } from '../navigation/navigationRef';
import { showAlert } from '../utils/alert';

// Permission is per device, so prompt at most once per install; users who
// decline can still enable notifications from system settings.
const pushPrefs = createMMKV({ id: 'push-prefs' });
const PERMISSION_ASKED_KEY = 'notificationPermissionAsked';

// Matches the backend's settle-up tolerance, so rounding dust never shows as a balance.
const BALANCE_EPSILON = 0.01;

// First name only, e.g. "Sankar Sambhu" -> "Sankar". Emails pass through unchanged.
const shortName = (name: string) => name.trim().split(/\s+/)[0] || name;

type Period = 'unsettled' | 'allTime';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { roomId, setRoomId } = useRoomContext();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('unsettled');

  // Every route into a room lands here, so this is the one place we prompt.
  useEffect(() => {
    if (pushPrefs.getBoolean(PERMISSION_ASKED_KEY)) return;
    pushPrefs.set(PERMISSION_ASKED_KEY, true);
    syncPushToken({ askPermission: true });
  }, []);

  // Everything Home shows comes from this one request, for both views.
  const splitsQuery = useQuery({
    queryKey: roomId ? queryKeys.splitsSummary(roomId) : ['splits', 'disabled'],
    queryFn: () => api.getSplits(roomId!, { includeExpenses: false }),
    enabled: !!roomId,
  });

  // The room was deleted (404) or we were removed from it (403): leave it.
  const roomGone =
    splitsQuery.error instanceof ApiError && (splitsQuery.error.status === 404 || splitsQuery.error.status === 403);
  useEffect(() => {
    if (!roomGone) return;
    setRoomId(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
    navigationRef.reset({ index: 0, routes: [{ name: 'RoomsList' as never }] });
    showAlert('Room unavailable', 'This room is no longer available.');
  }, [roomGone, setRoomId, queryClient]);

  const splits = splitsQuery.data;
  const loading = splitsQuery.isPending;
  const refreshing = splitsQuery.isFetching && !loading;
  const handleRefresh = () => {
    splitsQuery.refetch();
  };

  if ((loading && !splits) || roomGone) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!splits) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.errorState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
      >
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <Text style={styles.errorText}>Couldn't load this room. Pull down to try again.</Text>
      </ScrollView>
    );
  }

  const myId = user?.id;
  const profileById: Record<number, string | null> = {};
  splits.members.forEach((m) => {
    profileById[m.user_id] = m.profile;
  });

  // --- You: since last settle-up ---
  const me = splits.members.find((m) => m.user_id === myId);
  const mySpent = me?.unsettled_spent ?? 0;
  const myShare = me?.unsettled_share ?? 0;
  const myNet = me?.pending_amount ?? 0;
  const netStatus = myNet > BALANCE_EPSILON ? 'credit' : myNet < -BALANCE_EPSILON ? 'debit' : 'even';
  const myTransfers = splits.settlements
    .filter((s) => (s.from_user_id === myId || s.to_user_id === myId) && Math.abs(s.amount) > BALANCE_EPSILON)
    .map((s) => {
      const owesMe = s.to_user_id === myId;
      const otherId = owesMe ? s.from_user_id : s.to_user_id;
      const otherName = (owesMe ? s.from_name || s.from_user_email : s.to_name || s.to_user_email);
      return {
        key: `${s.from_user_id}-${s.to_user_id}`,
        owesMe,
        otherName,
        profile: profileById[otherId] ?? null,
        amount: s.amount,
      };
    });

  const netLabel = netStatus === 'credit' ? 'You get back' : netStatus === 'debit' ? 'You owe' : 'Settled up';
  const netColor = netStatus === 'credit' ? colors.success : netStatus === 'debit' ? colors.danger : colors.brandDark;
  const netBg = netStatus === 'credit' ? colors.successLight : netStatus === 'debit' ? colors.dangerLight : colors.background;
  const netSub =
    myTransfers.length === 0
      ? 'Nothing pending'
      : myTransfers.length === 1
        ? 'From 1 person'
        : `From ${myTransfers.length} people`;

  // --- Room: per-member spend for the selected period ---
  // Only current members get a bar; anyone who left still shows up in the transfers above.
  const allTime = period === 'allTime';
  const roomTotal = allTime ? splits.total_spent : splits.total_pending;
  const memberRows = splits.members
    .filter((m) => m.role !== null)
    .map((m) => ({
      member: { user_id: m.user_id, name: m.name, email: m.user_email, profile: m.profile },
      isMe: m.user_id === myId,
      spent: allTime ? m.total_spent : m.unsettled_spent,
    }))
    .sort((a, b) => b.spent - a.spent);
  const unsettledCount = splits.unsettled_count;
  const roomCaption = allTime
    ? 'All time'
    : `Since last settle-up · ${unsettledCount} ${unsettledCount === 1 ? 'expense' : 'expenses'}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 56 + insets.bottom + 32 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
    >
      {/* You */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>You</Text>
        <Text style={styles.sectionHint}>Since last settle-up</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.statsRow}>
          <View style={[styles.statCell, styles.statCellDivider]}>
            <Text style={styles.statLabel}>You spent</Text>
            <Text style={styles.statValue}>{formatAmount(mySpent)}</Text>
            <Text style={styles.statSub}>Your share {formatAmount(myShare)}</Text>
          </View>
          <View style={[styles.statCell, { backgroundColor: netBg }]}>
            <Text style={[styles.statLabel, { color: netColor }]}>{netLabel}</Text>
            <Text style={[styles.statValue, { color: netColor }]}>{formatAmount(myNet)}</Text>
            <Text style={styles.statSub}>{netSub}</Text>
          </View>
        </View>

        {myTransfers.length === 0 ? (
          <View style={styles.squareRow}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.brandDark} />
            <Text style={styles.squareText}>You are square with everyone</Text>
          </View>
        ) : (
          myTransfers.map((t) => (
            <View key={t.key} style={styles.transferRow}>
              <Avatar
                uri={t.profile}
                label={t.otherName}
                size={36}
                fontSize={14}
                backgroundColor={colors.purpleAvatar}
                textColor={colors.brand}
              />
              <Text style={styles.transferText} numberOfLines={1}>
                {t.owesMe ? `${shortName(t.otherName)} owes you` : `You owe ${shortName(t.otherName)}`}
              </Text>
              <Text style={[styles.transferAmount, { color: t.owesMe ? colors.success : colors.danger }]}>
                {formatAmount(t.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Room */}
      <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
        <Text style={styles.sectionTitle}>Room</Text>
        <View style={styles.segmented} accessibilityRole="tablist">
          {(
            [
              { id: 'unsettled', label: 'Unsettled' },
              { id: 'allTime', label: 'All time' },
            ] as const
          ).map((p) => {
            const active = period === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setPeriod(p.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={[styles.card, styles.roomCard]}>
        <View style={styles.roomTotals}>
          <Text style={styles.statLabel}>Room total</Text>
          <Text style={styles.statValue}>{formatAmount(roomTotal)}</Text>
          <Text style={styles.statSub}>{roomCaption}</Text>
        </View>

        {memberRows.map(({ member, isMe, spent }) => {
          const label = member.name || member.email;
          // Full bar = the whole room total, so the bar matches the percentage.
          const barWidth = roomTotal > 0 ? `${(spent / roomTotal) * 100}%` : '0%';
          return (
            <TouchableOpacity
              key={member.user_id}
              style={styles.memberRow}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('MemberDetail', { room_id: roomId, member_id: member.user_id })
              }
            >
              <Avatar
                uri={member.profile}
                label={label}
                size={34}
                fontSize={14}
                backgroundColor={colors.purpleAvatar}
                textColor={colors.brand}
              />
              <View style={styles.memberBody}>
                <View style={styles.memberLine}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {isMe ? 'You' : shortName(label)}
                  </Text>
                  <Text style={styles.memberAmount}>
                    {formatAmount(spent)}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    testID={`member-bar-${member.user_id}`}
                    style={[
                      styles.barFill,
                      { width: barWidth as any, backgroundColor: isMe ? colors.brand : colors.brandMid },
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  errorState: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  errorText: {
    color: colors.textLight,
    fontSize: 15,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  sectionHeaderSpaced: {
    marginTop: 26,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textLight,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textLight,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.purpleAvatar,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
  },
  statCell: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 4,
  },
  statCellDivider: {
    borderRightWidth: 1,
    borderRightColor: colors.purple100,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: colors.textPrimary,
  },
  statSub: {
    fontSize: 12,
    color: colors.textLight,
  },
  squareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.purple100,
  },
  squareText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brandDark,
  },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.purple100,
  },
  transferText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  transferAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.purple100,
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  segment: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.cardBg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
  },
  segmentTextActive: {
    color: colors.brandDark,
  },
  roomCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  roomTotals: {
    gap: 2,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberBody: {
    flex: 1,
    gap: 6,
  },
  memberLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  memberAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.purple100,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
});
