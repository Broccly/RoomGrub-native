import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CrossPlatformDatePicker, { CrossPlatformDatePickerHandle } from '../components/CrossPlatformDatePicker';
import useUserRole from '../hooks/useUserRole';
import { api } from '../services/api';
import { UserSummary } from '../types/api';
import { colors } from '../theme/colors';
import Avatar from '../components/Avatar';

function formatAmountDisplay(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const formatted = (parseInt(intPart || '0', 10) || 0).toLocaleString('en-IN');
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

function sanitizeAmountInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const [intPart, ...rest] = cleaned.split('.');
  const cappedInt = intPart.slice(0, 5);
  return rest.length > 0 ? `${cappedInt}.${rest.join('')}` : cappedInt;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
      <TouchableOpacity style={styles.pillBtn} onPress={onOpen}>
        <Ionicons name="people-outline" size={16} color={colors.brand} />
        <Text style={styles.pillBtnText}>
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
                    color={member.user_id === lockedUserId ? colors.purpleAvatarBorder : colors.brand}
                  />
                  <Avatar
                    uri={member.profile}
                    label={member.name || member.email}
                    size={28}
                    fontSize={14}
                    backgroundColor={colors.purpleAvatar}
                    textColor={colors.textSecondary}
                    style={styles.friendAvatarFallback}
                  />
                  <Text style={styles.label}>{member.name || member.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.submitWrap} onPress={onClose}>
              <LinearGradient colors={[colors.brand, colors.brandDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitGradient}>
                <Text style={styles.submitText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function GroceryHeroForm({
  title,
  amount,
  onAmountChange,
  description,
  onDescriptionChange,
  date,
  onDatePress,
  onClearDate,
  participantSlot,
  friendSlot,
  onSubmit,
  loading,
  msg,
  submitLabel,
  pinBottom,
}: {
  title: string;
  amount: string;
  onAmountChange: (t: string) => void;
  description: string;
  onDescriptionChange: (t: string) => void;
  date: Date | null;
  onDatePress: () => void;
  onClearDate: () => void;
  participantSlot: React.ReactNode;
  friendSlot?: React.ReactNode;
  onSubmit: () => void;
  loading: boolean;
  msg: string;
  submitLabel: string;
  pinBottom?: boolean;
}) {
  const [descFocused, setDescFocused] = useState(false);
  const [amountWidth, setAmountWidth] = useState(40);
  const canSubmit = description.trim().length > 0 && parseFloat(amount || '0') > 0;
  const isSuccess = msg.startsWith('✅');
  const amountDisplay = formatAmountDisplay(amount);

  return (
    <View style={pinBottom && styles.pageWrap}>
      <Text style={styles.eyebrow}>{title}</Text>

      <View style={pinBottom && styles.middleGroup}>
        <View style={styles.amountRow}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <Text
            style={[styles.amountInput, styles.amountMeasure]}
            onLayout={(e) => setAmountWidth(Math.ceil(e.nativeEvent.layout.width))}
          >
            {amountDisplay || '0'}
          </Text>
          <TextInput
            style={[styles.amountInput, { width: Math.max(amountWidth, 20) }]}
            value={amountDisplay}
            onChangeText={(t) => onAmountChange(sanitizeAmountInput(t))}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TextInput
          style={[styles.descriptionInput, descFocused && styles.descriptionInputFocused]}
          placeholder="What did you buy?"
          value={description}
          onChangeText={onDescriptionChange}
          onFocus={() => setDescFocused(true)}
          onBlur={() => setDescFocused(false)}
          editable={parseFloat(amount || '0') > 0}
          placeholderTextColor={colors.textMuted}
          textAlign="center"
        />

        {msg !== '' && (
          <View style={[styles.msgPill, isSuccess ? styles.msgPillSuccess : styles.msgPillError]}>
            <Text style={[styles.msgPillText, isSuccess ? styles.msgPillTextSuccess : styles.msgPillTextError]}>
              {msg}
            </Text>
          </View>
        )}
      </View>

      <View>
        <View style={styles.toolbar}>
          {participantSlot}

          <TouchableOpacity style={styles.pillBtn} onPress={onDatePress}>
            <Ionicons name="calendar-outline" size={16} color={colors.brand} />
            <Text style={styles.pillBtnText}>
              {date ? formatDateLabel(date) : 'Date'}
            </Text>
            {date && (
              <TouchableOpacity onPress={onClearDate} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.brand} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {friendSlot}
        </View>

        <TouchableOpacity
          style={styles.submitWrap}
          onPress={onSubmit}
          disabled={loading || !canSubmit}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={loading || !canSubmit ? [colors.textMuted, colors.textMuted] : [colors.brand, colors.brandDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.submitGradient}
          >
            <Text style={styles.submitText}>{loading ? 'Adding...' : submitLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
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

  const datePickerRef = useRef<CrossPlatformDatePickerHandle>(null);
  const friendDatePickerRef = useRef<CrossPlatformDatePickerHandle>(null);

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
      setMsg('❌ Please fill valid grocery and price.');
      return;
    }
    if (participantIds.length === 0) {
      setMsg('❌ Select at least one participant.');
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
      setMsg('✅ Grocery added!');
      setGrocery('');
      setPrice('');
      setDate(null);
    } catch (error) {
      setMsg(`❌ ${error instanceof Error ? error.message : 'Failed to add grocery'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddForFriend = async () => {
    setFriendMsg('');
    const numericPrice = Number(friendPrice);

    if (!selectedFriend) {
      setFriendMsg('❌ Please select a friend.');
      return;
    }
    if (!friendGrocery || !friendPrice || Number.isNaN(numericPrice) || numericPrice <= 0) {
      setFriendMsg('❌ Please fill valid grocery and price.');
      return;
    }
    if (friendParticipantIds.length === 0) {
      setFriendMsg('❌ Select at least one participant.');
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
      setFriendMsg(`✅ Added for ${selectedFriend.name || selectedFriend.email}`);
      setSelectedFriend(null);
      setFriendGrocery('');
      setFriendPrice('');
      setFriendDate(null);
      setTimeout(() => {
        setShowFriendModal(false);
        setFriendMsg('');
      }, 1000);
    } catch (error) {
      setFriendMsg(`❌ ${error instanceof Error ? error.message : 'Failed to add grocery'}`);
    } finally {
      setFriendLoading(false);
    }
  };

  if (membersLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <GroceryHeroForm
          title="ADD GROCERY"
          amount={price}
          onAmountChange={setPrice}
          description={grocery}
          onDescriptionChange={setGrocery}
          date={date}
          onDatePress={() => {
            datePickerRef.current?.open();
            setShowDatePicker(true);
          }}
          onClearDate={() => setDate(null)}
          participantSlot={
            <ParticipantPicker
              members={members}
              selectedIds={participantIds}
              onToggle={toggleParticipant}
              visible={showParticipantPicker}
              onOpen={() => setShowParticipantPicker(true)}
              onClose={() => setShowParticipantPicker(false)}
            />
          }
          friendSlot={
            role === 'Admin' ? (
              <TouchableOpacity style={styles.pillBtn} onPress={() => setShowFriendModal(true)}>
                <Ionicons name="person-add-outline" size={16} color={colors.brand} />
                <Text style={styles.pillBtnText}>For friend</Text>
              </TouchableOpacity>
            ) : undefined
          }
          onSubmit={handleAdd}
          loading={loading}
          msg={msg}
          submitLabel="Add Grocery"
          pinBottom
        />

        <CrossPlatformDatePicker
          ref={datePickerRef}
          isVisible={showDatePicker}
          mode="date"
          date={date ?? new Date()}
          maximumDate={new Date()}
          onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />
      </ScrollView>

      <Modal visible={showFriendModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Grocery for Friend</Text>
              <TouchableOpacity onPress={() => setShowFriendModal(false)}>
                <Text style={styles.closeBtn}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={styles.label}>Select Friend</Text>
              <ScrollView horizontal style={styles.friendSelector} showsHorizontalScrollIndicator={false}>
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
                    <Avatar
                      uri={member.profile}
                      label={member.name || member.email}
                      size={28}
                      fontSize={14}
                      backgroundColor={colors.purpleAvatar}
                      textColor={colors.textSecondary}
                      style={styles.friendAvatarFallback}
                    />
                    <Text style={styles.friendName}>{member.name || member.email}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <GroceryHeroForm
                title="ADD FOR FRIEND"
                amount={friendPrice}
                onAmountChange={setFriendPrice}
                description={friendGrocery}
                onDescriptionChange={setFriendGrocery}
                date={friendDate}
                onDatePress={() => {
                  friendDatePickerRef.current?.open();
                  setShowFriendDatePicker(true);
                }}
                onClearDate={() => setFriendDate(null)}
                participantSlot={
                  <ParticipantPicker
                    members={members}
                    selectedIds={friendParticipantIds}
                    onToggle={toggleFriendParticipant}
                    visible={showFriendParticipantPicker}
                    onOpen={() => setShowFriendParticipantPicker(true)}
                    onClose={() => setShowFriendParticipantPicker(false)}
                    lockedUserId={selectedFriend?.user_id}
                  />
                }
                onSubmit={handleAddForFriend}
                loading={friendLoading}
                msg={friendMsg}
                submitLabel="Add Grocery"
              />

              <CrossPlatformDatePicker
                ref={friendDatePickerRef}
                isVisible={showFriendDatePicker}
                mode="date"
                date={friendDate ?? new Date()}
                maximumDate={new Date()}
                onConfirm={(d) => { setFriendDate(d); setShowFriendDatePicker(false); }}
                onCancel={() => setShowFriendDatePicker(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 32,
  },
  pageWrap: {
    flex: 1,
  },
  middleGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.brand,
    marginTop: 8,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  rupeeSymbol: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.brand,
    marginRight: 2,
  },
  amountInput: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.textPrimary,
    borderWidth: 0,
    outlineWidth: 0,
    outlineStyle: 'none',
    backgroundColor: 'transparent',
    textAlign: 'center',
    padding: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
  } as any,
  amountMeasure: {
    position: 'absolute',
    opacity: 0,
    left: -9999,
  },
  descriptionInput: {
    borderWidth: 0,
    borderBottomWidth: 2,
    borderColor: colors.purple200,
    outlineWidth: 0,
    outlineStyle: 'none',
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
    paddingVertical: 10,
    marginBottom: 8,
    textAlign: 'center',
  } as any,
  descriptionInputFocused: {
    borderColor: colors.brand,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.purple100,
    paddingTop: 16,
    marginTop: 28,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.purple200,
    backgroundColor: colors.purple100,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillBtnText: { color: colors.brand, fontWeight: '500', fontSize: 14 },
  pillBtnTextMuted: { color: colors.textMuted },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  submitWrap: {
    marginTop: 20,
  },
  submitGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  msgPill: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  msgPillSuccess: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.greenBorder,
  },
  msgPillError: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.redBorder,
  },
  msgPillText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  msgPillTextSuccess: { color: colors.successDark },
  msgPillTextError: { color: colors.dangerDark },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 24,
    maxHeight: '85%',
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
    color: colors.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: '700',
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  friendSelector: {
    marginBottom: 16,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutralLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendChipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.purple100,
  },
  friendAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.purpleAvatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  friendAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
