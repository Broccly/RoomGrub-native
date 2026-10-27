import {
  DashboardResponse,
  ExpenseDetail,
  ExpenseItem,
  MemberDetail,
  PaginatedExpenses,
  RoomBase,
  RoomListItem,
  RoomSummary,
  SplitsData,
  UserSummary,
} from '../types/api';
import { StoredUser } from '../utils/tokenStorage';

export const mockUser: StoredUser = {
  id: 1,
  email: 'alice@example.com',
  name: 'Alice',
  profile: null,
};

const mockRoomBase: RoomBase = {
  id: 10,
  members: 2,
  admin: 'alice@example.com',
};

export const mockRoom: RoomListItem = {
  ...mockRoomBase,
  member_preview: [
    { profile: null, label: 'Alice' },
    { profile: null, label: 'Bob' },
  ],
};

export const mockRoomSummary: RoomSummary = {
  ...mockRoomBase,
  total_spent: 500,
  pending_amount: 100,
  recent_expenses: [
    { id: 1, material: 'Milk', money: 50, user: 'alice@example.com', created_at: '2026-07-01T00:00:00Z' },
  ],
};

export const mockDashboard: DashboardResponse = {
  room: mockRoomBase,
  members: [
    { user_id: 1, name: 'Alice', profile: null, pending_amount: 50 },
    { user_id: 2, name: 'Bob', profile: null, pending_amount: -50 },
  ],
};

export const mockMembers: UserSummary[] = [
  { id: 1, user_id: 1, email: 'alice@example.com', name: 'Alice', profile: null, role: 'Admin', joined_at: '2026-01-01T00:00:00Z' },
  { id: 2, user_id: 2, email: 'bob@example.com', name: 'Bob', profile: null, role: 'Member', joined_at: '2026-01-02T00:00:00Z' },
];

export const mockMemberDetail: MemberDetail = {
  ...mockMembers[0],
  total_spent: 300,
  pending_amount: 50,
  expenses: [
    { id: 1, material: 'Milk', money: 50, created_at: '2026-07-01T00:00:00Z', settled: false },
  ],
};

export const mockExpense: ExpenseItem = {
  id: 1,
  room: 10,
  user: 'alice@example.com',
  material: 'Milk',
  money: 50,
  created_at: '2026-07-01T00:00:00Z',
  settled: false,
};

export const mockPaginatedExpenses: PaginatedExpenses = {
  items: [mockExpense],
  next_cursor: null,
};

export const mockExpenseDetail: ExpenseDetail = {
  id: 1,
  room: 10,
  material: 'Milk',
  money: 50,
  created_at: '2026-07-01T00:00:00Z',
  settled: false,
  settled_at: null,
  payer_user_id: 1,
  payer_name: 'Alice',
  participants: [
    { user_id: 1, name: 'Alice', profile: null, amount_paid: 50, amount_owed: 25, net: 25 },
    { user_id: 2, name: 'Bob', profile: null, amount_paid: 0, amount_owed: 25, net: -25 },
  ],
};

export const mockSplitsData: SplitsData = {
  members: [
    {
      user_id: 1,
      user_email: 'alice@example.com',
      name: 'Alice',
      profile: null,
      role: 'Admin',
      pending_amount: 50,
      unsettled_spent: 50,
      unsettled_share: 0,
      total_spent: 300,
    },
    {
      user_id: 2,
      user_email: 'bob@example.com',
      name: 'Bob',
      profile: null,
      role: 'Member',
      pending_amount: -50,
      unsettled_spent: 0,
      unsettled_share: 50,
      total_spent: 200,
    },
  ],
  unsettled_expenses: [
    { id: 1, user: 'alice@example.com', material: 'Milk', money: 50, created_at: '2026-07-01T00:00:00Z' },
  ],
  settlements: [
    {
      from_user_id: 2,
      from_user_email: 'bob@example.com',
      from_name: 'Bob',
      to_user_id: 1,
      to_user_email: 'alice@example.com',
      to_name: 'Alice',
      amount: 50,
    },
  ],
  total_pending: 50,
  unsettled_count: 1,
  total_spent: 500,
  last_settled_at: null,
};
