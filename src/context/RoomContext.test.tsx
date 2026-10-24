import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { RoomProvider, useRoomContext } from './RoomContext';
import { getLastRoomId, setLastRoomId } from '../utils/lastRoom';

describe('RoomContext', () => {
  beforeEach(() => setLastRoomId(null));

  it('remembers the opened room for the next launch and forgets it on exit', () => {
    const { result } = renderHook(() => useRoomContext(), {
      wrapper: ({ children }) => <RoomProvider>{children}</RoomProvider>,
    });

    act(() => result.current.setRoomId(10));
    expect(result.current.roomId).toBe(10);
    expect(getLastRoomId()).toBe(10);

    act(() => result.current.setRoomId(null));
    expect(getLastRoomId()).toBeNull();
  });
});
