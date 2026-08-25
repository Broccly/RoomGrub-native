import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const SECTIONS = [
  {
    title: 'Information We Collect',
    body:
      'We collect the information you provide when creating an account, such as your name, email address, and profile photo, along with room, expense, and split data you enter while using RoomGrub.',
  },
  {
    title: 'How We Use Your Information',
    body:
      'Your information is used to operate core features of the app — creating rooms, tracking shared expenses, calculating splits, and notifying you about activity in rooms you belong to.',
  },
  {
    title: 'Data Sharing',
    body:
      'We do not sell your personal data. Information is only shared with other members of the rooms you join, since expense tracking is inherently a shared activity.',
  },
  {
    title: 'Data Storage & Security',
    body:
      'Your data is stored securely and access is restricted to what is needed to provide the service. We take reasonable measures to protect your information from unauthorized access.',
  },
  {
    title: 'Your Choices',
    body:
      'You can update your profile information at any time, exit a room to stop sharing new data with its members, or contact support to request account deletion.',
  },
  {
    title: 'Contact Us',
    body:
      'If you have questions about this privacy policy or how your data is handled, reach out via the Contact Support option in Settings.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.heroIcon}>
        <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
      </View>
      <Text style={styles.heading}>Privacy Policy</Text>
      <Text style={styles.subheading}>How we collect, use, and protect your data</Text>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf5ff' },
  content: { padding: 24, alignItems: 'center' },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: colors.brand,
    elevation: 4,
  },
  heading: { fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center' },
  subheading: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
  sectionBody: { fontSize: 14, color: '#666', lineHeight: 20 },
});
