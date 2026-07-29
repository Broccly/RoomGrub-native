import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useRoomContext } from '../context/RoomContext';
import { Role } from '../types/api';

export default function useUserRole() {
  const { user } = useAuth();
  const { roomId } = useRoomContext();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!user || !roomId) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .listMembers(roomId)
      .then((members) => {
        if (!active) return;
        setRole(members.find((m) => m.email === user.email)?.role ?? null);
      })
      .catch(() => {
        if (!active) return;
        setRole(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, roomId]);

  return { role, loading };
}
