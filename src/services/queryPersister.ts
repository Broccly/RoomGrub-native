import { createMMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const storage = createMMKV({ id: 'react-query-cache' });

const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

export const queryPersister = createSyncStoragePersister({
  storage: mmkvStorageAdapter,
  key: 'ROOMGRUB_REACT_QUERY_CACHE',
});
