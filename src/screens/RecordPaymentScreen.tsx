import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { UserSummary } from '../types/api';

export default function RecordPaymentScreen({ route, navigation }: any) {
  const room_id = Number(route.params.room_id);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'credit' | 'debit'>('credit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .listMembers(room_id)
      .then((result) => setUsers(result.members))
      .catch(() => Alert.alert('Error', 'Failed to load members'))
      .finally(() => setLoadingUsers(false));
  }, [room_id]);

  const handleSubmit = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || !selectedUser || numericAmount <= 0) {
      Alert.alert('Error', 'Please select a user and enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createPayment(room_id, {
        user_id: selectedUser.user_id,
        amount: numericAmount,
        status,
      });
      Alert.alert('Success', 'Payment recorded successfully');
      setAmount('');
      setSelectedUser(null);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingUsers) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Record Payment</Text>

        <Text style={styles.label}>Select User</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userList}>
          {users.map((user) => (
            <TouchableOpacity
              key={user.user_id}
              style={[
                styles.userChip,
                selectedUser?.user_id === user.user_id && styles.userChipSelected,
              ]}
              onPress={() => setSelectedUser(user)}
            >
              <Text
                style={[
                  styles.userChipText,
                  selectedUser?.user_id === user.user_id && styles.userChipTextSelected,
                ]}
              >
                {user.name || user.email}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Payment Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, status === 'credit' && styles.typeButtonActive]}
            onPress={() => setStatus('credit')}
          >
            <Text style={[styles.typeText, status === 'credit' && styles.typeTextActive]}>Money In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, status === 'debit' && styles.typeButtonActive]}
            onPress={() => setStatus('debit')}
          >
            <Text style={[styles.typeText, status === 'debit' && styles.typeTextActive]}>Money Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
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
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  userList: {
    marginBottom: 20,
  },
  userChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  userChipSelected: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  userChipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  userChipTextSelected: {
    color: '#2e7d32',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  typeText: {
    fontSize: 14,
    color: '#666',
  },
  typeTextActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
