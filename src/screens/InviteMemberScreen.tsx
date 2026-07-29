import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { useRoomContext } from '../context/RoomContext';

export default function InviteMemberScreen() {
  const { roomId } = useRoomContext();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  const handleGenerateLink = async () => {
    if (!roomId) return;
    setLoading(true);
    try {
      const result = await api.createInvite(roomId);
      setInviteLink(`roomgrub://invite/${result.token}`);
      setDaysLeft(result.days_left);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    try {
      await Share.share({
        message: `Join my room on RoomGrub: ${inviteLink}`,
        url: inviteLink,
      });
    } catch {
      // user cancelled or share failed silently
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-add" size={28} color={colors.brand} />
        </View>
        <Text style={styles.title}>Invite a Friend</Text>
        <Text style={styles.subtitle}>
          Generate a link and share it with whoever you want to add to this room.
        </Text>

        {!inviteLink ? (
          <TouchableOpacity style={styles.button} onPress={handleGenerateLink} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Generate Invite Link</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.linkBox}>
              <Text style={styles.linkText} numberOfLines={1}>
                {inviteLink}
              </Text>
            </View>
            {daysLeft !== null && (
              <Text style={styles.hint}>Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.buttonText}>Share Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleGenerateLink} disabled={loading}>
              <Text style={styles.secondaryButtonText}>Generate New Link</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  linkBox: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
  },
});
