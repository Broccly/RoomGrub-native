import React from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from '../components/Avatar';
import { useAuth } from '../hooks/useAuth';
import ActionButton from '../components/ActionButton';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

const MAX_VISIBLE_AVATARS = 4;

export default function RoomsListScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: queryKeys.rooms,
    queryFn: api.listRooms,
  });
  // Each room carries its first few members' avatars, so no per-room /members call.
  const rooms = roomsQuery.data ?? [];

  const createRoomMutation = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      navigation.navigate('RoomHome', { room_id: room.id });
    },
    onError: (error) => {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to create room');
    },
  });

  const loading = roomsQuery.isPending;
  const loadError = roomsQuery.isError;

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        refreshControl={
          <RefreshControl
            refreshing={roomsQuery.isFetching && !roomsQuery.isPending}
            onRefresh={() => roomsQuery.refetch()}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingTitle}>Hi {(user?.name || user?.email || 'there').split(' ')[0]} 👋</Text>
            <Text style={styles.greetingSubtitle}>Your Rooms</Text>
          </View>
          <ActionButton
            onPress={logout}
            style={styles.logoutBtn}
            indicatorColor={colors.textLight}
            shimmer={false}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textLight} />
          </ActionButton>
        </View>

        {rooms.length === 0 && loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Couldn't load your rooms. Pull down to try again.</Text>
          </View>
        ) : rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>You haven't joined any rooms yet.</Text>
          </View>
        ) : (
          rooms.map((room) => {
            const visibleMembers = (room.member_preview ?? []).slice(0, MAX_VISIBLE_AVATARS);
            const extraCount = room.members - visibleMembers.length;

            return (
              <TouchableOpacity
                key={room.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('RoomHome', { room_id: room.id })}
              >
                <Text style={styles.roomName}>Room #{room.id}</Text>

                <View style={styles.avatarRow}>
                  {visibleMembers.map((member, index) => (
                    <Avatar
                      key={index}
                      uri={member.profile}
                      label={member.label}
                      size={40}
                      backgroundColor="#ede9fe"
                      borderWidth={2}
                      borderColor="#3a3a3a"
                      textColor="#9333ea"
                      style={{ marginLeft: index === 0 ? 0 : -12 }}
                    />
                  ))}
                  {extraCount > 0 ? (
                    <View style={[styles.extraCountBadge, { marginLeft: -12 }]}>
                      <Text style={styles.extraCountText}>+{extraCount}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 96 }} />
      </ScrollView>

      <ActionButton
        style={[styles.newRoomButton, { bottom: insets.bottom + 24 }]}
        onPress={() => createRoomMutation.mutate()}
        loading={createRoomMutation.isPending}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.newRoomButtonText}>New Room</Text>
      </ActionButton>
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
  },
  greetingTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  greetingSubtitle: { fontSize: 14, color: colors.textLight, marginTop: 2 },
  logoutBtn: { padding: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { color: colors.textLight, fontSize: 15, textAlign: 'center' },
  card: {
    backgroundColor: '#3a3a3a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  roomName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  extraCountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3a3a3a',
  },
  extraCountText: { color: colors.brand, fontWeight: '700', fontSize: 13 },
  newRoomButton: {
    position: 'absolute',
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
