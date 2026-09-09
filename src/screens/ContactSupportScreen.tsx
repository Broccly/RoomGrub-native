import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const SUPPORT_EMAIL = 's.sankar@broccly.in';
const SUPPORT_PHONE = '+91 8238187630';

export default function ContactSupportScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.heroIcon}>
        <Ionicons name="headset-outline" size={36} color="#fff" />
      </View>
      <Text style={styles.heading}>We're here to help</Text>
      <Text style={styles.subheading}>
        Reach out to us anytime and we'll get back to you as soon as possible.
      </Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="mail-outline" size={20} color={colors.brand} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.row}
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`)}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="call-outline" size={20} color={colors.brand} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>{SUPPORT_PHONE}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 24, alignItems: 'center' },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: colors.brand,
    elevation: 4,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center' },
  subheading: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 13, color: '#888' },
  rowValue: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginLeft: 70 },
});
