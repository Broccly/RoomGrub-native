import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROOM_STORAGE_KEY = 'roomgrub_user_room';

export default function AuthCallbackScreen({ navigation }: any) {
  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigation.replace('Login');
        return;
      }

      const user = session.user;

      const { data: existingUser, error: fetchError } = await supabase
        .from('Users')
        .select('*')
        .eq('uid', user.id);

      let newUser: any = undefined;

      if (existingUser?.length === 0 && !fetchError) {
        const { data: inviteData } = await supabase
          .from('Invite')
          .select('*')
          .eq('email', user.email);

        const { data: insertedUser, error: insertError } = await supabase
          .from('Users')
          .insert({
            uid: user.id,
            email: user.email,
            name: user.user_metadata.full_name || user.user_metadata.name || '',
            room: inviteData && inviteData.length !== 0 ? inviteData[0]?.room : null,
            role: inviteData && inviteData.length !== 0 ? 'Member' : null,
            profile: user.user_metadata.avatar_url,
          })
          .select();

        if (insertError) {
          navigation.replace('Login');
          return;
        }
        newUser = insertedUser;
      }

      if (newUser) {
        if (newUser[0]?.room) {
          await AsyncStorage.setItem(ROOM_STORAGE_KEY, String(newUser[0].room));
          navigation.replace('RoomHome', { room_id: newUser[0].room });
        } else {
          navigation.replace('CreateRoom');
        }
      } else if (existingUser) {
        if (existingUser[0]?.room) {
          await AsyncStorage.setItem(ROOM_STORAGE_KEY, String(existingUser[0].room));
          navigation.replace('RoomHome', { room_id: existingUser[0].room });
        } else {
          navigation.replace('CreateRoom');
        }
      }
    };

    handleAuth();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7b61ff" />
      <Text style={styles.text}>Logging in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
