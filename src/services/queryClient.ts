import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './httpClient';

type ExpenseQuery = Record<string, string | number | boolean | undefined>;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      // Retry once, but not a 4xx: asking again for a deleted room just answers 404 again.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 1,
      refetchOnReconnect: true,
    },
  },
});

export const queryKeys = {
  rooms: ['rooms'] as const,
  room: (roomId: number) => ['room', roomId] as const,
  roomSummary: (roomId: number) => ['room', roomId, 'summary'] as const,
  roomDashboard: (roomId: number) => ['room', roomId, 'dashboard'] as const,
  members: (roomId: number) => ['room', roomId, 'members'] as const,
  memberDetail: (roomId: number, memberId: number) => ['room', roomId, 'member', memberId] as const,
  expenses: (roomId: number, filters?: ExpenseQuery) => ['room', roomId, 'expenses', filters ?? {}] as const,
  // Under the expenses key, so every expense invalidation refreshes the suggestions too.
  frequentItems: (roomId: number) => ['room', roomId, 'expenses', 'frequent'] as const,
  expenseDetail: (roomId: number, expenseId: number) => ['room', roomId, 'expense', expenseId] as const,
  splits: (roomId: number) => ['room', roomId, 'splits'] as const,
  // Home's totals-only fetch: under the splits key, so invalidating splits refreshes it too,
  // but cached apart from the Splits screen's full response.
  splitsSummary: (roomId: number) => ['room', roomId, 'splits', 'summary'] as const,
  inviteByToken: (token: string) => ['invite', token] as const,
};
