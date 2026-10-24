import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { setLastRoomId } from '../utils/lastRoom';

type RoomContextValue = {
  roomId: number | null;
  setRoomId: (roomId: number | null) => void;
};

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export function RoomProvider({
  initialRoomId,
  children,
}: {
  initialRoomId?: number | null;
  children: React.ReactNode;
}) {
  const [roomId, setRoomIdState] = useState<number | null>(initialRoomId ?? null);
  // Remembered so the next launch reopens this room; null (exit/delete) forgets it.
  const setRoomId = useCallback((id: number | null) => {
    setLastRoomId(id);
    setRoomIdState(id);
  }, []);
  const value = useMemo(() => ({ roomId, setRoomId }), [roomId, setRoomId]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoomContext() {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return ctx;
}
