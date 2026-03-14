import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';

export default function SettingsScreen({ navigation, route }: any) {
  const room_id = route.params?.room_id;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Room Settings</Text>

      <View style={styles.card}>
        <TouchableOpacity style={styles.settingRow}>
          <Ionicons name="notifications-outline" size={22} color="#7b61ff" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingHint}>
              Native push notifications will be integrated in phase 2
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() =>
            Alert.alert('Coming Soon', 'Activity History will be added in a later iteration.')
          }
        >
          <Ionicons name="time-outline" size={22} color="#7b61ff" />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
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
});
