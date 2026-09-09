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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';

export default function CreateRoomScreen({ navigation }: any) {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const features = [
    'Split expenses easily',
    'Track who owes what',
    'Manage shared groceries',
  ];

  const createRoomMutation = useMutation({
    mutationFn: api.createRoom,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      navigation.replace('RoomHome', { room_id: result.id });
    },
    onError: (error) => {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create room');
    },
  });

  const handleCreateRoom = () => createRoomMutation.mutate();

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
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
        </View>

        <View style={styles.featuresCard}>
          <View style={styles.featuresHeader}>
            <Ionicons name="people" size={16} color="#9333ea" />
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
    backgroundColor: '#faf5ff',
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
    backgroundColor: '#9333ea',
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
    backgroundColor: '#9333ea',
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
