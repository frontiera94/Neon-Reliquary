import { useState } from 'react'

interface Props {
  onClose: () => void
  onCreate: (name: string, gridSize: number) => Promise<void>
}

export function CreateMapModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [gridSize, setGridSize] = useState(50)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!name.trim()) return
    setIsCreating(true)
    setError(null)
    try {
      await onCreate(name.trim(), gridSize)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto')
    } finally {
      setIsCreating(false)
    }
  }

  const gridOptions: { label: string; value: number }[] = [
    { label: 'Piccola · 40px', value: 40 },
    { label: 'Standard · 50px', value: 50 },
    { label: 'Grande · 60px', value: 60 },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface-container/95 backdrop-blur-md p-6 w-96 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(0,240,255,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-headline text-secondary text-lg font-bold mb-4 uppercase tracking-tight">Nuova mappa</div>

        {error && (
          <div className="bg-error/10 border-l-2 border-error px-3 py-2 mb-4 text-error text-xs font-label rounded-r-lg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="font-label text-tertiary text-xs block mb-1">Nome mappa</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Dungeon del nord"
              className="bg-surface-container-high/80 font-label text-white text-sm p-2.5 w-full outline-none rounded-xl border border-white/10 focus:border-primary/50 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <div className="font-label text-tertiary text-xs mb-2">Dimensione griglia</div>
            <div className="flex flex-col gap-2">
              {gridOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="gridSize"
                    value={opt.value}
                    checked={gridSize === opt.value}
                    onChange={() => setGridSize(opt.value)}
                    className="accent-primary"
                  />
                  <span className="font-label text-sm text-white">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isCreating || !name.trim()}
            className="flex-1 py-2.5 bg-gradient-to-r from-primary to-cyan-400 text-black font-label text-sm font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,218,243,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isCreating ? 'Creazione in corso...' : 'Crea mappa'}
          </button>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 py-2.5 bg-surface-container-high text-tertiary font-label text-sm font-semibold rounded-xl hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
