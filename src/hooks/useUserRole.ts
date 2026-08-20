import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useRoomContext } from '../context/RoomContext';
import { queryKeys } from '../services/queryClient';

export default function useUserRole() {
  const { user } = useAuth();
  const { roomId } = useRoomContext();

  const { data: role, isPending } = useQuery({
    queryKey: roomId ? queryKeys.members(roomId) : ['members', 'disabled'],
    queryFn: () => api.listMembers(roomId!),
    enabled: !!user && !!roomId,
    select: (members) => members.find((m) => m.email === user?.email)?.role ?? null,
  });

  return { role: role ?? null, loading: !!user && !!roomId && isPending };
}
