import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useSheetQueueStore } from './useSheetQueueStore'

describe('useSheetQueueStore', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    useSheetQueueStore.setState({
      sheets: [],
      isLoading: false,
      isUploading: false,
      error: null,
      uploadSuccessMessage: null,
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('fetchSheets sets sheets on successful fetch', async () => {
    const mockSheets = [
      {
        id: 'sheet-1',
        characterName: 'Valeros',
        playerName: 'Alice',
        notes: 'Lvl 4',
        fileName: 'valeros.pdf',
        fileSize: 1024,
        status: 'new' as const,
        createdAt: 1000,
        updatedAt: 1000,
      },
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, sheets: mockSheets }),
    })

    await useSheetQueueStore.getState().fetchSheets()

    expect(useSheetQueueStore.getState().sheets).toEqual(mockSheets)
    expect(useSheetQueueStore.getState().newCount()).toBe(1)
  })

  it('uploadSheet rejects non-pdf files before fetch', async () => {
    const fakeFile = new File(['dummy content'], 'document.txt', { type: 'text/plain' })
    const res = await useSheetQueueStore.getState().uploadSheet({
      characterName: 'Seoni',
      playerName: 'Bob',
      file: fakeFile,
      password: 'pass',
    })

    expect(res.ok).toBe(false)
    expect(res.error).toContain('PDF')
    expect(useSheetQueueStore.getState().error).toContain('PDF')
  })

  it('uploadSheet posts valid PDF and updates state', async () => {
    const fakeFile = new File(['%PDF-1.4 dummy'], 'seoni.pdf', { type: 'application/pdf' })
    const newSheet = {
      id: 'sheet-new-1',
      characterName: 'Seoni',
      playerName: 'Bob',
      notes: '',
      fileName: 'seoni.pdf',
      fileSize: fakeFile.size,
      status: 'new' as const,
      createdAt: 2000,
      updatedAt: 2000,
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true, sheet: newSheet }),
      json: async () => ({ ok: true, sheet: newSheet }),
    })

    const res = await useSheetQueueStore.getState().uploadSheet({
      characterName: 'Seoni',
      playerName: 'Bob',
      file: fakeFile,
      password: 'reliquary_secret',
    })

    expect(res.ok).toBe(true)
    expect(useSheetQueueStore.getState().sheets).toContainEqual(newSheet)
    expect(useSheetQueueStore.getState().uploadSuccessMessage).toContain('successo')
  })

  it('updateSheetStatus optimistically updates sheet status', async () => {
    useSheetQueueStore.setState({
      sheets: [
        {
          id: 'sheet-1',
          characterName: 'Ezren',
          playerName: 'Charlie',
          notes: '',
          fileName: 'ezren.pdf',
          fileSize: 500,
          status: 'new',
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    const success = await useSheetQueueStore.getState().updateSheetStatus('sheet-1', 'processing')
    expect(success).toBe(true)
    expect(useSheetQueueStore.getState().sheets[0].status).toBe('processing')
    expect(useSheetQueueStore.getState().newCount()).toBe(0)
  })

  it('deleteSheet removes sheet from store', async () => {
    useSheetQueueStore.setState({
      sheets: [
        {
          id: 'sheet-del',
          characterName: 'Kyra',
          playerName: 'Dana',
          notes: '',
          fileName: 'kyra.pdf',
          fileSize: 500,
          status: 'archived',
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })

    const success = await useSheetQueueStore.getState().deleteSheet('sheet-del')
    expect(success).toBe(true)
    expect(useSheetQueueStore.getState().sheets).toHaveLength(0)
  })
})
