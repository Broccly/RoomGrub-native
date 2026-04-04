import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const ROOM_STORAGE_KEY = 'roomgrub_user_room';

export default function AuthCallbackScreen({ navigation }: any) {
  useEffect(() => {
    const handleAuth = async () => {
      try {
        const bootstrap = await api.bootstrap();

        if (bootstrap.membership.room_id) {
          await AsyncStorage.setItem(ROOM_STORAGE_KEY, String(bootstrap.membership.room_id));
          navigation.replace('RoomHome', { room_id: bootstrap.membership.room_id });
          return;
        }

        navigation.replace('CreateRoom');
      } catch (error) {
        navigation.replace('Login');
      }
    };

    handleAuth();
  }, [navigation]);

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
