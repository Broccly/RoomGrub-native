import { computeSplitsFiltered } from './splitCalculations';
import { mockSplitsData } from '../test-utils/fixtures';
import { SplitsData } from '../types/api';

describe('computeSplitsFiltered', () => {
  it('classifies balances as credit, debit, or even', () => {
    const result = computeSplitsFiltered(mockSplitsData);

    expect(result.memberBalances).toEqual([
      { member: mockSplitsData.members[0], balance: 50, status: 'credit' },
      { member: mockSplitsData.members[1], balance: -50, status: 'debit' },
    ]);
  });

  it('treats balances within epsilon as even', () => {
    const data: SplitsData = {
      ...mockSplitsData,
      members: [{ user_email: 'alice@example.com', name: 'Alice', profile: null, pending_amount: 0.001 }],
    };

    const result = computeSplitsFiltered(data);

    expect(result.memberBalances[0].status).toBe('even');
    expect(result.pendingSettlements).toHaveLength(0);
  });

  it('sums total pending expenses from unsettled expenses only', () => {
    const result = computeSplitsFiltered(mockSplitsData);
    expect(result.totalPendingExpenses).toBe(50);
  });

  it('filters expenses by date range', () => {
    const data: SplitsData = {
      ...mockSplitsData,
      unsettled_expenses: [
        { id: 1, user: 'a', material: 'Old', money: 100, created_at: '2026-01-01T00:00:00Z' },
        { id: 2, user: 'a', material: 'New', money: 20, created_at: '2026-07-15T00:00:00Z' },
      ],
    };

    const result = computeSplitsFiltered(data, {
      dateFrom: new Date('2026-07-01'),
      dateTo: new Date('2026-07-31'),
    });

    expect(result.totalPendingExpenses).toBe(20);
  });

  it('filters members and settlements by memberEmails', () => {
    const result = computeSplitsFiltered(mockSplitsData, { memberEmails: ['alice@example.com'] });

    expect(result.memberBalances).toHaveLength(1);
    expect(result.memberBalances[0].member.user_email).toBe('alice@example.com');
    expect(result.settlements).toHaveLength(0);
  });

  it('returns zero balances and no expenses for an empty room', () => {
    const empty: SplitsData = { members: [], unsettled_expenses: [], settlements: [] };
    const result = computeSplitsFiltered(empty);

    expect(result.totalPendingExpenses).toBe(0);
    expect(result.memberBalances).toEqual([]);
    expect(result.pendingSettlements).toEqual([]);
  });
});
