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
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
      <div className="bg-surface-container p-8 w-full max-w-md">
        <div className="font-headline text-3xl text-primary">Neon Reliquary</div>
        <div className="font-label text-tertiary text-sm uppercase tracking-wider mt-1">Modalità GM</div>
        <div className="bg-surface-container-high h-px w-full my-6" />

        {error && (
          <div className="bg-error/10 border-l-2 border-error px-3 py-2 mb-4 font-label text-xs text-error">
            {error}
          </div>
        )}

        {activeMapId ? (
          <>
            <div className="bg-surface-container-high p-3 mb-4">
              <div className="font-label text-tertiary text-xs">Mappa attiva:</div>
              <div className="font-label text-white text-sm mt-1">{activeMapId}</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="font-label text-primary text-xs truncate flex-1">{playerUrl}</div>
                <button
                  onClick={handleCopyLink}
                  className="font-label text-xs text-tertiary hover:text-primary transition-colors shrink-0"
                  style={{ borderRadius: 0 }}
                >
                  {copied ? 'Copiato!' : 'Copia link'}
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/gm/map/' + activeMapId)}
              className="w-full py-3 bg-primary/20 text-primary font-label hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all"
              style={{ borderRadius: 0 }}
            >
              Apri editor mappa
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full py-2 mt-2 font-label text-sm text-tertiary hover:text-primary transition-colors"
              style={{ borderRadius: 0 }}
            >
              Nuova mappa
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full py-3 bg-primary text-black font-label hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all"
            style={{ borderRadius: 0 }}
          >
            Crea nuova mappa
          </button>
        )}
      </div>

      <button
        onClick={() => navigate('/characters')}
        className="font-label text-tertiary text-xs mt-6 hover:text-primary transition-colors"
        style={{ borderRadius: 0 }}
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
