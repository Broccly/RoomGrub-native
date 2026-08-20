import { QueryClient } from '@tanstack/react-query';

type ExpenseQuery = Record<string, string | number | boolean | undefined>;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
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
  expenseDetail: (roomId: number, expenseId: number) => ['room', roomId, 'expense', expenseId] as const,
  splits: (roomId: number) => ['room', roomId, 'splits'] as const,
  inviteByToken: (token: string) => ['invite', token] as const,
};
