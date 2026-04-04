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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { formatAmount } from '../utils/format';
import { RoomSummary, SplitsSummary } from '../types/api';

export default function HomeScreen({ navigation, route }: any) {
  const { session } = useAuth();
  const room_id = Number(route.params?.room_id);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [roomSummary, setRoomSummary] = useState<RoomSummary | null>(null);
  const [splitsSummary, setSplitsSummary] = useState<SplitsSummary | null>(null);

  const fullName = session?.user?.user_metadata?.full_name || session?.user?.email || 'there';
  const firstName = fullName.split(' ')[0];

  const loadDashboard = async (isRefresh = false) => {
    if (!room_id) {
      setLoading(true);
      try {
        const data = await api.bootstrap();
        if (data.membership.room_id) {
          navigation.replace('RoomHome', { room_id: data.membership.room_id });
        } else {
          navigation.replace('CreateRoom');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [summary, splits] = await Promise.all([
        api.getRoomSummary(room_id),
        api.getSplitsSummary(room_id),
      ]);
      setRoomSummary(summary);
      setSplitsSummary(splits);
    } catch {
      // silently fail — screens are still navigable via tabs
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [room_id]);

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
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={colors.brand} />}
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
                {formatAmount(roomSummary.total_expenses)}
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
      {splitsSummary && splitsSummary.member_balances.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Member Summary</Text>
          {splitsSummary.member_balances.map((mb) => (
            <TouchableOpacity
              key={mb.user_id}
              style={[
                styles.memberRow,
                {
                  borderColor: mb.pending_amount > 0 ? colors.redBorder : colors.greenBorder,
                },
              ]}
              onPress={() =>
                navigation.navigate('MemberDetail', { room_id, member_id: mb.user_id })
              }
              activeOpacity={0.7}
            >
              <View style={styles.memberLeft}>
                <View style={styles.memberAvatarWrap}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {(mb.member.name || mb.member.email).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  {mb.status === 'even' ? (
                    <View style={[styles.statusDot, { backgroundColor: colors.success }]}>
                      <Ionicons name="checkmark" size={8} color="#fff" />
                    </View>
                  ) : (
                    <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]}>
                      <Ionicons name="time" size={8} color="#fff" />
                    </View>
                  )}
                </View>
                <View>
                  <Text style={styles.memberName}>{mb.member.name || mb.member.email}</Text>
                  <Text style={[styles.memberStatus, { color: mb.status === 'even' ? colors.success : '#f59e0b' }]}>
                    {mb.status === 'even' ? 'Settled' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.memberAmount, { color: mb.pending_amount > 0 ? colors.danger : colors.success }]}>
                {formatAmount(mb.pending_amount)}
              </Text>
            </TouchableOpacity>
          ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
});
