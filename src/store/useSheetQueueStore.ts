import { create } from 'zustand'

export type SheetStatus = 'new' | 'processing' | 'archived'

export interface UploadedSheet {
  id: string
  characterName: string
  playerName: string
  notes: string
  fileName: string
  fileSize: number
  status: SheetStatus
  createdAt: number
  updatedAt: number
}

export interface UploadSheetParams {
  characterName: string
  playerName: string
  notes?: string
  file: File
  password: string
}

interface SheetQueueStore {
  sheets: UploadedSheet[]
  isLoading: boolean
  isUploading: boolean
  error: string | null
  uploadSuccessMessage: string | null

  fetchSheets: () => Promise<void>
  uploadSheet: (params: UploadSheetParams) => Promise<{ ok: boolean; error?: string }>
  updateSheetStatus: (id: string, status: SheetStatus) => Promise<boolean>
  deleteSheet: (id: string) => Promise<boolean>
  downloadSheet: (id: string, fileName: string) => void
  clearMessages: () => void
  newCount: () => number
}

async function fileToBase64(file: File): Promise<string> {
  if (typeof file.arrayBuffer === 'function') {
    const arrayBuffer = await file.arrayBuffer()
    if (typeof Buffer !== 'undefined') {
      return `data:application/pdf;base64,${Buffer.from(arrayBuffer).toString('base64')}`
    }
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return `data:application/pdf;base64,${btoa(binary)}`
  }

  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      return reject(new Error('FileReader non supportato'))
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

export const useSheetQueueStore = create<SheetQueueStore>()((set, get) => ({
  sheets: [],
  isLoading: false,
  isUploading: false,
  error: null,
  uploadSuccessMessage: null,

  fetchSheets: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/sheets', {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Errore durante il recupero delle schede (${res.status}): ${text.slice(0, 80)}`)
      }
      const data = (await res.json()) as { ok: boolean; sheets: UploadedSheet[] }
      set({ sheets: data.sheets || [], isLoading: false })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Impossibile caricare la lista schede',
      })
    }
  },

  uploadSheet: async ({ characterName, playerName, notes, file, password }) => {
    set({ isUploading: true, error: null, uploadSuccessMessage: null })

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      const errMsg = 'Il file selezionato deve essere in formato PDF'
      set({ isUploading: false, error: errMsg })
      return { ok: false, error: errMsg }
    }

    if (file.size > 3.2 * 1024 * 1024) {
      const errMsg = 'Il file supera la dimensione massima consentita di 3.2 MB (limite payload Vercel)'
      set({ isUploading: false, error: errMsg })
      return { ok: false, error: errMsg }
    }

    try {
      const pdfBase64 = await fileToBase64(file)
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: characterName.trim(),
          playerName: playerName.trim(),
          notes: notes?.trim() || '',
          fileName: file.name,
          fileSize: file.size,
          pdfBase64,
          password,
        }),
      })

      let data: { ok?: boolean; error?: string; sheet?: UploadedSheet } = {}
      if (typeof res.text === 'function') {
        const resText = await res.text()
        try {
          data = resText ? (JSON.parse(resText) as { ok?: boolean; error?: string; sheet?: UploadedSheet }) : {}
        } catch {
          const errorMsg =
            res.status === 413
              ? 'Il file è troppo grande per il server (limite 3.2 MB)'
              : `Errore del server (${res.status}): ${resText.slice(0, 100) || 'Risposta non valida'}`
          set({ isUploading: false, error: errorMsg })
          return { ok: false, error: errorMsg }
        }
      } else {
        data = (await res.json()) as { ok?: boolean; error?: string; sheet?: UploadedSheet }
      }

      if (!res.ok || !data.ok) {
        const errorMsg = data.error || `Errore caricamento (${res.status})`
        set({ isUploading: false, error: errorMsg })
        return { ok: false, error: errorMsg }
      }

      if (data.sheet) {
        const newSheet = data.sheet
        set((state) => ({
          sheets: [newSheet, ...state.sheets.filter((s) => s.id !== newSheet.id)],
          isUploading: false,
          uploadSuccessMessage: `Scheda "${characterName}" caricata con successo! Notifica Telegram inviata al Master.`,
        }))
      } else {
        set({
          isUploading: false,
          uploadSuccessMessage: `Scheda "${characterName}" caricata con successo!`,
        })
        get().fetchSheets()
      }

      return { ok: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto durante l\'upload'
      set({ isUploading: false, error: errorMsg })
      return { ok: false, error: errorMsg }
    }
  },

  updateSheetStatus: async (id, status) => {
    // Optimistic update
    const previous = get().sheets
    set({
      sheets: previous.map((s) => (s.id === id ? { ...s, status, updatedAt: Date.now() } : s)),
    })

    try {
      const res = await fetch('/api/sheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        throw new Error('Errore aggiornamento stato')
      }
      return true
    } catch {
      // Revert on failure
      set({ sheets: previous })
      return false
    }
  },

  deleteSheet: async (id) => {
    const previous = get().sheets
    set({
      sheets: previous.filter((s) => s.id !== id),
    })

    try {
      const res = await fetch(`/api/sheets?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Errore eliminazione scheda')
      }
      return true
    } catch {
      set({ sheets: previous })
      return false
    }
  },

  downloadSheet: (id, fileName) => {
    const downloadUrl = `/api/sheets?id=${encodeURIComponent(id)}&download=1`
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  },

  clearMessages: () => {
    set({ error: null, uploadSuccessMessage: null })
  },

  newCount: () => {
    return get().sheets.filter((s) => s.status === 'new').length
  },
}))
