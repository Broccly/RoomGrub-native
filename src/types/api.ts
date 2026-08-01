export type Role = 'Admin' | 'Member';

export type RoomListItem = {
  id: number;
  members: number;
  admin: string;
};

export type ExpenseSummaryItem = {
  id: number;
  material: string;
  money: number;
  user: string;
  created_at: string;
};

export type RoomSummary = RoomListItem & {
  total_spent: number;
  pending_amount: number;
  recent_expenses: ExpenseSummaryItem[];
};

export type MemberStat = {
  user_id: number;
  email: string;
  name: string | null;
  profile: string | null;
  role: Role;
  total_spent: number;
  pending_amount: number;
};

export type DashboardResponse = {
  room: RoomListItem;
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
  user_email: string;
  name: string | null;
  profile: string | null;
  pending_amount: number;
};

export type UnsettledExpense = {
  id: number;
  user: string;
  material: string;
  money: number;
  created_at: string;
};

export type SplitSettlement = {
  from_user_email: string;
  from_name: string | null;
  to_user_email: string;
  to_name: string | null;
  amount: number;
};

export type SplitsData = {
  members: SplitMemberBalance[];
  unsettled_expenses: UnsettledExpense[];
  settlements: SplitSettlement[];
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
