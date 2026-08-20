import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import useUserRole from './useUserRole';
import { useAuth } from './useAuth';
import { api } from '../services/api';
import { RoomProvider } from '../context/RoomContext';
import { mockMembers } from '../test-utils/fixtures';
import { createTestQueryClient } from '../test-utils/renderWithProviders';

jest.mock('./useAuth');
jest.mock('../services/api');

const mockedUseAuth = useAuth as jest.Mock;
const mockedApi = api as jest.Mocked<typeof api>;

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <RoomProvider initialRoomId={10}>{children}</RoomProvider>
    </QueryClientProvider>
  );
}

describe('useUserRole', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves the role by matching the current user email against room members', async () => {
    mockedUseAuth.mockReturnValue({ user: { email: 'bob@example.com' } });
    mockedApi.listMembers.mockResolvedValue(mockMembers);

    const { result } = renderHook(() => useUserRole(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('Member');
  });

  it('returns null role when there is no authenticated user', async () => {
    mockedUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUserRole(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(mockedApi.listMembers).not.toHaveBeenCalled();
  });

  it('returns null role when the member list request fails', async () => {
    mockedUseAuth.mockReturnValue({ user: { email: 'bob@example.com' } });
    mockedApi.listMembers.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useUserRole(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });
});
