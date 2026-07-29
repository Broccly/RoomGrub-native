import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { consumePendingInviteToken } from '../utils/pendingInvite';

export default function AuthCallbackScreen({ navigation }: any) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigation.replace('Login');
      return;
    }

    const handleAuth = async () => {
      try {
        const pendingToken = consumePendingInviteToken();
        if (pendingToken) {
          try {
            const result = await api.acceptInvite(pendingToken);
            navigation.replace('RoomHome', { room_id: result.room_id });
            return;
          } catch {
            // fall through to the normal rooms-list routing if the invite failed
          }
        }

        const rooms = await api.listRooms();
        navigation.replace(rooms.length === 0 ? 'CreateRoom' : 'RoomsList');
      } catch (error) {
        navigation.replace('Login');
      }
    };

    handleAuth();
  }, [user, loading, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#9333ea" />
      <Text style={styles.text}>Logging in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
