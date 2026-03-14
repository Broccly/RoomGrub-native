import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { UserSummary } from '../types/api';

export default function AddGroceryScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const { role } = useUserRole();

  const [members, setMembers] = useState<UserSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const [grocery, setGrocery] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [showFriendModal, setShowFriendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<UserSummary | null>(null);
  const [friendGrocery, setFriendGrocery] = useState('');
  const [friendPrice, setFriendPrice] = useState('');
  const [friendDate, setFriendDate] = useState('');
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendMsg, setFriendMsg] = useState('');

  useEffect(() => {
    api
      .listMembers(room_id)
      .then((data) => setMembers(data.members))
      .finally(() => setMembersLoading(false));
  }, [room_id]);

  const handleAdd = async () => {
    setMsg('');
    const numericPrice = Number(price);

    if (!grocery || !price || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setMsg('Please fill valid grocery and price.');
      return;
    }

    setLoading(true);
    try {
      const bootstrap = await api.bootstrap();
      await api.createExpense(room_id, {
        user_id: bootstrap.user.id,
        material: grocery.trim(),
        money: numericPrice,
        created_at: date || undefined,
      });
      setMsg('Grocery added!');
      setGrocery('');
      setPrice('');
      setDate('');
    } catch (error) {
      setMsg(error instanceof Error ? error.message : 'Failed to add grocery');
    } finally {
      setLoading(false);
    }
  };

  const handleAddForFriend = async () => {
    setFriendMsg('');
    const numericPrice = Number(friendPrice);

    if (!selectedFriend) {
      setFriendMsg('Please select a friend.');
      return;
    }
    if (!friendGrocery || !friendPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setFriendMsg('Please fill valid grocery and price.');
      return;
    }

    setFriendLoading(true);
    try {
      await api.createExpense(room_id, {
        user_id: selectedFriend.user_id,
        material: friendGrocery.trim(),
        money: numericPrice,
        created_at: friendDate || undefined,
      });
      setFriendMsg(`Added for ${selectedFriend.name || selectedFriend.email}`);
      setSelectedFriend(null);
      setFriendGrocery('');
      setFriendPrice('');
      setFriendDate('');
      setTimeout(() => {
        setShowFriendModal(false);
        setFriendMsg('');
      }, 1000);
    } catch (error) {
      setFriendMsg(error instanceof Error ? error.message : 'Failed to add grocery');
    } finally {
      setFriendLoading(false);
    }
  };

  if (membersLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Add Grocery</Text>

        <TextInput
          style={styles.input}
          placeholder="Grocery Item"
          value={grocery}
          onChangeText={setGrocery}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Price"
          value={price}
          onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="Date (YYYY-MM-DD, optional)"
          value={date}
          onChangeText={setDate}
          placeholderTextColor="#999"
        />
        <Text style={styles.helperText}>Leave empty to use current date</Text>

        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>
            {loading ? 'Adding...' : 'Add Grocery'}
          </Text>
        </TouchableOpacity>

        {msg !== '' && (
          <View
            style={[
              styles.msgBox,
              msg.includes('added') || msg.includes('Added')
                ? styles.msgSuccess
                : styles.msgError,
            ]}
          >
            <Text
              style={
                msg.includes('added') || msg.includes('Added')
                  ? styles.msgSuccessText
                  : styles.msgErrorText
              }
            >
              {msg}
            </Text>
          </View>
        )}

        {role === 'Admin' && (
          <TouchableOpacity onPress={() => setShowFriendModal(true)}>
            <Text style={styles.addForFriend}>Add for your friend</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={showFriendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Grocery for Friend</Text>
              <TouchableOpacity onPress={() => setShowFriendModal(false)}>
                <Text style={styles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Select Friend</Text>
            <ScrollView horizontal style={styles.friendSelector}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={[
                    styles.friendChip,
                    selectedFriend?.user_id === member.user_id && styles.friendChipSelected,
                  ]}
                  onPress={() => setSelectedFriend(member)}
                >
                  <View style={styles.friendAvatarFallback}>
                    <Text style={styles.friendAvatarText}>
                      {member.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.friendName}>{member.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              placeholder="Grocery Item"
              value={friendGrocery}
              onChangeText={setFriendGrocery}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={friendPrice}
              onChangeText={(t) => setFriendPrice(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD, optional)"
              value={friendDate}
              onChangeText={setFriendDate}
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.addButton, friendLoading && styles.addButtonDisabled]}
              onPress={handleAddForFriend}
              disabled={friendLoading}
            >
              <Text style={styles.addButtonText}>
                {friendLoading ? 'Adding...' : 'Add Grocery'}
              </Text>
            </TouchableOpacity>

            {friendMsg !== '' && (
              <View
                style={[
                  styles.msgBox,
                  friendMsg.includes('Added') ? styles.msgSuccess : styles.msgError,
                ]}
              >
                <Text
                  style={
                    friendMsg.includes('Added')
                      ? styles.msgSuccessText
                      : styles.msgErrorText
                  }
                >
                  {friendMsg}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#3b82f6',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  helperText: {
    fontSize: 13,
    color: '#888',
    marginTop: -12,
    marginBottom: 16,
    paddingLeft: 4,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  msgBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  msgSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  msgError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  msgSuccessText: {
    color: '#15803d',
    fontWeight: '500',
  },
  msgErrorText: {
    color: '#b91c1c',
    fontWeight: '500',
  },
  addForFriend: {
    color: '#3b82f6',
    textDecorationLine: 'underline',
    marginTop: 20,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeBtn: {
    fontSize: 20,
    color: '#999',
    fontWeight: '700',
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  friendSelector: {
    marginBottom: 16,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendChipSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  friendAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  friendAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
  },
  friendName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});
