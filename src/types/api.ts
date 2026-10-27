export type Role = 'Admin' | 'Member';

export type RoomBase = {
  id: number;
  members: number;
  admin: string;
};

// Enough to draw one avatar: the photo, or initials from `label` when there is none.
export type MemberPreview = {
  profile: string | null;
  label: string;
};

export type RoomListItem = RoomBase & {
  // The first few members by join date.
  member_preview: MemberPreview[];
};

export type ExpenseSummaryItem = {
  id: number;
  material: string;
  money: number;
  user: string;
  created_at: string;
};

export type RoomSummary = RoomBase & {
  total_spent: number;
  pending_amount: number;
  recent_expenses: ExpenseSummaryItem[];
};

export type MemberStat = {
  user_id: number;
  name: string | null;
  profile: string | null;
  pending_amount: number;
};

export type DashboardResponse = {
  room: RoomBase;
  members: MemberStat[];
};

export type UserSummary = {
  id: number;
  user_id: number;
  email: string;
  name: string | null;
  profile: string | null;
  role: Role;
  joined_at: string;
};

export type MemberExpenseSummary = {
  id: number;
  material: string;
  money: number;
  created_at: string;
  settled: boolean | null;
};

export type MemberDetail = UserSummary & {
  total_spent: number;
  pending_amount: number;
  expenses: MemberExpenseSummary[];
};

export type ExpenseItem = {
  id: number;
  room: number;
  user: string;
  material: string;
  money: number;
  created_at: string;
  settled: boolean | null;
};

export type PaginatedExpenses = {
  items: ExpenseItem[];
  next_cursor: number | null;
};

export type SplitMemberBalance = {
  user_id: number;
  user_email: string;
  name: string | null;
  profile: string | null;
  // null for someone who has left the room but still has a balance.
  role: Role | null;
  // Net balance: positive = the room owes them, negative = they owe.
  pending_amount: number;
  // Paid by them, and their share, across unsettled expenses.
  unsettled_spent: number;
  unsettled_share: number;
  // Paid by them in this room, settled or not.
  total_spent: number;
};

export type UnsettledExpense = {
  id: number;
  user: string;
  material: string;
  money: number;
  created_at: string;
};

export type SplitSettlement = {
  from_user_id: number;
  from_user_email: string;
  from_name: string | null;
  to_user_id: number;
  to_user_email: string;
  to_name: string | null;
  amount: number;
};

export type SplitsData = {
  members: SplitMemberBalance[];
  // Empty when fetched with includeExpenses: false.
  unsettled_expenses: UnsettledExpense[];
  settlements: SplitSettlement[];
  // Sum of unsettled expenses, and how many there are.
  total_pending: number;
  unsettled_count: number;
  // Sum of every expense in the room, settled or not.
  total_spent: number;
  last_settled_at: string | null;
};

export type FrequentItems = {
  items: string[];
};

export type ExpenseParticipant = {
  user_id: number;
  name: string | null;
  profile: string | null;
  amount_paid: number;
  amount_owed: number;
  net: number;
};

export type ExpenseDetail = {
  id: number;
  room: number;
  material: string;
  money: number;
  created_at: string;
  settled: boolean | null;
  settled_at: string | null;
  payer_user_id: number | null;
  payer_name: string | null;
  participants: ExpenseParticipant[];
};

export type InviteResponse = {
  token: string;
  room_id: number;
  invited_by_email: string;
  days_left: number;
};

export type InviteAcceptResponse = {
  room_id: number;
  message: string;
};
