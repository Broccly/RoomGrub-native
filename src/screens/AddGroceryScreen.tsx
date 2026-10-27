import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ActionButton from '../components/ActionButton';
import CrossPlatformDatePicker, { CrossPlatformDatePickerHandle } from '../components/CrossPlatformDatePicker';
import Avatar from '../components/Avatar';
import useUserRole from '../hooks/useUserRole';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { queryKeys } from '../services/queryClient';
import { ExpenseItem } from '../types/api';
import { colors } from '../theme/colors';
import { formatAmount } from '../utils/format';

// Suggestions are the room's most-used items, ranked by the backend; a new room
// is padded with these so the row is never empty.
const STARTER_ITEMS = ['Milk', 'Water can', 'Vegetables', 'Groceries', 'Gas', 'Electricity'];
const FREQUENT_ITEM_COUNT = 6;
const TOAST_MS = 4000;

const INITIAL_WINDOW_HEIGHT = Dimensions.get('window').height;
const ACTION_BAR_RESERVED_HEIGHT = 200;

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
  return rest.length > 0 ? `${cappedInt}.${rest.join('').slice(0, 2)}` : cappedInt;
}

// Appends each comma-separated entry of `raw` to `list`, skipping blanks and
// case-insensitive duplicates.
function addItems(list: string[], raw: string): string[] {
  const out = [...list];
  raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((t) => {
      if (!out.some((x) => x.toLowerCase() === t.toLowerCase())) out.push(t);
    });
  return out;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type FormSnapshot = {
  amount: string;
  items: string[];
  payerId: number | null;
  participantIds: number[];
  date: Date;
};

type Toast = { text: string; expenseId: number; snapshot: FormSnapshot };

export default function AddGroceryScreen({ route }: any) {
  const room_id = Number(route.params.room_id);
  const { role } = useUserRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isAdmin = role === 'Admin';

  const amountInputRef = useRef<TextInput>(null);
  const datePickerRef = useRef<CrossPlatformDatePickerHandle>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('transitionEnd', () => {
      amountInputRef.current?.focus();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const membersQuery = useQuery({
    queryKey: queryKeys.members(room_id),
    queryFn: () => api.listMembers(room_id),
  });
  // The person adding comes first so the split row reads "You, …".
  const members = [...(membersQuery.data ?? [])].sort(
    (a, b) => Number(b.user_id === user?.id) - Number(a.user_id === user?.id),
  );

  const frequentQuery = useQuery({
    queryKey: queryKeys.frequentItems(room_id),
    queryFn: () => api.getFrequentItems(room_id, FREQUENT_ITEM_COUNT),
    select: (data) => addItems(data.items, STARTER_ITEMS.join(',')).slice(0, FREQUENT_ITEM_COUNT),
  });
  const frequentItems = frequentQuery.data ?? STARTER_ITEMS;

  const [amount, setAmount] = useState('');
  const [amountWidth, setAmountWidth] = useState(40);
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [payerId, setPayerId] = useState<number | null>(user?.id ?? null);
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [date, setDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [payerMenuOpen, setPayerMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);

  // useAuth loads the user asynchronously, so default the payer to "You" once it arrives.
  useEffect(() => {
    if (user?.id != null) setPayerId((prev) => prev ?? user.id);
  }, [user?.id]);

  const allMemberIds = () =>(membersQuery.data ?? []).map((m) => m.user_id);

  useEffect(() => {
    if (!membersQuery.data?.length) return;
    setParticipantIds(allMemberIds());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membersQuery.data]);

  const invalidateExpenseData = () => {
    queryClient.invalidateQueries({ queryKey: ['room', room_id, 'expenses'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.roomDashboard(room_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.roomSummary(room_id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.splits(room_id) });
    queryClient.invalidateQueries({ queryKey: ['room', room_id, 'member'] });
  };

  const resetForm = () => {
    setAmount('');
    setItems([]);
    setDraft('');
    setPayerId(user?.id ?? null);
    setParticipantIds(allMemberIds());
    setDate(new Date());
  };

  const nameOf = (userId: number | null) => {
    const m = members.find((x) => x.user_id === userId);
    return m ? m.name || m.email : '';
  };

  const addExpenseMutation = useMutation({
    mutationFn: ({
      payload,
      payer,
    }: {
      payload: { material: string; money: number; created_at?: string; participant_user_ids: number[] };
      payer: number | null;
      snapshot: FormSnapshot;
    }): Promise<ExpenseItem> =>
      payer === user?.id || payer === null
        ? api.createExpense(room_id, payload)
        : api.createExpenseForMember(room_id, { ...payload, user_id: payer }),
    onSuccess: (expense, { payload, payer, snapshot }) => {
      invalidateExpenseData();
      resetForm();
      const forWhom = payer !== null && payer !== user?.id ? ` for ${nameOf(payer)}` : '';
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({
        text: `Added ${formatAmount(payload.money)} · ${payload.material}${forWhom}`,
        expenseId: expense.id,
        snapshot,
      });
      toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to add expense');
    },
  });

  const undoMutation = useMutation({
    mutationFn: (t: Toast) => api.deleteExpense(room_id, t.expenseId),
    onSuccess: (_data, t) => {
      invalidateExpenseData();
      setAmount(t.snapshot.amount);
      setItems(t.snapshot.items);
      setDraft('');
      setPayerId(t.snapshot.payerId);
      setParticipantIds(t.snapshot.participantIds);
      setDate(t.snapshot.date);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to undo');
    },
  });

  const commitDraft = () => {
    if (!draft.trim()) return;
    setItems((prev) => addItems(prev, draft));
    setDraft('');
  };

  const handleDraftChange = (text: string) => {
    setError('');
    const lastComma = text.lastIndexOf(',');
    if (lastComma === -1) {
      setDraft(text);
      return;
    }
    setItems((prev) => addItems(prev, text.slice(0, lastComma)));
    setDraft(text.slice(lastComma + 1).trimStart());
  };

  const toggleSuggestion = (label: string) => {
    setError('');
    setItems((prev) =>
      prev.some((x) => x.toLowerCase() === label.toLowerCase())
        ? prev.filter((x) => x.toLowerCase() !== label.toLowerCase())
        : [...prev, label],
    );
  };

  const toggleParticipant = (userId: number) => {
    // The payer always shares in their own expense.
    if (userId === payerId) return;
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const pickPayer = (userId: number) => {
    setPayerId(userId);
    setParticipantIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    setPayerMenuOpen(false);
  };

  const material = addItems(items, draft).join(', ');
  const numericAmount = parseFloat(amount || '0') || 0;
  const canSubmit = numericAmount > 0 && material.length > 0 && participantIds.length > 0;
  const isToday = toLocalDateString(date) === toLocalDateString(new Date());

  const handleAdd = () => {
    if (!canSubmit) return;
    setError('');
    addExpenseMutation.mutate({
      payload: {
        material,
        money: numericAmount,
        // Today keeps the server's timestamp; a picked day is sent as a plain
        // local date so it never shifts across the UTC boundary.
        created_at: isToday ? undefined : toLocalDateString(date),
        participant_user_ids: participantIds,
      },
      payer: payerId,
      snapshot: { amount, items: addItems(items, draft), payerId, participantIds, date },
    });
  };

  const handleUndo = () => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
    undoMutation.mutate(toast);
  };

  if (membersQuery.isPending) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  // Without members there is no one to split with, so offer a retry instead of a dead form.
  if (membersQuery.isError && !membersQuery.data) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadErrorText}>
          {membersQuery.error instanceof Error ? membersQuery.error.message : "Couldn't load the room's members."}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => membersQuery.refetch()}
          disabled={membersQuery.isFetching}
          accessibilityRole="button"
        >
          {membersQuery.isFetching ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Text style={styles.retryText}>Try again</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const amountDisplay = formatAmountDisplay(amount);
  const perHead = numericAmount > 0 && participantIds.length > 0 ? numericAmount / participantIds.length : 0;
  const splitLabel =
    participantIds.length === members.length
      ? 'Split with everyone'
      : `Split with ${participantIds.length} of ${members.length}`;
  const payer = members.find((m) => m.user_id === payerId);
  const payerLabel = payerId === user?.id ? 'You' : nameOf(payerId);
  const dateLabel = isToday
    ? 'Today'
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={[styles.container, { height: INITIAL_WINDOW_HEIGHT }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: ACTION_BAR_RESERVED_HEIGHT + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Split with — always visible so it's clear who this expense is for */}
        <View style={styles.splitSection}>
          <View style={styles.splitHeader}>
            <Text style={styles.fieldLabel}>{splitLabel}</Text>
            {perHead > 0 && <Text style={styles.perHead}>{formatAmount(perHead)} each</Text>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.splitRow}>
            {members.map((m) => {
              const selected = participantIds.includes(m.user_id);
              const label = m.user_id === user?.id ? 'You' : m.name || m.email;
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={styles.splitPerson}
                  onPress={() => toggleParticipant(m.user_id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: m.user_id === payerId }}
                  accessibilityLabel={label}
                >
                  <View style={[styles.avatarRing, selected ? styles.avatarRingOn : styles.avatarRingOff]}>
                    <Avatar
                      uri={m.profile}
                      label={m.name || m.email}
                      size={36}
                      fontSize={14}
                      backgroundColor={colors.purpleAvatar}
                      textColor={colors.brand}
                    />
                    {selected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={9} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.splitName, !selected && styles.splitNameOff]} numberOfLines={1}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Amount */}
        <View style={styles.amountRow}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <Text
            style={[styles.amountInput, styles.amountMeasure]}
            onLayout={(e) => setAmountWidth(Math.ceil(e.nativeEvent.layout.width))}
          >
            {amountDisplay || '0'}
          </Text>
          <TextInput
            ref={amountInputRef}
            testID="amount-input-ADD EXPENSE"
            style={[styles.amountInput, { width: Math.max(amountWidth, 20) }]}
            value={amountDisplay}
            onChangeText={(t) => {
              setError('');
              setAmount(sanitizeAmountInput(t));
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.purple200}
            accessibilityLabel="Amount"
          />
        </View>

        {/* Description as chips */}
        <View style={styles.chipField}>
          {items.map((label) => (
            <View key={label} style={styles.itemChip}>
              <Text style={styles.itemChipText}>{label}</Text>
              <TouchableOpacity
                onPress={() => setItems((prev) => prev.filter((x) => x !== label))}
                hitSlop={8}
                style={styles.itemChipRemove}
                accessibilityLabel={`Remove ${label}`}
              >
                <Ionicons name="close" size={14} color={colors.brandDark} />
              </TouchableOpacity>
            </View>
          ))}
          <TextInput
            style={styles.chipInput}
            value={draft}
            onChangeText={handleDraftChange}
            onSubmitEditing={commitDraft}
            onBlur={commitDraft}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && draft === '' && items.length > 0) {
                setItems((prev) => prev.slice(0, -1));
              }
            }}
            blurOnSubmit={false}
            returnKeyType="done"
            placeholder={items.length ? 'Add more…' : 'What was it for?'}
            placeholderTextColor={colors.textMuted}
            textAlign="center"
            accessibilityLabel="What was it for"
          />
        </View>

        {/* Frequent items */}
        <View style={styles.suggestions}>
          {frequentItems.map((label) => {
            const active = items.some((x) => x.toLowerCase() === label.toLowerCase());
            return (
              <TouchableOpacity
                key={label}
                style={[styles.suggestion, active && styles.suggestionActive]}
                onPress={() => toggleSuggestion(label)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={label}
              >
                <Text style={[styles.suggestionText, active && styles.suggestionTextActive]} numberOfLines={1}>
                  {label.length > 10 ? `${label.slice(0, 10).trimEnd()}…` : label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Top of the screen so the keyboard never hides it */}
      {toast && (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={18} color={colors.greenBorder} />
          <Text style={styles.toastText} numberOfLines={2}>
            {toast.text}
          </Text>
          {/* The payer, or the admin who added it for them, may delete it. */}
          <TouchableOpacity onPress={handleUndo} style={styles.toastUndo}>
            <Text style={styles.toastUndoText}>Undo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom bar: paid by · date, then submit */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
        {error !== '' && (
          <View style={styles.errorPill}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.detailsRow}>
          {isAdmin ? (
            <TouchableOpacity
              style={styles.chip}
              onPress={() => setPayerMenuOpen(true)}
              accessibilityLabel={`Paid by ${payerLabel}`}
              hitSlop={8}
            >
              <Avatar
                uri={payer?.profile}
                label={payer?.name || payer?.email || '?'}
                size={20}
                fontSize={10}
                backgroundColor={colors.purpleAvatar}
                textColor={colors.brand}
              />
              <Text style={styles.chipText} numberOfLines={1}>
                <Text style={styles.chipLabel}>Paid by: </Text>
                {payerLabel}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textLight} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.chip, styles.chipStatic]}>
              <Avatar
                uri={user?.profile}
                label={user?.name || user?.email || '?'}
                size={20}
                fontSize={10}
                backgroundColor={colors.purpleAvatar}
                textColor={colors.brand}
              />
              <Text style={styles.chipText} numberOfLines={1}>
                <Text style={styles.chipLabel}>Paid by: </Text>
                You
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.chip}
            onPress={() => {
              datePickerRef.current?.open();
              setShowDatePicker(true);
            }}
            accessibilityLabel={`Date ${dateLabel}`}
            hitSlop={8}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.brandDark} />
            <Text style={[styles.chipText, styles.chipDateText]} numberOfLines={1}>
              {dateLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <ActionButton
          testID="submit-button-ADD EXPENSE"
          style={styles.submit}
          gradientColors={canSubmit ? [colors.brand, colors.brandDark] : [colors.textMuted, colors.textMuted]}
          onPress={handleAdd}
          loading={addExpenseMutation.isPending}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>{canSubmit ? `Add ${formatAmount(numericAmount)}` : 'Add expense'}</Text>
        </ActionButton>
      </View>

      <CrossPlatformDatePicker
        ref={datePickerRef}
        isVisible={showDatePicker}
        mode="date"
        date={date}
        maximumDate={new Date()}
        onConfirm={(d) => {
          setDate(d);
          setShowDatePicker(false);
        }}
        onCancel={() => setShowDatePicker(false)}
      />

      <Modal visible={payerMenuOpen} transparent animationType="fade" onRequestClose={() => setPayerMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setPayerMenuOpen(false)}>
          <View style={[styles.menu, { bottom: insets.bottom + 150 }]}>
            <Text style={styles.menuTitle}>Paid by</Text>
            {members.map((m) => {
              const selected = m.user_id === payerId;
              const label = m.user_id === user?.id ? 'You' : m.name || m.email;
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={[styles.menuItem, selected && styles.menuItemSelected]}
                  onPress={() => pickPayer(m.user_id)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                >
                  <Avatar
                    uri={m.profile}
                    label={m.name || m.email}
                    size={28}
                    fontSize={12}
                    backgroundColor={colors.purpleAvatar}
                    textColor={colors.brand}
                  />
                  <Text style={styles.menuItemText} numberOfLines={1}>
                    {label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={colors.brand} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadErrorText: {
    marginTop: 12,
    marginHorizontal: 32,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  splitSection: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  perHead: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandDark,
  },
  splitRow: {
    gap: 4,
  },
  splitPerson: {
    width: 60,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  avatarRing: {
    borderRadius: 999,
    padding: 2,
    borderWidth: 2,
  },
  avatarRingOn: {
    borderColor: colors.brandMid,
  },
  avatarRingOff: {
    borderColor: 'transparent',
    opacity: 0.35,
  },
  checkBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  splitNameOff: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  rupeeSymbol: {
    fontSize: 32,
    fontWeight: '500',
    color: colors.brand,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 60,
    fontWeight: '800',
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
  chipField: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    minHeight: 54,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: colors.purple200,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 36,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 999,
    backgroundColor: colors.purple100,
    borderWidth: 1,
    borderColor: colors.purple200,
  },
  itemChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brandDark,
  },
  itemChipRemove: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInput: {
    flexGrow: 1,
    minWidth: 120,
    fontSize: 19,
    fontWeight: '600',
    color: colors.textPrimary,
    paddingVertical: 6,
    outlineWidth: 0,
    outlineStyle: 'none',
  } as any,
  suggestions: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestion: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.purple200,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
  },
  suggestionActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandDark,
  },
  suggestionTextActive: {
    color: '#fff',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  toast: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.textPrimary,
    borderRadius: 14,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  toastText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  toastUndo: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
  },
  toastUndoText: {
    color: colors.purple200,
    fontSize: 14,
    fontWeight: '700',
  },
  errorPill: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.redBorder,
  },
  errorText: {
    color: colors.dangerDark,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // 3 + 1px border keeps the same height as before.
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.purple200,
    backgroundColor: colors.purple100,
  },
  // Members can't change the payer, so it shouldn't look tappable.
  chipStatic: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  chipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipLabel: {
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipDateText: {
    color: colors.brandDark,
  },
  submit: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menu: {
    position: 'absolute',
    left: 16,
    width: 220,
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.purple200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  menuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  menuItemSelected: {
    backgroundColor: colors.purple100,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
