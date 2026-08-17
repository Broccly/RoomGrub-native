import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { Role, RoomListItem } from '../types/api';

type RoomWithRole = RoomListItem & { role: Role | null };

export default function RoomsListScreen({ navigation, route }: any) {
  const { user, logout } = useAuth();
  const prefetchedRooms: RoomWithRole[] | undefined = route?.params?.prefetchedRooms;
  const [rooms, setRooms] = useState<RoomWithRole[]>(prefetchedRooms ?? []);
  const [loading, setLoading] = useState(!prefetchedRooms);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = (user?.name || user?.email || 'there').split(' ')[0];

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const loadRooms = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const list = await api.listRooms();
        const withRoles = await Promise.all(
          list.map(async (room) => {
            try {
              const members = await api.listMembers(room.id);
              const me = members.find((m) => m.email === user?.email);
              return { ...room, role: me?.role ?? null };
            } catch {
              return { ...room, role: null };
            }
          }),
        );
        setRooms(withRoles);
      } catch {
        // silently fail — user can pull to refresh
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.email],
  );

  useEffect(() => {
    if (prefetchedRooms) return;
    loadRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRooms]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadRooms(true)} tintColor={colors.brand} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingTitle}>Hi {firstName} 👋</Text>
            <Text style={styles.greetingSubtitle}>Your Rooms</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>You haven't joined any rooms yet.</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('RoomHome', { room_id: room.id })}
            >
              <View style={styles.cardLeft}>
                <View style={styles.roomIcon}>
                  <Ionicons name="home" size={20} color={colors.brand} />
                </View>
                <View>
                  <Text style={styles.roomName}>Room #{room.id}</Text>
                  <Text style={styles.roomMeta}>
                    {room.members} member{room.members !== 1 ? 's' : ''}
                    {room.role ? ` · ${room.role}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.openPill}>
                <Text style={styles.openPillText}>Open</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.brand} />
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 96 }} />
      </ScrollView>

      <TouchableOpacity style={styles.newRoomButton} onPress={() => navigation.navigate('CreateRoom')}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.newRoomButtonText}>New Room</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 12,
  },
  greetingTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  greetingSubtitle: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  logoutBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { color: colors.textLight, fontSize: 15, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  roomMeta: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  openPillText: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  newRoomButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 28,
    elevation: 4,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newRoomButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
