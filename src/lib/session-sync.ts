import type { SessionState } from '../types/session'
import { useSessionStore, normalizePersistedSession } from '../store/useSessionStore'
import { useSyncStore } from '../store/useSyncStore'

export const DIRTY_STORAGE_KEY = 'neon-sessions-dirty'
const DEFAULT_DEBOUNCE_MS = 400

interface RemoteSessionEntry {
  state: SessionState
  updatedAt: number
}

interface GetSessionsResponse {
  configured?: boolean
  sessions?: Record<string, RemoteSessionEntry>
  error?: string
}

function getEndpoint(): string {
  return import.meta.env.VITE_SESSIONS_ENDPOINT ?? '/api/sessions'
}

export function readDirtyMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DIRTY_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const clean: Record<string, number> = {}
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'number' && Number.isFinite(val)) {
        clean[key] = val
      }
    }
    return clean
  } catch {
    return {}
  }
}

function writeDirtyMap(map: Record<string, number>): void {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(DIRTY_STORAGE_KEY)
    } else {
      localStorage.setItem(DIRTY_STORAGE_KEY, JSON.stringify(map))
    }
  } catch {
    // Ignore storage quota errors
  }
}

export interface SessionSyncController {
  pullRemoteSessions: () => Promise<void>
  flushDirtySessions: (opts?: { keepalive?: boolean }) => Promise<void>
  syncNow: () => Promise<void>
  stop: () => void
}

let activeController: SessionSyncController | null = null

export async function syncSessionsNow(): Promise<void> {
  if (activeController) {
    await activeController.syncNow()
  }
}

