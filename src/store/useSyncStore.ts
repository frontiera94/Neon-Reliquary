import { create } from 'zustand'

export type CloudSyncStatus =
  | 'idle'
  | 'loading'
  | 'synced'
  | 'syncing'
  | 'offline'
  | 'unconfigured'

interface SyncStore {
  status: CloudSyncStatus
  lastSyncedAt: number | null
  pendingCount: number
  errorMessage: string | null
  setSyncState: (patch: Partial<Omit<SyncStore, 'setSyncState' | 'resetSyncState'>>) => void
  resetSyncState: () => void
}

export const useSyncStore = create<SyncStore>()((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  pendingCount: 0,
  errorMessage: null,
  setSyncState: (patch) => set((state) => ({ ...state, ...patch })),
  resetSyncState: () =>
    set({
      status: 'idle',
      lastSyncedAt: null,
      pendingCount: 0,
      errorMessage: null,
    }),
}))
