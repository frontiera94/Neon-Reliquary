import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Token } from '../types/map'
import { useMapStore } from '../store/useMapStore'
import { useGmCredentialsStore } from '../store/useGmCredentialsStore'
import { fetchMap, uploadBackground } from '../lib/map-api'
import { MapCanvas } from '../components/map/MapCanvas'
import { InitiativePanel } from '../components/map/InitiativePanel'
import { TokenHpPopup } from '../components/map/TokenHpPopup'

export function MapEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const secret = useGmCredentialsStore((s) => s.getCredential(id ?? ''))
  const map = useMapStore((s) => s.map)
  const isPushing = useMapStore((s) => s.isPushing)

  const [isLoading, setIsLoading] = useState(true)
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [showAddToken, setShowAddToken] = useState(false)
  const [newToken, setNewToken] = useState<{
    name: string
    color: string
    initial: string
    hp: number
    kind: Token['kind']
  }>({ name: '', color: '#00daf3', initial: '', hp: 20, kind: 'enemy' })
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id || !secret) {
      navigate('/map/' + id, { replace: true })
      return
    }
    fetchMap(id)
      .then((data) => useMapStore.getState().setMap(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [id, secret, navigate])

  async function handleBackgroundChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id || !secret) return
    setIsUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const bg = await uploadBackground(id, secret, dataUrl)
      useMapStore.getState().setBackground(bg)
      useMapStore.getState().scheduleSync(id, secret)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  function handleAddToken() {
    if (!id || !secret) return
    const token: Token = {
      id: crypto.randomUUID(),
      name: newToken.name || 'Token',
      color: newToken.color,
      initial: newToken.initial || newToken.name.charAt(0).toUpperCase(),
      hp: { current: newToken.hp, max: newToken.hp },
      pos: { x: 0, y: 0 },
      kind: newToken.kind,
      initiative: null,
    }
    useMapStore.getState().addToken(token)
    useMapStore.getState().scheduleSync(id, secret)
    setShowAddToken(false)
    setNewToken({ name: '', color: '#00daf3', initial: '', hp: 20, kind: 'enemy' })
  }

  const selectedToken = map?.tokens.find((t) => t.id === selectedTokenId) ?? null

  return (
    <div className="flex flex-col h-screen bg-surface">
      <div className="bg-surface-container-highest h-12 flex items-center px-4 gap-3 z-10 shrink-0">
        <button
          onClick={() => navigate('/gm')}
          className="font-label text-tertiary text-sm hover:text-primary transition-colors"
          style={{ borderRadius: 0 }}
        >
          ← GM
        </button>
        <span className="text-tertiary opacity-50">/</span>
        <span className="font-label text-xs text-white opacity-50">{id}</span>
        <div className="flex-1" />
        {isPushing && (
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBackgroundChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="font-label text-xs text-tertiary hover:text-primary transition-colors px-2 py-1"
          style={{ borderRadius: 0 }}
        >
          {isUploading ? 'Caricamento...' : '\uD83D\uDDBC Sfondo'}
        </button>
        <button
          onClick={() => setShowAddToken(true)}
          className="font-label text-xs text-primary bg-primary/20 px-3 py-1 hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all"
          style={{ borderRadius: 0 }}
        >
          + Aggiungi token
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="font-label text-tertiary text-sm">Caricamento...</span>
          </div>
        ) : map ? (
          <>
            <div className="flex-1">
              <MapCanvas
                map={map}
                isReadOnly={false}
                mapId={id}
                secret={secret}
                selectedTokenId={selectedTokenId}
                onTokenSelect={setSelectedTokenId}
              />
            </div>
            <div className="w-52 shrink-0 overflow-y-auto border-l border-surface-container-high">
              <InitiativePanel
                map={map}
                isReadOnly={false}
                mapId={id}
                secret={secret}
                selectedTokenId={selectedTokenId}
                onTokenSelect={setSelectedTokenId}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="font-label text-tertiary text-sm">Mappa non trovata.</span>
          </div>
        )}
      </div>

      {selectedToken && (
        <TokenHpPopup
          token={selectedToken}
          onClose={() => setSelectedTokenId(null)}
          style={{ position: 'fixed', bottom: 80, left: 16 }}
        />
      )}

      {showAddToken && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowAddToken(false)}
        >
          <div
            className="bg-surface-container p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-label text-secondary text-sm mb-4">Aggiungi token</div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="font-label text-tertiary text-xs block mb-1">Nome</label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken((p) => ({ ...p, name: e.target.value }))}
                  className="bg-surface-container-high font-label text-white p-2 w-full outline-none"
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div>
                <label className="font-label text-tertiary text-xs block mb-1">Iniziale (1-2 char)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={newToken.initial}
                  onChange={(e) => setNewToken((p) => ({ ...p, initial: e.target.value }))}
                  className="bg-surface-container-high font-label text-white p-2 w-full outline-none"
                  style={{ borderRadius: 0 }}
                />
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="font-label text-tertiary text-xs block mb-1">Colore</label>
                  <input
                    type="color"
                    value={newToken.color}
                    onChange={(e) => setNewToken((p) => ({ ...p, color: e.target.value }))}
                    className="w-12 h-8 cursor-pointer"
                    style={{ borderRadius: 0 }}
                  />
                </div>
                <div className="flex-1">
                  <label className="font-label text-tertiary text-xs block mb-1">HP Max</label>
                  <input
                    type="number"
                    min={1}
                    value={newToken.hp}
                    onChange={(e) => setNewToken((p) => ({ ...p, hp: Number(e.target.value) }))}
                    className="bg-surface-container-high font-label text-white p-2 w-full outline-none"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              </div>

              <div>
                <label className="font-label text-tertiary text-xs block mb-1">Tipo</label>
                <select
                  value={newToken.kind}
                  onChange={(e) => setNewToken((p) => ({ ...p, kind: e.target.value as Token['kind'] }))}
                  className="bg-surface-container-high font-label text-white p-2 w-full outline-none"
                  style={{ borderRadius: 0 }}
                >
                  <option value="pc">PC</option>
                  <option value="enemy">Nemico</option>
                  <option value="npc">NPC</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleAddToken}
                className="flex-1 py-2 bg-primary text-black font-label text-sm hover:shadow-[0_0_20px_rgba(0,218,243,0.3)] transition-all"
                style={{ borderRadius: 0 }}
              >
                Aggiungi
              </button>
              <button
                onClick={() => setShowAddToken(false)}
                className="flex-1 py-2 bg-surface-container-high text-tertiary font-label text-sm hover:text-white transition-colors"
                style={{ borderRadius: 0 }}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