export function createSessionSyncController(options?: {
  debounceMs?: number
  fetchImpl?: typeof fetch
}): SessionSyncController {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS
  const fetchFn: typeof fetch = options?.fetchImpl ?? ((...args) => fetch(...args))

  const dirtyMap: Record<string, number> = readDirtyMap()
  let isApplyingRemote = false
  let hasCompletedInitialPull = false
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let isStopped = false
  let inFlightFlush: Promise<void> | null = null

  const clearDebounce = () => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }

  const scheduleFlush = () => {
    if (isStopped) return
    if (useSyncStore.getState().status === 'unconfigured') return
    clearDebounce()
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void flushDirtySessions()
    }, debounceMs)
  }

  async function flushDirtySessions(opts?: { keepalive?: boolean }): Promise<void> {
    if (isStopped) return
    clearDebounce()

    const currentSessions = useSessionStore.getState().sessions
    const snapshotTs: Record<string, number> = {}
    const payload: Record<string, SessionState> = {}

    for (const [charId, ts] of Object.entries(dirtyMap)) {
      const sess = currentSessions[charId]
      if (!sess) {
        delete dirtyMap[charId]
        continue
      }
      snapshotTs[charId] = ts
      payload[charId] = sess
    }
    writeDirtyMap(dirtyMap)

    const keys = Object.keys(payload)
    if (keys.length === 0) {
      if (useSyncStore.getState().status === 'syncing') {
        useSyncStore.getState().setSyncState({
          status: 'synced',
          pendingCount: 0,
          errorMessage: null,
        })
      }
      return
    }

    useSyncStore.getState().setSyncState({
      status: 'syncing',
      pendingCount: keys.length,
      errorMessage: null,
    })

    const run = async () => {
      try {
        const res = await fetchFn(getEndpoint(), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessions: payload }),
          keepalive: Boolean(opts?.keepalive),
        })

        if (res.status === 503) {
          useSyncStore.getState().setSyncState({
            status: 'unconfigured',
            pendingCount: Object.keys(dirtyMap).length,
            errorMessage: null,
          })
          return
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        // Clear only entries that were not mutated again while PUT was in flight
        for (const charId of keys) {
          if (dirtyMap[charId] === snapshotTs[charId]) {
            delete dirtyMap[charId]
          }
        }
        writeDirtyMap(dirtyMap)

        const remaining = Object.keys(dirtyMap).length
        if (remaining === 0) {
          useSyncStore.getState().setSyncState({
            status: 'synced',
            lastSyncedAt: Date.now(),
            pendingCount: 0,
            errorMessage: null,
          })
        } else {
          useSyncStore.getState().setSyncState({
            status: 'syncing',
            pendingCount: remaining,
          })
          scheduleFlush()
        }
      } catch (err) {
        useSyncStore.getState().setSyncState({
          status: 'offline',
          pendingCount: Object.keys(dirtyMap).length,
          errorMessage: err instanceof Error ? err.message : String(err),
        })
      }
    }

    inFlightFlush = run()
    await inFlightFlush
    inFlightFlush = null
  }

  async function pullRemoteSessions(): Promise<void> {
    if (isStopped) return

    const prevStatus = useSyncStore.getState().status
    if (prevStatus === 'idle') {
      useSyncStore.getState().setSyncState({
        status: 'loading',
        pendingCount: Object.keys(dirtyMap).length,
      })
    }

    try {
      const res = await fetchFn(getEndpoint(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      if (res.status === 503) {
        hasCompletedInitialPull = true
        useSyncStore.getState().setSyncState({
          status: 'unconfigured',
          pendingCount: Object.keys(dirtyMap).length,
          errorMessage: null,
        })
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = (await res.json()) as GetSessionsResponse
      if (data.configured === false) {
        hasCompletedInitialPull = true
        useSyncStore.getState().setSyncState({
          status: 'unconfigured',
          pendingCount: Object.keys(dirtyMap).length,
          errorMessage: null,
        })
        return
      }

      const remoteSessions = data.sessions ?? {}
      const localSessions = useSessionStore.getState().sessions
      const toHydrate: Record<string, SessionState> = {}

      for (const [charId, remoteEntry] of Object.entries(remoteSessions)) {
        if (!remoteEntry?.state) continue
        const localDirtyTs = dirtyMap[charId]

        if (localDirtyTs !== undefined && localDirtyTs >= remoteEntry.updatedAt) {
          // Local unsynced offline edit is newer than server row — preserve local and push it
          continue
        }

        if (localDirtyTs !== undefined && remoteEntry.updatedAt > localDirtyTs) {
          delete dirtyMap[charId]
        }

        const normalizedRemote = normalizePersistedSession({
          ...remoteEntry.state,
          characterId: remoteEntry.state.characterId || charId,
        })
        const existingLocal = localSessions[charId]
        if (!existingLocal || JSON.stringify(existingLocal) !== JSON.stringify(normalizedRemote)) {
          toHydrate[charId] = normalizedRemote
        }
      }

      if (Object.keys(toHydrate).length > 0) {
        isApplyingRemote = true
        try {
          useSessionStore.getState().hydrateSessions(toHydrate)
        } finally {
          isApplyingRemote = false
        }
      }

      // Backfill any character sessions that already existed locally on this device
      // but have never been stored in Neon Postgres yet.
      const mergedSessions = useSessionStore.getState().sessions
      for (const charId of Object.keys(mergedSessions)) {
        if (!(charId in remoteSessions) && dirtyMap[charId] === undefined) {
          dirtyMap[charId] = Date.now()
        }
      }

      hasCompletedInitialPull = true
      writeDirtyMap(dirtyMap)

      if (Object.keys(dirtyMap).length > 0) {
        await flushDirtySessions()
      } else {
        useSyncStore.getState().setSyncState({
          status: 'synced',
          lastSyncedAt: Date.now(),
          pendingCount: 0,
          errorMessage: null,
        })
      }
    } catch (err) {
      hasCompletedInitialPull = true
      useSyncStore.getState().setSyncState({
        status: 'offline',
        pendingCount: Object.keys(dirtyMap).length,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const unsubscribe = useSessionStore.subscribe((state, prevState) => {
    if (isStopped || isApplyingRemote) return

    let changed = false
    const now = Date.now()

    for (const [charId, nextSess] of Object.entries(state.sessions)) {
      const prevSess = prevState.sessions[charId]
      if (prevSess === nextSess) continue

      // Avoid marking an automatic pre-pull `initSession` default as dirty so it
      // cannot overwrite an existing saved session arriving from Neon DB.
      if (prevSess === undefined && !hasCompletedInitialPull) {
        continue
      }

      dirtyMap[charId] = now
      changed = true
    }

    if (!changed) return

    writeDirtyMap(dirtyMap)
    const pendingCount = Object.keys(dirtyMap).length
    const currentStatus = useSyncStore.getState().status

    if (currentStatus === 'unconfigured') {
      useSyncStore.getState().setSyncState({ pendingCount })
      return
    }

    useSyncStore.getState().setSyncState({
      status: 'syncing',
      pendingCount,
    })
    scheduleFlush()
  })

  async function syncNow(): Promise<void> {
    if (isStopped) return
    if (inFlightFlush) {
      await inFlightFlush
    }
    if (Object.keys(dirtyMap).length > 0) {
      await flushDirtySessions()
    }
    await pullRemoteSessions()
  }

  function stop(): void {
    isStopped = true
    clearDebounce()
    unsubscribe()
    if (activeController === controller) {
      activeController = null
    }
  }

  const controller: SessionSyncController = {
    pullRemoteSessions,
    flushDirtySessions,
    syncNow,
    stop,
  }

  activeController = controller
  return controller
}
