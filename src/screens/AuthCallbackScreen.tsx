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
      const pendingToken = consumePendingInviteToken();
      if (pendingToken) {
        try {
          const result = await api.acceptInvite(pendingToken);
          navigation.replace('RoomHome', { room_id: result.room_id });
          return;
        } catch {
          // fall through to the rooms list if the invite failed
        }
      }

      navigation.replace('RoomsList');
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
