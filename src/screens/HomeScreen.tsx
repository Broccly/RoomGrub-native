import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';

const navItems = [
  { label: 'Members', subtext: 'Manage or view room members', icon: 'people' as const, screen: 'Members' },
  { label: 'Balance', subtext: 'See your current balance', icon: 'wallet' as const, screen: 'Balance' },
  { label: 'Expenses', subtext: 'Track shared expenses', icon: 'receipt' as const, screen: 'Expenses' },
  { label: 'Payments', subtext: 'View or add payments', icon: 'card' as const, screen: 'Payments' },
  { label: 'Splits', subtext: 'Split expenses and settle balances', icon: 'analytics' as const, screen: 'Splits' },
];

export default function HomeScreen({ navigation, route }: any) {
  const { session } = useAuth();
  const { role } = useUserRole();
  const room_id = Number(route.params?.room_id);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!room_id) {
      setLoading(true);
      api
        .bootstrap()
        .then((data) => {
          if (data.membership.room_id) {
            navigation.replace('RoomHome', { room_id: data.membership.room_id });
          } else {
            navigation.replace('CreateRoom');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [room_id, navigation]);

  const fullName = session?.user?.user_metadata?.full_name || session?.user?.email || 'there';
  const firstName = fullName.split(' ')[0];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#7b61ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Here's what's happening with your room
          </Text>
        </View>

        <View style={styles.list}>
          {navItems.map(({ label, icon, screen }) => (
            <TouchableOpacity
              key={label}
              style={styles.navButton}
              onPress={() => navigation.navigate(screen, { room_id })}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={icon} size={22} color="#fff" />
              </View>
              <Text style={styles.navLabel}>{label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}

          {role === 'Admin' && (
            <TouchableOpacity
              style={[styles.navButton, styles.adminButton]}
              onPress={() => navigation.navigate('Admin', { room_id })}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, styles.adminIcon]}>
                <Ionicons name="grid" size={22} color="#fff" />
              </View>
              <Text style={styles.navLabel}>Admin Dashboard</Text>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddGrocery', { room_id })}
        activeOpacity={0.8}
      >
        <Ionicons name="cart" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  welcome: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    gap: 14,
  },
  adminButton: {
    borderWidth: 1,
    borderColor: '#e0f7e0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7b61ff',
  },
  adminIcon: {
    backgroundColor: '#00c851',
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
