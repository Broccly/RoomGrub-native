import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme/colors';
import { InviteResponse } from '../types/api';
import { setPendingInviteToken } from '../utils/pendingInvite';

type ValidationState =
  | { status: 'loading' }
  | { status: 'valid'; invite: InviteResponse }
  | { status: 'invalid'; reason: string };

export default function InviteAcceptScreen({ navigation, route }: any) {
  const token: string = route.params?.token;
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [state, setState] = useState<ValidationState>({ status: 'loading' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState({ status: 'invalid', reason: 'Missing invite link.' });
      return;
    }

    api
      .validateInvite(token)
      .then((invite) => setState({ status: 'valid', invite }))
      .catch((error) =>
        setState({
          status: 'invalid',
          reason: error instanceof Error ? error.message : 'This invite link is invalid or has expired.',
        }),
      );
  }, [token]);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const result = await api.acceptInvite(token);
      navigation.replace('RoomHome', { room_id: result.room_id });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to accept invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await api.rejectInvite(token);
      navigation.replace('RoomsList');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reject invite');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginFirst = () => {
    setPendingInviteToken(token);
    navigation.replace('Login');
  };

  if (state.status === 'loading' || authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (state.status === 'invalid') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.title}>Invite Unavailable</Text>
        <Text style={styles.subtitle}>{state.reason}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace(isAuthenticated ? 'RoomsList' : 'Login')}
        >
          <Text style={styles.buttonText}>{isAuthenticated ? 'Go to Rooms' : 'Go to Login'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="mail-open-outline" size={48} color={colors.brand} />
        <Text style={styles.title}>You've been invited!</Text>
        <Text style={styles.subtitle}>
          Log in to accept the invite from {state.invite.invited_by_email}.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleLoginFirst}>
          <Text style={styles.buttonText}>Log In to Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.centered]}>
      <Ionicons name="mail-open-outline" size={48} color={colors.brand} />
      <Text style={styles.title}>Room Invitation</Text>
      <Text style={styles.subtitle}>
        {state.invite.invited_by_email} invited you to join Room #{state.invite.room_id}.
      </Text>
      <Text style={styles.hint}>
        Expires in {state.invite.days_left} day{state.invite.days_left !== 1 ? 's' : ''}
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleAccept} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={handleReject} disabled={submitting}>
        <Text style={styles.secondaryButtonText}>Decline</Text>
      </TouchableOpacity>
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
