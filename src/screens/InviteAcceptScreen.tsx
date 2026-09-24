import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { useAuth } from '../hooks/useAuth';
import ActionButton from '../components/ActionButton';
import { colors } from '../theme/colors';
import { setPendingInviteToken } from '../utils/pendingInvite';

export default function InviteAcceptScreen({ navigation, route }: any) {
  const token: string = route.params?.token;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const inviteQuery = useQuery({
    queryKey: token ? queryKeys.inviteByToken(token) : ['invite', 'disabled'],
    queryFn: () => api.validateInvite(token),
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptInvite(token),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms });
      navigation.replace('RoomHome', { room_id: result.room_id });
    },
    onError: (error) => {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to accept invite');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.rejectInvite(token),
    onSuccess: () => {
      navigation.replace('RoomsList');
    },
    onError: (error) => {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reject invite');
    },
  });

  const submitting = acceptMutation.isPending || rejectMutation.isPending;

  const handleLoginFirst = () => {
    setPendingInviteToken(token);
    navigation.replace('Login');
  };

  if (!token) {
    return (
      <View style={[styles.container, styles.centered, { paddingBottom: insets.bottom }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.title}>Invite Unavailable</Text>
        <Text style={styles.subtitle}>Missing invite link.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace(isAuthenticated ? 'RoomsList' : 'Login')}
        >
          <Text style={styles.buttonText}>{isAuthenticated ? 'Go to Rooms' : 'Go to Login'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (inviteQuery.isPending || authLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (inviteQuery.isError) {
    const reason =
      inviteQuery.error instanceof Error
        ? inviteQuery.error.message
        : 'This invite link is invalid or has expired.';
    return (
      <View style={[styles.container, styles.centered, { paddingBottom: insets.bottom }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.title}>Invite Unavailable</Text>
        <Text style={styles.subtitle}>{reason}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace(isAuthenticated ? 'RoomsList' : 'Login')}
        >
          <Text style={styles.buttonText}>{isAuthenticated ? 'Go to Rooms' : 'Go to Login'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const invite = inviteQuery.data;

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centered, { paddingBottom: insets.bottom }]}>
        <Ionicons name="mail-open-outline" size={48} color={colors.brand} />
        <Text style={styles.title}>You've been invited!</Text>
        <Text style={styles.subtitle}>
          Log in to accept the invite from {invite.invited_by_email}.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleLoginFirst}>
          <Text style={styles.buttonText}>Log In to Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered, { paddingBottom: insets.bottom }]}>
      <Ionicons name="mail-open-outline" size={48} color={colors.brand} />
      <Text style={styles.title}>Room Invitation</Text>
      <Text style={styles.subtitle}>
        {invite.invited_by_email} invited you to join Room #{invite.room_id}.
      </Text>
      <Text style={styles.hint}>
        Expires in {invite.days_left} day{invite.days_left !== 1 ? 's' : ''}
      </Text>
      <ActionButton
        style={styles.button}
        onPress={() => acceptMutation.mutate()}
        loading={acceptMutation.isPending}
        disabled={rejectMutation.isPending}
      >
        <Text style={styles.buttonText}>Accept</Text>
      </ActionButton>
      <ActionButton
        style={styles.secondaryButton}
        onPress={() => rejectMutation.mutate()}
        loading={rejectMutation.isPending}
        disabled={acceptMutation.isPending}
        indicatorColor="#666"
        shimmer={false}
      >
        <Text style={styles.secondaryButtonText}>Decline</Text>
      </ActionButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 4, maxWidth: 320 },
  hint: { fontSize: 12, color: '#999', marginBottom: 20 },
  button: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { paddingVertical: 14, marginTop: 4 },
  secondaryButtonText: { color: '#666', fontSize: 14, fontWeight: '600' },
});
