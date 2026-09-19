import { request } from './httpClient';
import {
  DashboardResponse,
  ExpenseDetail,
  ExpenseItem,
  InviteAcceptResponse,
  InviteResponse,
  MemberDetail,
  PaginatedExpenses,
  Role,
  RoomListItem,
  RoomSummary,
  SplitsData,
  UserSummary,
} from '../types/api';

type Query = Record<string, string | number | boolean | undefined>;

export const api = {
  listRooms: () => request<RoomListItem[]>('/rooms', 'GET'),

  createRoom: () => request<RoomListItem>('/rooms', 'POST'),

  getRoomSummary: (roomId: number) => request<RoomSummary>(`/rooms/${roomId}`, 'GET'),

  getRoomDashboard: (roomId: number) =>
    request<DashboardResponse>(`/rooms/${roomId}/dashboard`, 'GET'),

  deleteRoom: (roomId: number) => request<void>(`/rooms/${roomId}`, 'DELETE'),

  listMembers: (roomId: number) => request<UserSummary[]>(`/rooms/${roomId}/members`, 'GET'),

  getMemberDetail: (roomId: number, memberId: number) =>
    request<MemberDetail>(`/rooms/${roomId}/members/${memberId}`, 'GET'),

  updateMemberRole: (roomId: number, memberId: number, role: Role) =>
    request<void>(`/rooms/${roomId}/members/${memberId}/role`, 'PATCH', { payload: { role } }),

  exitRoom: (roomId: number) => request<void>(`/rooms/${roomId}/members/me`, 'DELETE'),

  removeMember: (roomId: number, memberId: number) =>
    request<void>(`/rooms/${roomId}/members/${memberId}`, 'DELETE'),

  settleMember: (roomId: number, memberId: number) =>
    request<void>(`/rooms/${roomId}/members/${memberId}/settle`, 'POST'),

  recordContribution: (roomId: number, memberId: number, amount: number) =>
    request<void>(`/rooms/${roomId}/members/${memberId}/contribute`, 'POST', {
      payload: { amount },
    }),

  listExpenses: (roomId: number, query?: Query) =>
    request<PaginatedExpenses>(`/rooms/${roomId}/expenses`, 'GET', { query }),

  createExpense: (
    roomId: number,
    payload: {
      material: string;
      money: number;
      created_at?: string;
      participant_user_ids?: number[];
    },
  ) => request<ExpenseItem>(`/rooms/${roomId}/expenses`, 'POST', { payload }),

  createExpenseForMember: (
    roomId: number,
    payload: {
      material: string;
      money: number;
      user_id: number;
      created_at?: string;
      participant_user_ids?: number[];
    },
  ) => request<ExpenseItem>(`/rooms/${roomId}/expenses/for-member`, 'POST', { payload }),

  updateExpense: (
    roomId: number,
    expenseId: number,
    payload: { material?: string; money?: number; created_at?: string },
  ) => request<ExpenseItem>(`/rooms/${roomId}/expenses/${expenseId}`, 'PATCH', { payload }),

  deleteExpense: (roomId: number, expenseId: number) =>
    request<void>(`/rooms/${roomId}/expenses/${expenseId}`, 'DELETE'),

  getExpenseDetail: (roomId: number, expenseId: number) =>
    request<ExpenseDetail>(`/rooms/${roomId}/expenses/${expenseId}`, 'GET'),

  getSplits: (roomId: number) => request<SplitsData>(`/rooms/${roomId}/splits`, 'GET'),

  settleOne: (roomId: number, userEmail: string, pendingAmount: number) =>
    request<void>(`/rooms/${roomId}/splits/settle`, 'POST', {
      payload: { user_email: userEmail, pending_amount: pendingAmount },
    }),

  settleAll: (
    roomId: number,
    members: Array<{ user_email: string; pending_amount: number }>,
    filters?: { date_from?: string | null; date_to?: string | null; member_emails?: string[] | null },
  ) =>
    request<void>(`/rooms/${roomId}/splits/settle-all`, 'POST', {
      payload: {
        members,
        date_from: filters?.date_from ?? null,
        date_to: filters?.date_to ?? null,
        member_emails: filters?.member_emails ?? null,
      },
    }),

  createInvite: (roomId: number) =>
    request<InviteResponse>(`/rooms/${roomId}/invites`, 'POST'),

  validateInvite: (token: string) => request<InviteResponse>(`/invites/${token}`, 'GET'),

  acceptInvite: (token: string) =>
    request<InviteAcceptResponse>(`/invites/${token}/accept`, 'POST'),

  rejectInvite: (token: string) => request<void>(`/invites/${token}/reject`, 'POST'),

  registerPushToken: (token: string, platform = 'android') =>
    request<void>('/notifications/fcm-token', 'POST', { payload: { fcm_token: token, platform } }),

  unregisterPushToken: (token: string) =>
    request<void>('/notifications/fcm-token', 'DELETE', { payload: { fcm_token: token } }),
};
