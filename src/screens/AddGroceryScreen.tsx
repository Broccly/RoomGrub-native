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
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { UserSummary } from '../types/api';

function ParticipantPicker({
  members,
  selectedIds,
  onToggle,
  onOpen,
  visible,
  onClose,
  lockedUserId,
}: {
  members: UserSummary[];
  selectedIds: number[];
  onToggle: (userId: number) => void;
  onOpen: () => void;
  visible: boolean;
  onClose: () => void;
  lockedUserId?: number;
}) {
  return (
    <>
      <TouchableOpacity style={styles.participantBtn} onPress={onOpen}>
        <Ionicons name="people-outline" size={16} color="#9333ea" />
        <Text style={styles.participantBtnText}>
          {selectedIds.length === members.length ? 'Everyone' : `${selectedIds.length} people`}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Split Between</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={styles.participantRow}
                  onPress={() => onToggle(member.user_id)}
                  disabled={member.user_id === lockedUserId}
                >
                  <Ionicons
                    name={selectedIds.includes(member.user_id) ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={member.user_id === lockedUserId ? '#c4b5fd' : '#9333ea'}
                  />
                  <View style={styles.friendAvatarFallback}>
                    <Text style={styles.friendAvatarText}>
                      {(member.name || member.email).charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.label}>{member.name || member.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.addButton} onPress={onClose}>
              <Text style={styles.addButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function AddGroceryScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const { role } = useUserRole();

  const [members, setMembers] = useState<UserSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const [grocery, setGrocery] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);

  const [showFriendModal, setShowFriendModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<UserSummary | null>(null);
  const [friendGrocery, setFriendGrocery] = useState('');
  const [friendPrice, setFriendPrice] = useState('');
  const [friendDate, setFriendDate] = useState<Date | null>(null);
  const [showFriendDatePicker, setShowFriendDatePicker] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendMsg, setFriendMsg] = useState('');
  const [friendParticipantIds, setFriendParticipantIds] = useState<number[]>([]);
  const [showFriendParticipantPicker, setShowFriendParticipantPicker] = useState(false);

  useEffect(() => {
    api
      .listMembers(room_id)
      .then((data) => {
        setMembers(data);
        const allIds = data.map((m) => m.user_id);
        setParticipantIds(allIds);
        setFriendParticipantIds(allIds);
      })
      .finally(() => setMembersLoading(false));
  }, [room_id]);

  const toggleParticipant = (userId: number) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const toggleFriendParticipant = (userId: number) => {
    if (userId === selectedFriend?.user_id) return;
    setFriendParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleAdd = async () => {
    setMsg('');
    const numericPrice = Number(price);

    if (!grocery || !price || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setMsg('Please fill valid grocery and price.');
      return;
    }
    if (participantIds.length === 0) {
      setMsg('Select at least one participant.');
      return;
    }

    setLoading(true);
    try {
      await api.createExpense(room_id, {
        material: grocery.trim(),
        money: numericPrice,
        created_at: date ? date.toISOString().split('T')[0] : undefined,
        participant_user_ids: participantIds,
      });
      setMsg('Grocery added!');
      setGrocery('');
      setPrice('');
      setDate(null);
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
    if (friendParticipantIds.length === 0) {
      setFriendMsg('Select at least one participant.');
      return;
    }

    setFriendLoading(true);
    try {
      await api.createExpenseForMember(room_id, {
        user_id: selectedFriend.user_id,
        material: friendGrocery.trim(),
        money: numericPrice,
        created_at: friendDate ? friendDate.toISOString().split('T')[0] : undefined,
        participant_user_ids: friendParticipantIds,
      });
      setFriendMsg(`Added for ${selectedFriend.name || selectedFriend.email}`);
      setSelectedFriend(null);
      setFriendGrocery('');
      setFriendPrice('');
      setFriendDate(null);
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
        <ActivityIndicator size="large" color="#9333ea" />
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

        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={date ? '#9333ea' : '#999'} />
          <Text style={[styles.dateBtnText, date && styles.dateBtnTextActive]}>
            {date ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date (optional)'}
          </Text>
          {date && (
            <TouchableOpacity onPress={() => setDate(null)}>
              <Ionicons name="close-circle" size={18} color="#9333ea" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          date={date ?? new Date()}
          maximumDate={new Date()}
          onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />

        <ParticipantPicker
          members={members}
          selectedIds={participantIds}
          onToggle={toggleParticipant}
          visible={showParticipantPicker}
          onOpen={() => setShowParticipantPicker(true)}
          onClose={() => setShowParticipantPicker(false)}
        />

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
                  onPress={() => {
                    setSelectedFriend(member);
                    setFriendParticipantIds((prev) =>
                      prev.includes(member.user_id) ? prev : [...prev, member.user_id],
                    );
                  }}
                >
                  <View style={styles.friendAvatarFallback}>
                    <Text style={styles.friendAvatarText}>
                      {(member.name || member.email).charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.friendName}>{member.name || member.email}</Text>
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
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFriendDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={friendDate ? '#9333ea' : '#999'} />
              <Text style={[styles.dateBtnText, friendDate && styles.dateBtnTextActive]}>
                {friendDate ? friendDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select Date (optional)'}
              </Text>
              {friendDate && (
                <TouchableOpacity onPress={() => setFriendDate(null)}>
                  <Ionicons name="close-circle" size={18} color="#9333ea" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <DateTimePickerModal
              isVisible={showFriendDatePicker}
              mode="date"
              date={friendDate ?? new Date()}
              maximumDate={new Date()}
              onConfirm={(d) => { setFriendDate(d); setShowFriendDatePicker(false); }}
              onCancel={() => setShowFriendDatePicker(false)}
            />

            <ParticipantPicker
              members={members}
              selectedIds={friendParticipantIds}
              onToggle={toggleFriendParticipant}
              visible={showFriendParticipantPicker}
              onOpen={() => setShowFriendParticipantPicker(true)}
              onClose={() => setShowFriendParticipantPicker(false)}
              lockedUserId={selectedFriend?.user_id}
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
    backgroundColor: '#faf5ff',
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
    color: '#9333ea',
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  dateBtnText: { flex: 1, fontSize: 16, color: '#999' },
  dateBtnTextActive: { color: '#9333ea', fontWeight: '500' },
  participantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#f3e8ff',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  participantBtnText: { color: '#9333ea', fontWeight: '500', fontSize: 14 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  addButton: {
    backgroundColor: '#9333ea',
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
    color: '#9333ea',
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
    borderColor: '#9333ea',
    backgroundColor: '#f3e8ff',
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
