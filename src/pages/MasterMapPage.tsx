import { useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { useCharacterStore } from '../store/useCharacterStore'
import { useBattlemapStore, getCachedMapImage } from '../store/useBattlemapStore'
import { useSyncRoster } from '../lib/useSyncRoster'
import { getCharacterLore } from '../lib/character-lore'
import { prepareMapImageFile } from '../lib/map-image-utils'
import { BattlemapViewport, type MasterMapTool } from '../components/map/BattlemapViewport'
import { FacingCompassDial } from '../components/map/FacingCompassDial'
import { LanguageFlagSwitcher } from '../components/layout/LanguageFlagButton'
import { useTranslation } from '../i18n'
import type {
  FacingDirectionDeg,
  GridConfig,
  MapToken,
  MapWallSegment,
  TokenAccentColor,
  TokenSizeCells,
} from '../types/map'

const MASTER_POLL_MS = 2200

const ENEMY_COLORS: readonly TokenAccentColor[] = [
  'crimson',
  'violet',
  'amber',
  'magenta',
  'emerald',
  'cyan',
]

export function MasterMapPage() {
  useSyncRoster()
  const { t } = useTranslation()
  const characters = useCharacterStore((s) => s.characters)

  const {
    masterMap,
    library,
    imageCache,
    error,
    fetchLibrary,
    loadMasterMap,
    pollActiveMap,
    createMap,
    setActiveMap,
    updateMasterMap,
    fogOverride,
    deleteMap,
    sendPing,
  } = useBattlemapStore()

  const [newMapName, setNewMapName] = useState('')
  const [masterTool, setMasterTool] = useState<MasterMapTool>('select')
  const [snapWallsToGrid, setSnapWallsToGrid] = useState(true)
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)

  // Enemy spawner form
  const [enemyName, setEnemyName] = useState('')
  const [enemySize, setEnemySize] = useState<TokenSizeCells>(1)
  const [enemyHp, setEnemyHp] = useState<number>(20)
  const [enemyColor, setEnemyColor] = useState<TokenAccentColor>('crimson')
  const [enemyHidden, setEnemyHidden] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void fetchLibrary()
  }, [fetchLibrary])

  useEffect(() => {
    if (!masterMap?.isActive) return
    const timer = setInterval(() => {
      void pollActiveMap('master', false)
    }, MASTER_POLL_MS)
    return () => clearInterval(timer)
  }, [masterMap?.isActive, pollActiveMap])

  const selectedToken = useMemo(
    () => masterMap?.tokens.find((tok) => tok.id === selectedTokenId) ?? null,
    [masterMap?.tokens, selectedTokenId]
  )

  const imageUrl = getCachedMapImage(imageCache, masterMap)

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newMapName.trim() || 'Dungeon Livello 1'
    const created = await createMap({
      name: title,
      setActive: library.length === 0,
    })
    if (created) {
      setNewMapName('')
      setSelectedTokenId(null)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const prepared = await prepareMapImageFile(file)
    if (!masterMap) {
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'Mappa Caricata'
      await createMap({
        name: baseName,
        imageData: prepared.dataUrl,
        imageWidth: prepared.width,
        imageHeight: prepared.height,
        setActive: true,
      })
      return
    }

    await updateMasterMap(masterMap.id, {
      imageData: prepared.dataUrl,
      imageWidth: prepared.width,
      imageHeight: prepared.height,
    })
  }

  const handleDeployParty = async () => {
    if (!masterMap) return
    const existingPcIds = new Set(
      masterMap.tokens
        .filter((tok) => tok.type === 'pc' && tok.characterId)
        .map((tok) => tok.characterId!)
    )

    const additions: MapToken[] = []
    characters.forEach((char, idx) => {
      if (existingPcIds.has(char.id)) return
      const lore = getCharacterLore(char.id)
      const col = Math.min(masterMap.grid.cols - 1, 1 + (idx % 3))
      const row = Math.min(masterMap.grid.rows - 1, 1 + Math.floor(idx / 3))
      additions.push({
        id: `pc_${char.id}`,
        type: 'pc',
        characterId: char.id,
        name: char.name,
        label: char.name.slice(0, 2).toUpperCase(),
        color: lore.accentColor,
        col,
        row,
        size: 1,
        facingDeg: 0,
        speedFeet: char.speed,
      })
    })

    if (additions.length === 0) return
    await updateMasterMap(masterMap.id, {
      tokens: [...masterMap.tokens, ...additions],
    })
  }

  const handleDeployCompanion = async (charId: string, compId: string, compName: string, maxHp: number) => {
    if (!masterMap) return
    const tokenId = `comp_${charId}_${compId}`
    if (masterMap.tokens.some((tok) => tok.id === tokenId)) return
    const lore = getCharacterLore(charId)
    const ownerTok = masterMap.tokens.find((tok) => tok.characterId === charId)
    const col = Math.min(masterMap.grid.cols - 1, (ownerTok?.col ?? 1) + 1)
    const row = Math.min(masterMap.grid.rows - 1, ownerTok?.row ?? 1)

    const compToken: MapToken = {
      id: tokenId,
      type: 'companion',
      characterId: charId,
      companionId: compId,
      name: compName,
      label: compName.slice(0, 2).toUpperCase(),
      color: lore.accentColor,
      col,
      row,
      size: 1,
      facingDeg: ownerTok?.facingDeg ?? 0,
      speedFeet: 40,
      maxHp,
    }
    await updateMasterMap(masterMap.id, {
      tokens: [...masterMap.tokens, compToken],
    })
  }

  const handleAddEnemy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!masterMap) return
    const count = masterMap.tokens.filter((tok) => tok.type === 'enemy').length + 1
    const cleanName = enemyName.trim() || `Nemico ${count}`
    const maxCol = Math.max(0, masterMap.grid.cols - enemySize)
    const maxRow = Math.max(0, masterMap.grid.rows - enemySize)
    const spawnCol = Math.min(maxCol, Math.floor(masterMap.grid.cols / 2))
    const spawnRow = Math.min(maxRow, Math.floor(masterMap.grid.rows / 2))

    const nextEnemy: MapToken = {
      id: `enemy_${nanoid(8)}`,
      type: 'enemy',
      name: cleanName,
      label: cleanName.slice(0, 3).toUpperCase(),
      color: enemyColor,
      col: spawnCol,
      row: spawnRow,
      size: enemySize,
      facingDeg: 180,
      maxHp: Math.max(1, enemyHp),
      currentHp: Math.max(1, enemyHp),
      isHidden: enemyHidden,
    }

    await updateMasterMap(masterMap.id, {
      tokens: [...masterMap.tokens, nextEnemy],
    })
    setEnemyName('')
    setSelectedTokenId(nextEnemy.id)
  }

  const handleMasterMoveToken = (tokenId: string, col: number, row: number) => {
    if (!masterMap) return
    const target = masterMap.tokens.find((tok) => tok.id === tokenId)
    if (!target) return
    const clampedCol = Math.max(0, Math.min(masterMap.grid.cols - target.size, col))
    const clampedRow = Math.max(0, Math.min(masterMap.grid.rows - target.size, row))
    const nextTokens = masterMap.tokens.map((tok) =>
      tok.id === tokenId ? { ...tok, col: clampedCol, row: clampedRow } : tok
    )
    void updateMasterMap(masterMap.id, { tokens: nextTokens })
  }

  const handleMasterRotateToken = (tokenId: string, facingDeg: FacingDirectionDeg) => {
    if (!masterMap) return
    const nextTokens = masterMap.tokens.map((tok) =>
      tok.id === tokenId ? { ...tok, facingDeg } : tok
    )
    void updateMasterMap(masterMap.id, { tokens: nextTokens })
  }

  const handleRemoveToken = (tokenId: string) => {
    if (!masterMap) return
    if (selectedTokenId === tokenId) setSelectedTokenId(null)
    void updateMasterMap(masterMap.id, {
      tokens: masterMap.tokens.filter((tok) => tok.id !== tokenId),
    })
  }

  const handleAdjustEnemyHp = (tokenId: string, delta: number) => {
    if (!masterMap) return
    const nextTokens = masterMap.tokens.map((tok) => {
      if (tok.id !== tokenId || tok.type !== 'enemy') return tok
      const maxHp = tok.maxHp ?? 15
      const curHp = tok.currentHp ?? maxHp
      return {
        ...tok,
        currentHp: Math.max(0, Math.min(maxHp, curHp + delta)),
      }
    })
    void updateMasterMap(masterMap.id, { tokens: nextTokens })
  }

  const handleToggleEnemyHidden = (tokenId: string) => {
    if (!masterMap) return
    const nextTokens = masterMap.tokens.map((tok) =>
      tok.id === tokenId && tok.type === 'enemy'
        ? { ...tok, isHidden: !tok.isHidden }
        : tok
    )
    void updateMasterMap(masterMap.id, { tokens: nextTokens })
  }

  const handleAddWall = (segment: Omit<MapWallSegment, 'id'>) => {
    if (!masterMap) return
    const created: MapWallSegment = {
      id: `w_${nanoid(8)}`,
      ...segment,
    }
    void updateMasterMap(masterMap.id, {
      walls: [...masterMap.walls, created],
    })
  }

  const handleDeleteWall = (wallId: string) => {
    if (!masterMap) return
    void updateMasterMap(masterMap.id, {
      walls: masterMap.walls.filter((w) => w.id !== wallId),
    })
  }

  const handleToggleDoor = (wallId: string) => {
    if (!masterMap) return
    void updateMasterMap(masterMap.id, {
      walls: masterMap.walls.map((w) =>
        w.id === wallId && w.kind === 'door' ? { ...w, open: !w.open } : w
      ),
    })
  }

  const handleGridChange = (patch: Partial<GridConfig>) => {
    if (!masterMap) return
    void updateMasterMap(masterMap.id, {
      grid: { ...masterMap.grid, ...patch },
    })
  }

  const toolButtons: { key: MasterMapTool; icon: string; label: string }[] = [
    { key: 'select', icon: 'open_with', label: t('battlemap.toolSelect') },
    { key: 'wall', icon: 'fence', label: t('battlemap.toolWall') },
    { key: 'door', icon: 'door_front', label: t('battlemap.toolDoor') },
    { key: 'eraseWall', icon: 'ink_eraser', label: t('battlemap.toolEraseWall') },
    { key: 'fogReveal', icon: 'visibility', label: t('battlemap.toolFogReveal') },
    { key: 'fogHide', icon: 'visibility_off', label: t('battlemap.toolFogHide') },
    { key: 'ping', icon: 'radar', label: t('battlemap.toolPing') },
  ]

  const doorsList = useMemo(
    () => (masterMap?.walls ?? []).filter((w) => w.kind === 'door'),
    [masterMap?.walls]
  )

  return (
    <div className="min-h-screen bg-surface text-on-surface dark flex flex-col">
      {/* Top Master Console Header */}
      <header className="sticky top-0 z-40 px-4 md:px-6 py-3 bg-surface-container/90 backdrop-blur-xl border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-secondary/15 border border-secondary/40 font-mono text-xs text-secondary font-bold uppercase">
            GM CONSOLE
          </span>
          <h1 className="font-headline text-sm md:text-lg font-black uppercase tracking-wider text-primary">
            {t('battlemap.masterTitle')}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            data-testid="master-image-input"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-white/15 hover:border-primary/50 text-xs font-label uppercase tracking-wider text-on-surface flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-primary">upload_file</span>
            <span>
              {masterMap && masterMap.imageHash !== 'blank'
                ? t('battlemap.replaceImage')
                : t('battlemap.uploadImage')}
            </span>
          </button>

          {masterMap && (
            <button
              type="button"
              data-testid="master-broadcast-btn"
              disabled={masterMap.isActive}
              onClick={() => void setActiveMap(masterMap.id)}
              className={`px-3.5 py-1.5 rounded-xl font-label text-xs uppercase tracking-wider font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                masterMap.isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 cursor-default'
                  : 'bg-primary/20 text-primary border-primary/50 hover:bg-primary/30 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {masterMap.isActive ? 'sensors' : 'cast'}
              </span>
              <span>
                {masterMap.isActive
                  ? t('battlemap.broadcastingNow')
                  : t('battlemap.broadcastActive')}
              </span>
            </button>
          )}

          <LanguageFlagSwitcher />
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-3 rounded-xl bg-error/15 border border-error/40 px-4 py-2 text-xs text-error">
          {error}
        </div>
      )}

      {/* 3-Column Master Workspace */}
      <div className="flex-1 p-4 md:p-6 grid grid-cols-1 xl:grid-cols-[270px_1fr_310px] gap-4 items-start">
        {/* LEFT COLUMN: Map Library & Party Roster Spawner */}
        <aside className="space-y-4">
          {/* Map Library Card */}
          <section className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-4 space-y-3">
            <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-secondary">
              {t('battlemap.libraryTitle')}
            </h2>

            <form onSubmit={handleCreateMap} className="flex gap-1.5">
              <input
                type="text"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder={t('battlemap.mapNamePlaceholder')}
                data-testid="new-map-name-input"
                className="flex-1 min-w-0 rounded-xl bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs text-on-surface placeholder:text-tertiary/50 focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                data-testid="create-map-btn"
                className="px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/40 text-primary font-label text-xs font-bold uppercase cursor-pointer hover:bg-primary/30"
              >
                +
              </button>
            </form>

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {library.map((item) => {
                const isEditing = masterMap?.id === item.id
                return (
                  <div
                    key={item.id}
                    data-testid={`library-map-${item.id}`}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                      isEditing
                        ? 'bg-primary/15 border-primary/40 text-on-surface'
                        : 'bg-surface-container-high/40 border-white/5 text-tertiary hover:text-on-surface'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void loadMasterMap(item.id)}
                      className="flex-1 text-left truncate font-medium cursor-pointer flex items-center gap-1.5"
                    >
                      {item.isActive && (
                        <span
                          title={t('battlemap.broadcastingNow')}
                          className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_8px_#34d399]"
                        />
                      )}
                      <span className="truncate">{item.name}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {!item.isActive && (
                        <button
                          type="button"
                          data-testid={`activate-map-${item.id}`}
                          onClick={() => void setActiveMap(item.id)}
                          title={t('battlemap.broadcastActive')}
                          className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[10px] font-bold hover:bg-primary/25 cursor-pointer"
                        >
                          LIVE
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`delete-map-${item.id}`}
                        onClick={() => void deleteMap(item.id)}
                        title={t('battlemap.deleteMap')}
                        className="text-tertiary hover:text-error px-1 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Party & Companions Deployer */}
          {masterMap && (
            <section className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-4 space-y-3">
              <button
                type="button"
                data-testid="deploy-party-btn"
                onClick={() => void handleDeployParty()}
                className="w-full py-2 px-3 rounded-xl bg-primary/15 border border-primary/40 text-primary font-label text-xs font-bold uppercase tracking-wider hover:bg-primary/25 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">groups</span>
                <span>{t('battlemap.deployParty')}</span>
              </button>

              {/* Companion deploy buttons */}
              <div className="space-y-1">
                {characters.flatMap((c) =>
                  (c.companions ?? []).map((comp) => (
                    <button
                      key={`${c.id}-${comp.id}`}
                      type="button"
                      onClick={() =>
                        void handleDeployCompanion(c.id, comp.id, comp.name, comp.maxHp)
                      }
                      className="w-full py-1.5 px-2.5 rounded-lg bg-surface-container-high/50 border border-white/10 text-[11px] text-tertiary hover:text-white cursor-pointer flex items-center justify-between"
                    >
                      <span>+ {comp.name}</span>
                      <span className="text-[10px] opacity-70">{c.name}</span>
                    </button>
                  ))
                )}
              </div>

              {/* Doors quick toggle list */}
              {doorsList.length > 0 && (
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <span className="font-label text-[10px] uppercase tracking-widest text-tertiary">
                    {t('battlemap.toggleDoor')} ({doorsList.length})
                  </span>
                  {doorsList.map((d, idx) => (
                    <button
                      key={d.id}
                      type="button"
                      data-testid={`door-list-toggle-${d.id}`}
                      onClick={() => handleToggleDoor(d.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer ${
                        d.open
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <span>Porta #{idx + 1}</span>
                      <span className="font-bold uppercase text-[10px]">
                        {d.open ? t('battlemap.doorOpen') : t('battlemap.doorClosed')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </aside>

        {/* CENTER COLUMN: Toolbar + Viewport */}
        <main className="space-y-3 min-w-0">
          {masterMap ? (
            <>
              {/* Master Tactical Toolbar */}
              <div className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {toolButtons.map((btn) => {
                    const active = masterTool === btn.key
                    return (
                      <button
                        key={btn.key}
                        type="button"
                        data-testid={`master-tool-${btn.key}`}
                        onClick={() => setMasterTool(btn.key)}
                        className={`px-2.5 py-1.5 rounded-xl font-label text-[11px] uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                          active
                            ? 'bg-primary/20 text-primary border-primary/50 font-bold shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                            : 'bg-surface-container-high/50 text-tertiary border-white/10 hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{btn.icon}</span>
                        <span>{btn.label}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1.5">
                  {(masterTool === 'wall' || masterTool === 'door') && (
                    <button
                      type="button"
                      data-testid="toggle-wall-snap"
                      onClick={() => setSnapWallsToGrid((s) => !s)}
                      className={`px-2.5 py-1.5 rounded-xl font-label text-[10px] uppercase tracking-wider border cursor-pointer ${
                        snapWallsToGrid
                          ? 'bg-secondary/20 text-secondary border-secondary/45 font-bold'
                          : 'bg-surface-container-high/60 text-tertiary border-white/10'
                      }`}
                    >
                      {snapWallsToGrid
                        ? t('battlemap.snapToGrid')
                        : t('battlemap.freeAngleWalls')}
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="reset-fog-btn"
                    onClick={() => void fogOverride(masterMap.id, 'reset')}
                    className="px-2.5 py-1.5 rounded-xl bg-surface-container-high/60 border border-white/10 hover:border-amber-400/50 text-amber-300 font-label text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    {t('battlemap.resetFog')}
                  </button>
                </div>
              </div>

              <BattlemapViewport
                map={masterMap}
                imageUrl={imageUrl}
                role="master"
                selectedTokenId={selectedTokenId}
                onSelectToken={setSelectedTokenId}
                onMoveToken={handleMasterMoveToken}
                onCellPing={(col, row) => void sendPing(masterMap.id, col, row, 'Master', 'master', 'magenta')}
                masterTool={masterTool}
                snapWallsToGrid={snapWallsToGrid}
                onAddWall={handleAddWall}
                onDeleteWall={handleDeleteWall}
                onToggleDoor={handleToggleDoor}
                onFogPaintCells={(cells, mode) => void fogOverride(masterMap.id, mode, cells)}
              />
            </>
          ) : (
            <div className="rounded-2xl bg-surface-container/80 border border-white/10 p-12 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-secondary">
                add_photo_alternate
              </span>
              <p className="text-sm text-tertiary">
                Crea una mappa nella libreria a sinistra o carica direttamente un&apos;immagine per iniziare.
              </p>
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: Enemy Spawner, Token Inspector & Grid Calibration */}
        <aside className="space-y-4">
          {masterMap && (
            <>
              {/* Enemy Spawner & Active Enemies */}
              <section className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-4 space-y-3">
                <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-error">
                  {t('battlemap.enemiesSection')}
                </h2>

                <form onSubmit={handleAddEnemy} className="space-y-2">
                  <input
                    type="text"
                    value={enemyName}
                    onChange={(e) => setEnemyName(e.target.value)}
                    placeholder={t('battlemap.enemyNamePlaceholder')}
                    data-testid="enemy-name-input"
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-1.5 text-xs text-on-surface placeholder:text-tertiary/50"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={enemySize}
                      onChange={(e) => setEnemySize(Number(e.target.value) as TokenSizeCells)}
                      data-testid="enemy-size-select"
                      aria-label="Taglia nemico"
                      className="rounded-xl bg-black/40 border border-white/10 px-2 py-1.5 text-xs text-on-surface"
                    >
                      <option value={1}>{t('battlemap.sizeMedium')}</option>
                      <option value={2}>{t('battlemap.sizeLarge')}</option>
                      <option value={3}>{t('battlemap.sizeHuge')}</option>
                    </select>

                    <input
                      type="number"
                      min={1}
                      max={9999}
                      value={enemyHp}
                      onChange={(e) => setEnemyHp(Math.max(1, Number(e.target.value) || 1))}
                      data-testid="enemy-hp-input"
                      aria-label="PF massimi nemico"
                      className="rounded-xl bg-black/40 border border-white/10 px-2.5 py-1.5 text-xs font-mono text-on-surface"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {ENEMY_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setEnemyColor(col)}
                          aria-label={`Color ${col}`}
                          className={`w-5 h-5 rounded-full border cursor-pointer ${
                            enemyColor === col ? 'border-white scale-110' : 'border-white/20 opacity-65'
                          }`}
                          style={{
                            backgroundColor:
                              col === 'crimson'
                                ? '#ff4b60'
                                : col === 'violet'
                                  ? '#a855f7'
                                  : col === 'amber'
                                    ? '#fbbf24'
                                    : col === 'magenta'
                                      ? '#d946ef'
                                      : col === 'emerald'
                                        ? '#10b981'
                                        : '#00f0ff',
                          }}
                        />
                      ))}
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] text-tertiary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enemyHidden}
                        onChange={(e) => setEnemyHidden(e.target.checked)}
                        data-testid="enemy-hidden-checkbox"
                      />
                      <span>{t('battlemap.stealthHidden')}</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    data-testid="add-enemy-btn"
                    className="w-full py-1.5 px-3 rounded-xl bg-error/20 border border-error/45 text-error font-label text-xs font-bold uppercase tracking-wider hover:bg-error/30 cursor-pointer"
                  >
                    + {t('battlemap.addEnemy')}
                  </button>
                </form>

                {/* Token Roster Management */}
                <div className="pt-2 border-t border-white/10 space-y-2 max-h-64 overflow-y-auto">
                  {masterMap.tokens.map((tok) => {
                    const isSel = tok.id === selectedTokenId
                    return (
                      <div
                        key={tok.id}
                        data-testid={`roster-token-${tok.id}`}
                        className={`rounded-xl border p-2.5 space-y-1.5 text-xs ${
                          isSel
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-surface-container-high/40 border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTokenId(tok.id)}
                            className="font-bold text-left truncate text-on-surface hover:text-primary cursor-pointer"
                          >
                            {tok.name}{' '}
                            <span className="font-mono text-[10px] text-tertiary">
                              ({tok.col},{tok.row})
                            </span>
                          </button>
                          <button
                            type="button"
                            data-testid={`remove-token-${tok.id}`}
                            onClick={() => handleRemoveToken(tok.id)}
                            title={t('battlemap.removeToken')}
                            className="text-tertiary hover:text-error cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {tok.type === 'enemy' && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 font-mono text-[11px]">
                              <button
                                type="button"
                                data-testid={`enemy-hp-minus5-${tok.id}`}
                                onClick={() => handleAdjustEnemyHp(tok.id, -5)}
                                className="px-1.5 py-0.5 rounded bg-error/20 text-error hover:bg-error/30 cursor-pointer"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                data-testid={`enemy-hp-minus1-${tok.id}`}
                                onClick={() => handleAdjustEnemyHp(tok.id, -1)}
                                className="px-1.5 py-0.5 rounded bg-error/15 text-error hover:bg-error/25 cursor-pointer"
                              >
                                -1
                              </button>
                              <span className="px-1 text-on-surface">
                                {tok.currentHp ?? 0}/{tok.maxHp ?? 0}
                              </span>
                              <button
                                type="button"
                                data-testid={`enemy-hp-plus1-${tok.id}`}
                                onClick={() => handleAdjustEnemyHp(tok.id, 1)}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 cursor-pointer"
                              >
                                +1
                              </button>
                            </div>

                            <button
                              type="button"
                              data-testid={`toggle-stealth-${tok.id}`}
                              onClick={() => handleToggleEnemyHidden(tok.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border cursor-pointer ${
                                tok.isHidden
                                  ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                                  : 'bg-black/30 border-white/10 text-tertiary'
                              }`}
                            >
                              {tok.isHidden ? 'INV ON' : 'INV OFF'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Selected Allied Token Facing Control */}
              {selectedToken &&
                (selectedToken.type === 'pc' || selectedToken.type === 'companion') && (
                  <section className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-4">
                    <FacingCompassDial
                      facingDeg={selectedToken.facingDeg}
                      onChangeFacing={(deg) => handleMasterRotateToken(selectedToken.id, deg)}
                    />
                  </section>
                )}

              {/* Grid & Vision Range Calibration */}
              <section className="rounded-2xl bg-surface-container/85 backdrop-blur-md border border-white/10 p-4 space-y-2.5">
                <h2 className="font-headline text-xs font-bold uppercase tracking-widest text-primary">
                  {t('battlemap.gridSettings')}
                </h2>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="space-y-1">
                    <span className="text-[10px] text-tertiary uppercase">{t('battlemap.cols')}</span>
                    <input
                      type="number"
                      min={4}
                      max={80}
                      value={masterMap.grid.cols}
                      data-testid="grid-cols-input"
                      onChange={(e) => handleGridChange({ cols: Number(e.target.value) || 24 })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 font-mono text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-tertiary uppercase">{t('battlemap.rows')}</span>
                    <input
                      type="number"
                      min={4}
                      max={80}
                      value={masterMap.grid.rows}
                      data-testid="grid-rows-input"
                      onChange={(e) => handleGridChange({ rows: Number(e.target.value) || 16 })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 font-mono text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-tertiary uppercase">
                      {t('battlemap.cellSizePx')}
                    </span>
                    <input
                      type="number"
                      min={16}
                      max={512}
                      value={masterMap.grid.cellSizePx}
                      onChange={(e) =>
                        handleGridChange({ cellSizePx: Number(e.target.value) || 64 })
                      }
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 font-mono text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-tertiary uppercase">
                      {t('battlemap.visionRange')}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={masterMap.grid.visionRangeCells}
                      data-testid="vision-range-input"
                      onChange={(e) =>
                        handleGridChange({ visionRangeCells: Number(e.target.value) || 8 })
                      }
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 font-mono text-primary font-bold"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-tertiary uppercase">
                      {t('battlemap.offsetX')}
                    </span>
                    <input
                      type="number"
                      value={masterMap.grid.offsetX}
                      onChange={(e) => handleGridChange({ offsetX: Number(e.target.value) || 0 })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 font-mono text-on-surface"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] text-tertiary uppercase">
                      {t('battlemap.offsetY')}
                    </span>
                    <input
                      type="number"
                      value={masterMap.grid.offsetY}
                      onChange={(e) => handleGridChange({ offsetY: Number(e.target.value) || 0 })}
                      className="w-full rounded-lg bg-black/40 border border-white/10 px-2 py-1 font-mono text-on-surface"
                    />
                  </label>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
