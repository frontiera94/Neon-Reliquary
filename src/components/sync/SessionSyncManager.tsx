import { useEffect } from 'react'
import { createSessionSyncController } from '../../lib/session-sync'
import { useSyncStore } from '../../store/useSyncStore'

const MIN_REFETCH_INTERVAL_MS = 10_000

interface SessionSyncManagerProps {
  enabled?: boolean
}

export function SessionSyncManager({
  enabled = import.meta.env.MODE !== 'test',
}: SessionSyncManagerProps) {
  useEffect(() => {
    if (!enabled) return

    const controller = createSessionSyncController()
    let lastPullTs = Date.now()

    void controller.pullRemoteSessions()

    const maybePullOnResume = () => {
      const status = useSyncStore.getState().status
      if (status === 'unconfigured') return
      const now = Date.now()
      if (now - lastPullTs < MIN_REFETCH_INTERVAL_MS) return
      lastPullTs = now
      void controller.pullRemoteSessions()
    }

    const handleOnline = () => {
      lastPullTs = Date.now()
      void controller.syncNow()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void controller.flushDirtySessions({ keepalive: true })
      } else if (document.visibilityState === 'visible') {
        maybePullOnResume()
      }
    }

    const handlePageHide = () => {
      void controller.flushDirtySessions({ keepalive: true })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('focus', maybePullOnResume)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('focus', maybePullOnResume)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      controller.stop()
    }
  }, [enabled])

  return null
}
