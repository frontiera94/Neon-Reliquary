// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useInspectorStore } from './useInspectorStore'
import { useSyncStore } from './useSyncStore'
import { useLocaleStore } from './useLocaleStore'

describe('uncovered zustand stores', () => {
  beforeEach(() => {
    useInspectorStore.setState({ isOpen: false, currentItem: null })
    useSyncStore.getState().resetSyncState()
    useLocaleStore.setState({ locale: 'en' })
  })

  it('useInspectorStore opens and closes with item payload', () => {
    useInspectorStore.getState().openInspector({
      type: 'feat',
      id: 'f1',
      title: 'Dodge',
      description: '+1 dodge bonus to AC',
    })
    expect(useInspectorStore.getState().isOpen).toBe(true)
    expect(useInspectorStore.getState().currentItem?.title).toBe('Dodge')

    useInspectorStore.getState().closeInspector()
    expect(useInspectorStore.getState().isOpen).toBe(false)
    expect(useInspectorStore.getState().currentItem).toBeNull()
  })

  it('useSyncStore patches and resets sync state', () => {
    useSyncStore.getState().setSyncState({ status: 'syncing', pendingCount: 2 })
    expect(useSyncStore.getState().status).toBe('syncing')
    expect(useSyncStore.getState().pendingCount).toBe(2)

    useSyncStore.getState().setSyncState({ status: 'synced', lastSyncedAt: 12345, pendingCount: 0 })
    expect(useSyncStore.getState().lastSyncedAt).toBe(12345)

    useSyncStore.getState().resetSyncState()
    expect(useSyncStore.getState().status).toBe('idle')
    expect(useSyncStore.getState().lastSyncedAt).toBeNull()
  })

  it('useLocaleStore toggles and sets locale', () => {
    expect(useLocaleStore.getState().locale).toBe('en')
    useLocaleStore.getState().toggleLocale()
    expect(useLocaleStore.getState().locale).toBe('it')
    useLocaleStore.getState().setLocale('en')
    expect(useLocaleStore.getState().locale).toBe('en')
  })
})
