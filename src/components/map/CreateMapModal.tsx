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
        className="bg-surface-container p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-headline text-secondary text-base mb-4">Nuova mappa</div>

        {error && (
          <div className="bg-error/10 border-l-2 border-error px-3 py-2 mb-4 text-error text-xs font-label">
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
              className="bg-surface-container-high font-label text-white text-sm p-2 w-full outline-none"
              style={{ borderRadius: 0 }}
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

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleSubmit}
            disabled={isCreating || !name.trim()}
            className="flex-1 py-2 bg-primary text-black font-label text-sm hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: 0 }}
          >
            {isCreating ? 'Creazione in corso...' : 'Crea mappa'}
          </button>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 py-2 bg-surface-container-high text-tertiary font-label text-sm hover:text-white transition-colors"
            style={{ borderRadius: 0 }}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}
