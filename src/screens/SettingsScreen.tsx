import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import useUserRole from '../hooks/useUserRole';
import { useRoomContext } from '../context/RoomContext';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

export default function SettingsScreen({ navigation, route }: any) {
  const { logout } = useAuth();
  const { role } = useUserRole();
  const { setRoomId } = useRoomContext();
  const queryClient = useQueryClient();
  const room_id = Number(route.params?.room_id);

  const handleSignOut = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const exitRoomMutation = useMutation({
    mutationFn: () => api.exitRoom(room_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      setRoomId(null);
      navigation.reset({ index: 0, routes: [{ name: 'RoomsList' }] });
    },
    onError: (error) => {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to exit room');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: () => api.deleteRoom(room_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      setRoomId(null);
      navigation.reset({ index: 0, routes: [{ name: 'RoomsList' }] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete room';
      if (message.toLowerCase().includes('unsettled')) {
        showAlert(
          'Unsettled Balances',
          'This room has unsettled balances. Please settle all balances before deleting the room.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Splits',
              onPress: () => navigation.navigate('RoomHome', { room_id, screen: 'Splits' }),
            },
          ],
        );
      } else {
        showAlert('Error', message);
      }
    },
  });

  const deleting = exitRoomMutation.isPending || deleteRoomMutation.isPending;

  const handleExitRoom = () => {
    showAlert(
      'Exit Room',
      'Are you sure you want to exit this room? You will need to join a new room.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit', style: 'destructive', onPress: () => exitRoomMutation.mutate() },
      ],
    );
  };

  const handleDeleteRoom = () => {
    showAlert(
      'Delete Room',
      'Are you absolutely sure? This will permanently delete the room and all its data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRoomMutation.mutate() },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Room Settings</Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() =>
            navigation.navigate('ActivityHistory', { room_id: route.params?.room_id })
          }
        >
          <Ionicons name="time-outline" size={22} color="#9333ea" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Activity History</Text>
            <Text style={styles.settingHint}>View all room activities</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {role === 'Admin' && (
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={[styles.deleteRoomButton, deleting && { opacity: 0.6 }]}
            onPress={handleDeleteRoom}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.deleteRoomText}>
              {deleting ? 'Deleting...' : 'Delete Room'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {role && role !== 'Admin' && (
        <TouchableOpacity
          style={[styles.exitRoomButton, deleting && { opacity: 0.6 }]}
          onPress={handleExitRoom}
          disabled={deleting}
        >
          <Ionicons name="exit-outline" size={20} color="#ef4444" />
          <Text style={styles.exitRoomText}>
            {deleting ? 'Exiting...' : 'Exit Room'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 16 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, fontWeight: '500', color: '#333' },
  settingHint: { fontSize: 13, color: '#888', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0' },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  signOutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  dangerZone: { marginTop: 32 },
  dangerZoneTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  deleteRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteRoomText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  exitRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 16,
  },
  exitRoomText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});
