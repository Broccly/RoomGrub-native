import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { UserSummary } from '../types/api';
import Avatar from '../components/Avatar';
import { showAlert } from '../utils/alert';

export default function MembersScreen({ navigation, route }: any) {
  const room_id = Number(route.params.room_id);
  const { role, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [editModal, setEditModal] = useState<{ open: boolean; member: UserSummary | null }>({
    open: false,
    member: null,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.members(room_id),
    queryFn: () => api.listMembers(room_id),
  });
  const members = membersQuery.data ?? [];

  const roleMutation = useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: number; newRole: 'Admin' | 'Member' }) =>
      api.updateMemberRole(room_id, memberId, newRole),
    onSuccess: () => {
      setEditModal({ open: false, member: null });
      queryClient.invalidateQueries({ queryKey: queryKeys.members(room_id) });
    },
    onError: (error) => {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to update role');
    },
  });

  const handleRoleChange = async (newRole: 'Admin' | 'Member') => {
    if (!editModal.member) return;
    const confirmMessage =
      newRole === 'Admin'
        ? `Promote ${editModal.member.name} to Admin?`
        : `Demote ${editModal.member.name} to Member?`;

    showAlert('Confirm', confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'OK',
        onPress: () => roleMutation.mutate({ memberId: editModal.member!.user_id, newRole }),
      },
    ]);
  };

  if (membersQuery.isPending) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 56 + insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={membersQuery.isFetching && !membersQuery.isPending}
            onRefresh={() => membersQuery.refetch()}
          />
        }
      >
        <Text style={styles.heading}>Friends</Text>

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
              <Avatar
                uri={member.profile}
                label={member.name || member.email}
                size={48}
                backgroundColor="#ede9fe"
                borderWidth={2}
                borderColor="#c4b5fd"
                textColor="#9333ea"
                style={styles.avatarFallback}
              />
              <View style={styles.memberInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.memberName}>{member.name || member.email}</Text>
                  {member.role === 'Admin' && (
                    <View style={[styles.roleBadge, styles.adminBadge]}>
                      <Text style={styles.roleBadgeText}>{member.role}</Text>
                    </View>
                  )}
                </View>
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
  container: { flex: 1, backgroundColor: '#faf5ff', padding: 16 },
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
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#9333ea' },
  memberInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  adminBadge: { backgroundColor: '#e0e7ff' },
  roleBadgeText: { fontSize: 11, fontWeight: '500', color: '#555' },
  editBtn: { padding: 8 },
  editBtnText: { fontSize: 13, color: '#9333ea', fontWeight: '600' },
  addButton: {
    backgroundColor: '#9333ea',
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
