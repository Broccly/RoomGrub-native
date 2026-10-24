import { createMMKV } from 'react-native-mmkv';

// Synchronous so AppNavigator can pick the launch screen without another await.
const storage = createMMKV({ id: 'app-prefs' });
const LAST_ROOM_KEY = 'last_room_id';

export function getLastRoomId(): number | null {
  return storage.getNumber(LAST_ROOM_KEY) ?? null;
}

export function setLastRoomId(roomId: number | null): void {
  if (roomId == null) storage.remove(LAST_ROOM_KEY);
  else storage.set(LAST_ROOM_KEY, roomId);
}
