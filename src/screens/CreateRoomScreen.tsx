import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROOM_STORAGE_KEY = 'roomgrub_user_room';

export default function CreateRoomScreen({ navigation }: any) {
  const features = [
    'Split expenses easily',
    'Track who owes what',
    'Manage shared groceries',
  ];

  const handleCreateRoom = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: newRoom, error: roomError } = await supabase
      .from('Rooms')
      .insert({ members: 1, admin: session.user.email })
      .select()
      .single();

    if (roomError) {
      Alert.alert('Error', 'Failed to create room');
      return;
    }

    const { error: userError } = await supabase
      .from('Users')
      .update({ room: newRoom.id, role: 'Admin' })
      .eq('email', session.user.email);

    if (userError) {
      Alert.alert('Error', 'Failed to update user');
      return;
    }

    await AsyncStorage.setItem(ROOM_STORAGE_KEY, String(newRoom.id));
    navigation.replace('RoomHome', { room_id: newRoom.id });
  };

  const handleJoinRequest = () => {
    Alert.alert('Info', 'Ask your friend to invite you to a room.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.content}>
        <View style={styles.heroIcon}>
          <Ionicons name="home" size={36} color="#fff" />
        </View>

        <Text style={styles.heading}>Create Your First Room</Text>
        <Text style={styles.subheading}>
          Start managing shared expenses with your roommates
        </Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateRoom}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Create New Room</Text>
          </TouchableOpacity>
          <Text style={styles.buttonHint}>
            Set up a room and invite your friends
          </Text>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.outlineButton} onPress={handleJoinRequest}>
            <Ionicons name="person-add" size={18} color="#666" />
            <Text style={styles.outlineButtonText}>Ask friends to invite you</Text>
          </TouchableOpacity>
          <Text style={styles.buttonHint}>
            Get an invitation link from your roommates
          </Text>
        </View>

        <View style={styles.featuresCard}>
          <View style={styles.featuresHeader}>
            <Ionicons name="people" size={16} color="#7b61ff" />
            <Text style={styles.featuresTitle}>What you can do:</Text>
          </View>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  content: {
    maxWidth: 420,
    width: '100%',
    alignItems: 'center',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 4,
    backgroundColor: '#7b61ff',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7b61ff',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  outlineButtonText: {
    color: '#555',
    fontSize: 15,
  },
  featuresCard: {
    width: '100%',
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    padding: 16,
  },
  featuresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
});
