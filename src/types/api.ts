export type UserSummary = {
  user_id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Member' | null;
  profile: string | null;
};

export type BootstrapResponse = {
  user: {
    id: number;
    uid: string;
    email: string;
    name: string;
    profile: string | null;
  };
  membership: {
    room_id: number | null;
    role: 'Admin' | 'Member' | null;
  };
  needs_room_creation: boolean;
};

export type RoomSummary = {
  room_id: number;
  role: 'Admin' | 'Member' | null;
  members_count: number;
  total_expenses: number;
  total_contributions: number;
  pending_amount: number;
  pending_settlements_count: number;
};

export type ExpenseItem = {
  expense_id: number;
  room_id: number;
  user_id: number | null;
  user: UserSummary | null;
  material: string;
  money: number;
  created_at: string;
  settled: boolean;
  settled_at: string | null;
};

export type PaymentItem = {
  payment_id: number;
  room_id: number;
  user_id: number | null;
  user: UserSummary | null;
  amount: number;
  status: 'credit' | 'debit';
  created_at: string;
};

export type SplitMemberBalance = {
  user_id: number;
  member: UserSummary;
  spent: number;
  pending_amount: number;
  should_pay: number;
  balance: number;
  status: 'credit' | 'debit' | 'even';
};

export type SplitsSummary = {
  total_pending_expenses: number;
  equal_share: number;
  member_balances: SplitMemberBalance[];
  pending_settlements_count: number;
};

export type MemberDetail = {
  member: UserSummary;
  purchases: Array<{
    expense_id: number;
    material: string;
    money: number;
    created_at: string;
    settled: boolean;
  }>;
  payments: Array<{
    payment_id: number;
    amount: number;
    status: 'credit' | 'debit';
    created_at: string;
  }>;
  summary: {
    total_purchases: number;
    total_contributed: number;
    pending_amount: number;
  };
};
