import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { UserSummary } from '../types/api';

export default function MembersScreen({ navigation, route }: any) {
  const room_id = Number(route.params.room_id);
  const { role, loading: roleLoading } = useUserRole();
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; member: UserSummary | null }>({
    open: false,
    member: null,
  });

  const loadMembers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await api.listMembers(room_id);
      setMembers(result.members);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to load members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [room_id]);

  const handleRoleChange = async (newRole: 'Admin' | 'Member') => {
    if (!editModal.member) return;
    const confirmMessage =
      newRole === 'Admin'
        ? `Promote ${editModal.member.name} to Admin?`
        : `Demote ${editModal.member.name} to Member?`;

    Alert.alert('Confirm', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await api.updateMemberRole(room_id, editModal.member!.user_id, newRole);
            setEditModal({ open: false, member: null });
            loadMembers(true);
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update role');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#7b61ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadMembers(true)} />}
      >
        <Text style={styles.heading}>Room Members</Text>

        {members.length === 0 ? (
          <Text style={styles.emptyText}>No friends added in your room.</Text>
        ) : (
          members.map((member) => (
            <TouchableOpacity
              key={member.user_id}
              style={styles.memberCard}
              onPress={() =>
                navigation.navigate('MemberDetail', {
                  room_id,
                  member_id: member.user_id,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {member.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      member.role === 'Admin'
                        ? styles.adminBadge
                        : styles.memberBadge,
                    ]}
                  >
                    <Text style={styles.roleBadgeText}>{member.role}</Text>
                  </View>
                </View>
                <Text style={styles.memberEmail}>{member.email}</Text>
              </View>
              {!roleLoading && role === 'Admin' && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditModal({ open: true, member })}
                >
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('InviteMember', { room_id })}
        >
          <Text style={styles.addButtonText}>Add Friend</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editModal.open} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Member Role</Text>
            {editModal.member && (
              <>
                <Text style={styles.modalLabel}>
                  Member: <Text style={{ fontWeight: '700' }}>{editModal.member.name}</Text>
                </Text>
                <Text style={styles.modalLabel}>
                  Current Role: {editModal.member.role}
                </Text>

                <TouchableOpacity
                  style={[styles.roleButton, styles.promoteButton]}
                  onPress={() => handleRoleChange('Admin')}
                  disabled={editModal.member.role === 'Admin'}
                >
                  <Text style={styles.roleButtonText}>Promote to Admin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.roleButton, styles.demoteButton]}
                  onPress={() => handleRoleChange('Member')}
                  disabled={editModal.member.role === 'Member'}
                >
                  <Text style={styles.roleButtonText}>Demote to Member</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditModal({ open: false, member: null })}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 15 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#555' },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#333' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  adminBadge: { backgroundColor: '#e0e7ff' },
  memberBadge: { backgroundColor: '#f3f4f6' },
  roleBadgeText: { fontSize: 11, fontWeight: '500', color: '#555' },
  memberEmail: { fontSize: 13, color: '#888' },
  editBtn: { padding: 8 },
  editBtnText: { fontSize: 13, color: '#7b61ff', fontWeight: '600' },
  addButton: {
    backgroundColor: '#7b61ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#333' },
  modalLabel: { fontSize: 14, color: '#555', marginBottom: 8 },
  roleButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  promoteButton: { backgroundColor: '#4caf50' },
  demoteButton: { backgroundColor: '#ef4444' },
  roleButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: { color: '#666', fontSize: 15 },
});
