import { supabase } from '../utils/supabase';
import {
  BootstrapResponse,
  ExpenseItem,
  MemberDetail,
  PaymentItem,
  RoomSummary,
  SplitsSummary,
  UserSummary,
} from '../types/api';

type ApiMethod = 'GET' | 'POST';

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

async function callApi<T>(
  path: string,
  method: ApiMethod,
  options?: { query?: Record<string, string | number | undefined>; payload?: Record<string, unknown> },
): Promise<T> {
  const query = Object.fromEntries(
    Object.entries(options?.query || {}).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;

  const { data, error } = await supabase.functions.invoke<ApiEnvelope<T>>('roomgrub_api', {
    body: {
      path,
      method,
      query,
      payload: options?.payload || {},
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to reach backend');
  }

  if (!data) {
    throw new Error('Empty API response');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  if (!data.data) {
    throw new Error('Malformed API response');
  }

  return data.data;
}

export const api = {
  bootstrap: () => callApi<BootstrapResponse>('/v1/bootstrap', 'POST'),

  createRoom: () =>
    callApi<{
      room: { id: number; members: number; admin_email: string };
      user_membership: { room_id: number; role: 'Admin' | 'Member' | null };
    }>('/v1/rooms.create', 'POST'),

  getRoomSummary: (roomId: number) =>
    callApi<RoomSummary>(`/v1/rooms/${roomId}/summary`, 'GET'),

  listMembers: (roomId: number) =>
    callApi<{ members: UserSummary[] }>(`/v1/rooms/${roomId}/members.list`, 'GET'),

  inviteMember: (roomId: number, email: string) =>
    callApi<{ status: 'invited' | 'joined_existing_user' }>(
      `/v1/rooms/${roomId}/members.invite`,
      'POST',
      { payload: { email } },
    ),

  updateMemberRole: (roomId: number, targetUserId: number, role: 'Admin' | 'Member') =>
    callApi<{ success: boolean }>(`/v1/rooms/${roomId}/members.updateRole`, 'POST', {
      payload: { target_user_id: targetUserId, role },
    }),

  listExpenses: (roomId: number, query?: Record<string, string | number | undefined>) =>
    callApi<{ items: ExpenseItem[]; has_more: boolean; next_cursor: string | null }>(
      `/v1/rooms/${roomId}/expenses.list`,
      'GET',
      { query },
    ),

  createExpense: (
    roomId: number,
    payload: { user_id: number; material: string; money: number; created_at?: string },
  ) => callApi<ExpenseItem>(`/v1/rooms/${roomId}/expenses.create`, 'POST', { payload }),

  listPayments: (roomId: number, query?: Record<string, string | number | undefined>) =>
    callApi<{ items: PaymentItem[]; has_more: boolean; next_cursor: string | null }>(
      `/v1/rooms/${roomId}/payments.list`,
      'GET',
      { query },
    ),

  createPayment: (
    roomId: number,
    payload: { user_id: number; amount: number; status: 'credit' | 'debit'; created_at?: string },
  ) => callApi<PaymentItem>(`/v1/rooms/${roomId}/payments.create`, 'POST', { payload }),

  getSplitsSummary: (roomId: number) =>
    callApi<SplitsSummary>(`/v1/rooms/${roomId}/splits.summary`, 'GET'),

  settleAll: (roomId: number) =>
    callApi<{ settled_count: number }>(`/v1/rooms/${roomId}/splits.settleAll`, 'POST'),

  getMemberDetail: (roomId: number, userId: number) =>
    callApi<MemberDetail>(`/v1/rooms/${roomId}/members/${userId}/detail`, 'GET'),
};
