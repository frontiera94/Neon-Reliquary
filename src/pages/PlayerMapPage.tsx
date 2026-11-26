import { useEffect, useMemo, useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useBattlemapStore, getCachedMapImage } from '../store/useBattlemapStore'
import { useSyncRoster } from '../lib/useSyncRoster'
import { BattlemapViewport } from '../components/map/BattlemapViewport'
import { FacingCompassDial } from '../components/map/FacingCompassDial'
import { useTranslation } from '../i18n'
import type { FacingDirectionDeg } from '../types/map'

const POLL_INTERVAL_MS = 1800

export function PlayerMapPage() {
  useSyncRoster()
  const { t } = useTranslation()

  const activeChar = useCharacterStore((s) => s.activeCharacter())
  const characters = useCharacterStore((s) => s.characters)
  const sessions = useSessionStore((s) => s.sessions)

  const {
    activeMap,
    imageCache,
    lastFeedback,
    clearFeedback,
    pollActiveMap,
    playerMoveToken,
    playerRotateToken,
    sendPing,
  } = useBattlemapStore()

  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)
  const [pingMode, setPingMode] = useState(false)

  useEffect(() => {
    void pollActiveMap('player', true)
    const interval = setInterval(() => {
      void pollActiveMap('player', false)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [pollActiveMap])

  const alliedTokens = useMemo(
    () => (activeMap?.tokens ?? []).filter((tok) => tok.type === 'pc' || tok.type === 'companion'),
    [activeMap?.tokens]
  )

  const effectiveSelectedId = useMemo(() => {
    if (selectedTokenId && alliedTokens.some((tok) => tok.id === selectedTokenId)) {
      return selectedTokenId
    }
    if (activeChar) {
      const own = alliedTokens.find(
        (tok) => tok.type === 'pc' && tok.characterId === activeChar.id
      )
      if (own) return own.id
    }
    return alliedTokens[0]?.id ?? null
  }, [selectedTokenId, alliedTokens, activeChar])

  const selectedToken = useMemo(
    () => alliedTokens.find((tok) => tok.id === effectiveSelectedId) ?? null,
    [alliedTokens, effectiveSelectedId]
  )

  const imageUrl = getCachedMapImage(imageCache, activeMap)

  if (!activeMap) {
    return (
      <div className="max-w-5xl mx-auto p-6 md:p-10">
        <div
          data-testid="player-no-active-map"
          className="rounded-2xl bg-surface-container/80 backdrop-blur-md border border-white/10 p-10 text-center flex flex-col items-center gap-3 shadow-xl"
        >
          <span className="material-symbols-outlined text-4xl text-primary neon-glow-cyan-soft">
            map
          </span>
          <h1 className="font-headline text-lg font-bold uppercase tracking-widest text-on-surface">
            {t('battlemap.noActiveMapTitle')}
          </h1>
          <p className="text-sm text-tertiary max-w-md">{t('battlemap.noActiveMapHint')}</p>
        </div>
      </div>
    )
  }

  const handleMoveToken = (tokenId: string, col: number, row: number) => {
    clearFeedback()
    void playerMoveToken(tokenId, col, row)
  }

  const handleRotate = (deg: FacingDirectionDeg) => {
    if (!selectedToken) return
    clearFeedback()
    void playerRotateToken(selectedToken.id, deg)
  }

  const handlePing = (col: number, row: number) => {
    const sender = activeChar?.name ?? selectedToken?.name ?? 'Party'
    void sendPing(activeMap.id, col, row, sender, 'player', 'cyan')
    setPingMode(false)
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container/80 backdrop-blur-md border border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">map</span>
          <div>
            <h1 className="font-headline text-sm md:text-base font-bold uppercase tracking-wider text-on-surface">
              {activeMap.name}
            </h1>
            <p className="text-[11px] text-tertiary">
              {pingMode ? t('battlemap.pingHint') : t('battlemap.moveHint')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="toggle-ping-mode"
            onClick={() => setPingMode((v) => !v)}
            className={`px-3 py-1.5 rounded-xl font-label text-xs uppercase tracking-wider font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              pingMode
                ? 'bg-secondary/20 text-secondary border-secondary/50 shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                : 'bg-surface-container-high/60 text-tertiary border-white/10 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">radar</span>
            <span>{t('battlemap.pingMode')}</span>
          </button>
        </div>
      </div>

      {/* Blocked Movement Feedback Banner */}
      {lastFeedback && (
        <div
          role="alert"
          data-testid="map-feedback-alert"
          className="flex items-center justify-between gap-3 rounded-xl bg-error/15 border border-error/40 px-4 py-2.5 text-xs text-error font-medium"
        >
          <span>
            {lastFeedback === 'forbidden_token_type'
              ? t('battlemap.forbiddenEnemyMove')
              : t('battlemap.blockedMoveWarning')}
          </span>
          <button
            type="button"
            onClick={clearFeedback}
            className="text-error/80 hover:text-error font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Viewport + Right Tactical Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
        <BattlemapViewport
          map={activeMap}
          imageUrl={imageUrl}
          role="player"
          selectedTokenId={effectiveSelectedId}
          onSelectToken={(id) => {
            clearFeedback()
            setSelectedTokenId(id)
          }}
          onMoveToken={handleMoveToken}
          onCellPing={handlePing}
          pingMode={pingMode}
        />

        {/* Allied Party Controls & 8-Direction Vision Cone Dial */}
        <aside className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-4 space-y-4">
          <div>
            <h2 className="font-label text-[10px] uppercase tracking-widest text-tertiary mb-2">
              {t('battlemap.alliedTokens')}
            </h2>
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
              {alliedTokens.map((tok) => {
                const isSelected = tok.id === effectiveSelectedId
                const char = tok.characterId
                  ? characters.find((c) => c.id === tok.characterId)
                  : undefined
                const sess = tok.characterId ? sessions[tok.characterId] : undefined
                const maxHp = char?.maxHp ?? tok.maxHp ?? 10
                const curHp =
                  tok.type === 'companion' && tok.companionId
                    ? (sess?.companionHp?.[tok.companionId] ?? maxHp)
                    : (sess?.currentHp ?? maxHp)

                return (
                  <button
                    key={tok.id}
                    type="button"
                    data-testid={`party-pill-${tok.id}`}
                    onClick={() => {
                      clearFeedback()
                      setSelectedTokenId(tok.id)
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/15 text-primary border-primary/45 font-bold shadow-[0_0_12px_rgba(0,240,255,0.18)]'
                        : 'bg-surface-container-high/50 text-on-surface border-white/5 hover:border-white/20'
                    }`}
                  >
                    <span className="truncate">{tok.name}</span>
                    <span className="font-mono text-[10px] text-tertiary flex-shrink-0">
                      {curHp}/{maxHp} HP
                    </span>
                  </button>
                )
              })}
              {alliedTokens.length === 0 && (
                <p className="text-xs text-tertiary/70 italic">{t('common.none')}</p>
              )}
            </div>
          </div>

          {selectedToken && (
            <div className="pt-3 border-t border-white/10">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-primary truncate">{selectedToken.name}</span>
                <span className="font-mono text-[10px] text-tertiary">
                  ({selectedToken.col}, {selectedToken.row})
                </span>
              </div>
              <FacingCompassDial
                facingDeg={selectedToken.facingDeg}
                onChangeFacing={handleRotate}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
