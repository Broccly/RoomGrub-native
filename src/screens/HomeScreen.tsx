import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { createMMKV } from 'react-native-mmkv';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useRoomContext } from '../context/RoomContext';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { colors } from '../theme/colors';
import { formatAmount } from '../utils/format';
import Avatar from '../components/Avatar';
import { syncPushToken } from '../services/pushNotifications';

// Permission is per device, so prompt at most once per install; users who
// decline can still enable notifications from system settings.
const pushPrefs = createMMKV({ id: 'push-prefs' });
const PERMISSION_ASKED_KEY = 'notificationPermissionAsked';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { roomId } = useRoomContext();
  const insets = useSafeAreaInsets();

  // Every route into a room lands here, so this is the one place we prompt.
  useEffect(() => {
    if (pushPrefs.getBoolean(PERMISSION_ASKED_KEY)) return;
    pushPrefs.set(PERMISSION_ASKED_KEY, true);
    syncPushToken({ askPermission: true });
  }, []);

  const firstName = (user?.name || user?.email || 'there').split(' ')[0];

  const [summaryQuery, dashboardQuery] = useQueries({
    queries: [
      {
        queryKey: roomId ? queryKeys.roomSummary(roomId) : ['room-summary', 'disabled'],
        queryFn: () => api.getRoomSummary(roomId!),
        enabled: !!roomId,
      },
      {
        queryKey: roomId ? queryKeys.roomDashboard(roomId) : ['room-dashboard', 'disabled'],
        queryFn: () => api.getRoomDashboard(roomId!),
        enabled: !!roomId,
      },
    ],
  });

  const roomSummary = summaryQuery.data ?? null;
  const members = dashboardQuery.data?.members ?? [];
  const loading = summaryQuery.isPending || dashboardQuery.isPending;
  const refreshing = (summaryQuery.isFetching || dashboardQuery.isFetching) && !loading;

  const handleRefresh = () => {
    summaryQuery.refetch();
    dashboardQuery.refetch();
  };

  if (loading && !roomSummary) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 56 + insets.bottom + 32 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />}
    >
      {/* Greeting */}
      <View style={styles.greeting}>
        <Text style={styles.greetingTitle}>Hi {firstName} 👋</Text>
        <Text style={styles.greetingSubtitle}>Welcome Back</Text>
      </View>

      {/* Room Overview */}
      {roomSummary && (
        <View style={styles.card}>
          <View style={styles.cardTopBorder} />
          <Text style={styles.cardTitle}>Room Overview</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.statLabel, { color: colors.successDark }]}>Total Purchases</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {formatAmount(roomSummary.total_spent)}
              </Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.statLabel, { color: colors.dangerDark }]}>Pending Payments</Text>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {formatAmount(roomSummary.pending_amount)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Member Summary */}
      {members.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Member Summary</Text>
          {members.map((member, index) => {
            const isPending = member.pending_amount > 0;
            return (
              <TouchableOpacity
                key={member.user_id ?? member.email ?? index}
                style={[
                  styles.memberRow,
                  {
                    borderColor: isPending ? colors.redBorder : colors.greenBorder,
                  },
                ]}
                onPress={() =>
                  navigation.navigate('MemberDetail', {
                    room_id: roomId,
                    member_id: member.user_id,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.memberLeft}>
                  <View style={styles.memberAvatarWrap}>
                    <Avatar
                      uri={member.profile}
                      label={member.name || member.email}
                      size={44}
                      backgroundColor={colors.purpleAvatar}
                      borderWidth={2}
                      borderColor={colors.purpleAvatarBorder}
                      textColor={colors.brand}
                    />
                    {!isPending ? (
                      <View style={[styles.statusDot, { backgroundColor: colors.success }]}>
                        <Ionicons name="checkmark" size={8} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]}>
                        <Ionicons name="time" size={8} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.memberText}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name || member.email}
                    </Text>
                    <Text style={[styles.memberStatus, { color: !isPending ? colors.success : '#f59e0b' }]}>
                      {!isPending ? 'Settled' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.memberAmount, { color: isPending ? colors.danger : colors.success }]}>
                  {formatAmount(member.pending_amount)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  greeting: {
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.textLight,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.brand,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 14,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background,
  },
  memberLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 12,
  },
  memberText: {
    flex: 1,
  },
  memberAvatarWrap: {
    position: 'relative',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purpleAvatar,
    borderWidth: 2,
    borderColor: colors.purpleAvatarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand,
  },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  memberStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  memberAmount: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 0,
  },
});
