import { SplitMemberBalance, SplitSettlement, SplitsData, UnsettledExpense } from '../types/api';

export type MemberBalance = {
  member: SplitMemberBalance;
  balance: number;
  status: 'credit' | 'debit' | 'even';
};

export type SplitsFilterOptions = {
  dateFrom?: Date | null;
  dateTo?: Date | null;
  memberEmails?: string[];
};

export type ComputedSplits = {
  totalPendingExpenses: number;
  memberBalances: MemberBalance[];
  pendingSettlements: MemberBalance[];
  settlements: SplitSettlement[];
};

const BALANCE_EPSILON = 0.01;

function filterExpenses(
  expenses: UnsettledExpense[],
  { dateFrom, dateTo }: SplitsFilterOptions,
): UnsettledExpense[] {
  if (!dateFrom && !dateTo) return expenses;
  return expenses.filter((expense) => {
    const created = new Date(expense.created_at);
    if (dateFrom && created < dateFrom) return false;
    if (dateTo && created > dateTo) return false;
    return true;
  });
}

// Member balances and the who-pays-whom breakdown are precomputed by the backend
// (net pending_amount + greedy debt simplification) — we only filter/shape them
// for display here, never recompute them client-side.
export function computeSplitsFiltered(
  data: SplitsData,
  options: SplitsFilterOptions = {},
): ComputedSplits {
  const memberEmailSet = options.memberEmails?.length ? new Set(options.memberEmails) : null;

  const members = memberEmailSet
    ? data.members.filter((m) => memberEmailSet.has(m.user_email))
    : data.members;

  const filteredExpenses = filterExpenses(data.unsettled_expenses, options);
  const totalPendingExpenses = filteredExpenses.reduce((sum, e) => sum + e.money, 0);

  const memberBalances: MemberBalance[] = members.map((member) => {
    const balance = member.pending_amount;
    return {
      member,
      balance,
      status: balance > BALANCE_EPSILON ? 'credit' : balance < -BALANCE_EPSILON ? 'debit' : 'even',
    };
  });

  const pendingSettlements = memberBalances.filter(
    (mb) => Math.abs(mb.balance) > BALANCE_EPSILON,
  );

  const settlements = memberEmailSet
    ? data.settlements.filter(
        (s) => memberEmailSet.has(s.from_user_email) && memberEmailSet.has(s.to_user_email),
      )
    : data.settlements;

  return { totalPendingExpenses, memberBalances, pendingSettlements, settlements };
}
