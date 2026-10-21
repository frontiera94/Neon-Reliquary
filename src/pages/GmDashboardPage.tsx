import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGmCredentialsStore } from '../store/useGmCredentialsStore'
import { createMap } from '../lib/map-api'
import { CreateMapModal } from '../components/map/CreateMapModal'

export function GmDashboardPage() {
  const navigate = useNavigate()
  const { activeMapId, saveCredential, clearCredential, setActiveMapId } = useGmCredentialsStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerUrl = activeMapId ? window.location.origin + '/map/' + activeMapId : ''

  async function handleCreate(name: string, gridSize: number) {
    setError(null)
    const { id, secret } = await createMap({ name, gridSize })
    saveCredential(id, secret)
    setActiveMapId(id)
    navigate('/gm/map/' + id)
  }

  async function handleNewMap(name: string, gridSize: number) {
    if (!activeMapId) return
    setError(null)
    const prevMapId = activeMapId
    const { id, secret } = await createMap({ name, gridSize })
    clearCredential(prevMapId)
    saveCredential(id, secret)
    setActiveMapId(id)
    navigate('/gm/map/' + id)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(playerUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
      <div className="bg-surface-container/90 backdrop-blur-md p-8 w-full max-w-md rounded-2xl border border-white/10 shadow-[0_0_35px_rgba(0,240,255,0.1)]">
        <div className="font-headline text-3xl font-bold text-primary">Neon Reliquary</div>
        <div className="font-label text-tertiary text-sm uppercase tracking-wider mt-1">Modalità GM</div>
        <div className="bg-surface-container-high h-px w-full my-6" />

        {error && (
          <div className="bg-error/10 border-l-2 border-error px-3 py-2 mb-4 font-label text-xs text-error rounded-r-lg">
            {error}
          </div>
        )}

        {activeMapId ? (
          <>
            <div className="bg-surface-container-high/80 rounded-xl p-4 mb-4 border border-white/5">
              <div className="font-label text-tertiary text-xs">Mappa attiva:</div>
              <div className="font-label text-white text-sm mt-1">{activeMapId}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="font-label text-primary text-xs truncate flex-1">{playerUrl}</div>
                <button
                  onClick={handleCopyLink}
                  className="font-label text-xs text-primary hover:text-white bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  {copied ? 'Copiato!' : 'Copia link'}
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/gm/map/' + activeMapId)}
              className="w-full py-3 bg-primary/20 text-primary font-label font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] hover:bg-primary/30 transition-all cursor-pointer"
            >
              Apri editor mappa
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-2.5 mt-2 font-label text-sm text-tertiary hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              Nuova mappa
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3.5 bg-gradient-to-r from-primary to-cyan-400 text-black font-label font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,218,243,0.4)] transition-all cursor-pointer"
          >
            Crea nuova mappa
          </button>
        )}
      </div>

      <button
        onClick={() => navigate('/characters')}
        className="font-label text-tertiary text-xs mt-6 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
      >
        ← Seleziona personaggio
      </button>

      {showCreateModal && (
        <CreateMapModal
          onClose={() => setShowCreateModal(false)}
          onCreate={activeMapId ? handleNewMap : handleCreate}
        />
      )}
    </div>
  )
}
