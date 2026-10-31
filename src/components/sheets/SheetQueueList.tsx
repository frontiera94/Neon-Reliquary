import { useEffect, useState } from 'react'
import { useSheetQueueStore, type SheetStatus, type UploadedSheet } from '../../store/useSheetQueueStore'

export function SheetQueueList() {
  const {
    sheets,
    isLoading,
    fetchSheets,
    updateSheetStatus,
    deleteSheet,
    downloadSheet,
  } = useSheetQueueStore()

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'processing' | 'archived'>('all')

  useEffect(() => {
    void fetchSheets()
  }, [fetchSheets])

  const filteredSheets = sheets.filter((s) => {
    if (filter === 'all') return true
    return s.status === filter
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (ms: number): string => {
    try {
      const d = new Date(ms)
      return d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    await deleteSheet(id)
    setDeletingId(null)
  }

  const renderStatusBadge = (sheet: UploadedSheet) => {
    const statusConfig: Record<SheetStatus, { label: string; bg: string; text: string; border: string }> = {
      new: {
        label: 'Nuova',
        bg: 'bg-primary/15',
        text: 'text-primary',
        border: 'border-primary/40',
      },
      processing: {
        label: 'In lavorazione',
        bg: 'bg-secondary/15',
        text: 'text-secondary',
        border: 'border-secondary/40',
      },
      archived: {
        label: 'Archiviata',
        bg: 'bg-white/5',
        text: 'text-tertiary',
        border: 'border-white/10',
      },
    }

    const current = statusConfig[sheet.status] || statusConfig.new

    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`font-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold ${current.bg} ${current.text} ${current.border}`}
        >
          {current.label}
        </span>
        <select
          value={sheet.status}
          onChange={(e) => void updateSheetStatus(sheet.id, e.target.value as SheetStatus)}
          aria-label={`Cambia stato scheda ${sheet.characterName}`}
          className="bg-surface-container-high/80 text-[10px] font-label text-tertiary rounded-lg border border-white/10 py-0.5 px-1 focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="new">Nuova</option>
          <option value="processing">In lavorazione</option>
          <option value="archived">Archiviata</option>
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header controls: Refresh and Filter */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['all', 'new', 'processing', 'archived'] as const).map((key) => {
            const count =
              key === 'all'
                ? sheets.length
                : sheets.filter((s) => s.status === key).length
            const labelMap: Record<string, string> = {
              all: 'Tutte',
              new: 'Nuove',
              processing: 'In corso',
              archived: 'Archivio',
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-2 py-1 font-label text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  filter === key
                    ? 'bg-primary/20 text-primary border border-primary/40 font-bold'
                    : 'text-tertiary hover:text-white bg-surface-container-high/40 border border-white/5'
                }`}
              >
                {labelMap[key]} ({count})
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => void fetchSheets()}
          disabled={isLoading}
          title="Aggiorna lista"
          aria-label="Aggiorna lista"
          className="text-tertiary hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5 flex-shrink-0 cursor-pointer"
        >
          <span
            className={`material-symbols-outlined text-base ${
              isLoading ? 'animate-spin text-primary' : ''
            }`}
          >
            refresh
          </span>
        </button>
      </div>

      {/* List */}
      {isLoading && sheets.length === 0 ? (
        <div className="py-8 text-center">
          <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="font-label text-xs text-tertiary/70">Caricamento archivio schede...</p>
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="py-8 text-center px-4 rounded-xl border border-white/5 bg-surface-container-high/20">
          <span className="material-symbols-outlined text-3xl text-tertiary/40 mb-1">
            inventory_2
          </span>
          <p className="font-label text-xs text-tertiary/70">
            {filter === 'all'
              ? 'Nessuna scheda presente in coda'
              : `Nessuna scheda con stato "${filter}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`p-3.5 rounded-xl border transition-all ${
                sheet.status === 'new'
                  ? 'bg-surface-container-high/80 border-primary/30 shadow-[0_0_15px_rgba(0,240,255,0.06)]'
                  : 'bg-surface-container-high/40 border-white/5'
              }`}
            >
              {/* Header row: Character & Status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="font-headline text-sm font-bold text-white tracking-wide">
                    {sheet.characterName}
                  </h4>
                  <div className="flex items-center gap-1.5 font-label text-[10px] text-tertiary mt-0.5">
                    <span>di {sheet.playerName}</span>
                    <span>•</span>
                    <span>{formatDate(sheet.createdAt)}</span>
                  </div>
                </div>
                {renderStatusBadge(sheet)}
              </div>

              {/* Notes */}
              {sheet.notes && (
                <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-surface/60 border border-white/5 font-label text-[11px] text-tertiary leading-relaxed italic">
                  "{sheet.notes}"
                </div>
              )}

              {/* File details & Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 min-w-0 font-label text-[10px] text-tertiary/70">
                  <span className="material-symbols-outlined text-xs text-primary flex-shrink-0">
                    description
                  </span>
                  <span className="truncate max-w-[140px]" title={sheet.fileName}>
                    {sheet.fileName}
                  </span>
                  <span>({formatFileSize(sheet.fileSize)})</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadSheet(sheet.id, sheet.fileName)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 font-label text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer"
                    title="Scarica file PDF originale"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={deletingId === sheet.id}
                    onClick={() => void handleDelete(sheet.id)}
                    className="p-1 rounded-lg text-tertiary hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                    title="Elimina scheda dalla coda"
                    aria-label={`Elimina scheda ${sheet.characterName}`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {deletingId === sheet.id ? 'sync' : 'delete'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
