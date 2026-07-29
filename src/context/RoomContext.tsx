import React, { createContext, useContext, useMemo, useState } from 'react';

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
  const [roomId, setRoomId] = useState<number | null>(initialRoomId ?? null);
  const value = useMemo(() => ({ roomId, setRoomId }), [roomId]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoomContext() {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  return ctx;
}
