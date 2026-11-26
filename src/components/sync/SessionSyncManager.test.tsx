// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { SessionSyncManager } from './SessionSyncManager'
import { useSyncStore } from '../../store/useSyncStore'

const mockController = {
  pullRemoteSessions: vi.fn().mockResolvedValue(undefined),
  syncNow: vi.fn().mockResolvedValue(undefined),
  flushDirtySessions: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
}

vi.mock('../../lib/session-sync', () => ({
  createSessionSyncController: () => mockController,
}))

describe('SessionSyncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSyncStore.getState().resetSyncState()
  })

  it('does not start sync controller when disabled', () => {
    render(<SessionSyncManager enabled={false} />)
    expect(mockController.pullRemoteSessions).not.toHaveBeenCalled()
  })

  it('pulls on mount, syncs on online, flushes on pagehide/hidden, and stops on unmount', () => {
    const { unmount } = render(<SessionSyncManager enabled />)
    expect(mockController.pullRemoteSessions).toHaveBeenCalledTimes(1)

    fireEvent(window, new Event('online'))
    expect(mockController.syncNow).toHaveBeenCalledTimes(1)

    fireEvent(window, new Event('pagehide'))
    expect(mockController.flushDirtySessions).toHaveBeenCalledWith({ keepalive: true })

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    fireEvent(document, new Event('visibilitychange'))
    expect(mockController.flushDirtySessions).toHaveBeenCalledTimes(2)

    unmount()
    expect(mockController.stop).toHaveBeenCalledTimes(1)
  })
})
