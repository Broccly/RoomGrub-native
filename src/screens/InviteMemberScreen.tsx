import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { api } from '../services/api';

export default function InviteMemberScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) {
      setStatus('Please enter a valid email.');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const result = await api.inviteMember(room_id, email);
      if (result.status === 'joined_existing_user') {
        setStatus(`User added to your room: ${email}`);
      } else {
        setStatus(`Invite sent to ${email}`);
      }
      setEmail('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Invite a Member</Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleInvite} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send Invite'}</Text>
        </TouchableOpacity>

        {status !== '' && <Text style={styles.status}>{status}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    backgroundColor: '#9333ea',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    marginTop: 16,
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '500',
  },
});
