import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { MOCK_USERS } from '../utils/mockData';

export default function RecordPaymentScreen({ route, navigation }: any) {
  const { room_id } = route.params;
  const users = MOCK_USERS;
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!amount || !selectedUser) {
      Alert.alert('Error', 'Please select a user and enter an amount');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      Alert.alert('Success', 'Payment recorded! (mock)');
      setAmount('');
      setSelectedUser(null);
      setIsSubmitting(false);
      navigation.goBack();
    }, 500);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Record Payment</Text>

        <Text style={styles.label}>Select User</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.userList}>
          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userChip,
                selectedUser?.id === user.id && styles.userChipSelected,
              ]}
              onPress={() => setSelectedUser(user)}
            >
              <Text
                style={[
                  styles.userChipText,
                  selectedUser?.id === user.id && styles.userChipTextSelected,
                ]}
              >
                {user.name || user.email}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Amount (₹)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
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
