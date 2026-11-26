import { useMemo, useRef, useState } from 'react'
import type {
  EnemyHealthStatus,
  MapToken,
  MapWallSegment,
  TacticalMapState,
  TokenAccentColor,
} from '../../types/map'
import {
  cellKey,
  computeEnemyHealthStatus,
  computePartyVisibility,
  computeReachableCellsPF1e,
  computeTokenVisionPolygon,
  getTokenOccupiedCells,
  isEnemyVisibleToParty,
  snapGridCoordinate,
} from '../../lib/battlemap-engine'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { getCharacterLore } from '../../lib/character-lore'
import { CharacterEmblem } from '../character/CharacterEmblem'
import { useTranslation, getConditionInfo } from '../../i18n'

export type MasterMapTool =
  | 'select'
  | 'wall'
  | 'door'
  | 'eraseWall'
  | 'fogReveal'
  | 'fogHide'
  | 'ping'

const ACCENT_HEX: Record<TokenAccentColor, string> = {
  cyan: '#00f0ff',
  magenta: '#d946ef',
  crimson: '#ff4b60',
  violet: '#a855f7',
  amber: '#fbbf24',
  emerald: '#10b981',
}

const ENEMY_STATUS_STYLE: Record<
  EnemyHealthStatus,
  { color: string; labelKey: string }
> = {
  healthy: { color: '#10b981', labelKey: 'battlemap.enemyHealthy' },
  wounded: { color: '#fbbf24', labelKey: 'battlemap.enemyWounded' },
  critical: { color: '#ff4b60', labelKey: 'battlemap.enemyCritical' },
  defeated: { color: '#64748b', labelKey: 'battlemap.enemyDefeated' },
}

export interface BattlemapViewportProps {
  map: TacticalMapState
  imageUrl: string
  role: 'player' | 'master'
  selectedTokenId: string | null
  onSelectToken: (tokenId: string | null) => void
  onMoveToken: (tokenId: string, col: number, row: number) => void
  onCellPing: (col: number, row: number) => void
  pingMode?: boolean
  masterTool?: MasterMapTool
  snapWallsToGrid?: boolean
  onAddWall?: (segment: Omit<MapWallSegment, 'id'>) => void
  onDeleteWall?: (wallId: string) => void
  onToggleDoor?: (wallId: string) => void
  onFogPaintCells?: (cells: string[], mode: 'reveal' | 'hide') => void
}

export function BattlemapViewport({
  map,
  imageUrl,
  role,
  selectedTokenId,
  onSelectToken,
  onMoveToken,
  onCellPing,
  pingMode = false,
  masterTool = 'select',
  snapWallsToGrid = true,
  onAddWall,
  onDeleteWall,
  onToggleDoor,
  onFogPaintCells,
}: BattlemapViewportProps) {
  const { t, locale } = useTranslation()
  const characters = useCharacterStore((s) => s.characters)
  const sessions = useSessionStore((s) => s.sessions)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 16, y: 16 })
  const [isPanning, setIsPanning] = useState(false)
  const panOriginRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null
  )
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null)
  const [wallAnchor, setWallAnchor] = useState<{ x: number; y: number } | null>(null)
  const [wallPreview, setWallPreview] = useState<{ x: number; y: number } | null>(null)

  const { grid, walls, tokens, fog, pings } = map
  const cellPx = grid.cellSizePx
  const gridWidthPx = grid.cols * cellPx
  const gridHeightPx = grid.rows * cellPx
  const stageWidth = Math.max(map.imageWidth || gridWidthPx, grid.offsetX + gridWidthPx)
  const stageHeight = Math.max(map.imageHeight || gridHeightPx, grid.offsetY + gridHeightPx)

  const visibility = useMemo(
    () => computePartyVisibility(tokens, grid, walls, fog),
    [tokens, grid, walls, fog]
  )

  const selectedToken = useMemo(
    () => tokens.find((tok) => tok.id === selectedTokenId) ?? null,
    [tokens, selectedTokenId]
  )

  // Compute live speed in feet for selected allied token
  const selectedTokenSpeedFeet = useMemo(() => {
    if (!selectedToken) return 30
    if (selectedToken.type === 'pc' && selectedToken.characterId) {
      const char = characters.find((c) => c.id === selectedToken.characterId)
      if (char) return char.speed
    }
    return selectedToken.speedFeet ?? 30
  }, [selectedToken, characters])

  // Only visible enemies act as obstacles in PF1e reachability highlight (no metagame leak)
  const visibleEnemyCellSet = useMemo(() => {
    const set = new Set<string>()
    for (const tok of tokens) {
      if (tok.type !== 'enemy') continue
      if (role === 'master' || isEnemyVisibleToParty(tok, visibility.visibleSet)) {
        for (const c of getTokenOccupiedCells(tok)) {
          set.add(cellKey(c.col, c.row))
        }
      }
    }
    return set
  }, [tokens, role, visibility.visibleSet])

  const reachableCells = useMemo(() => {
    if (!selectedToken) return new Map<string, number>()
    if (selectedToken.type !== 'pc' && selectedToken.type !== 'companion') {
      return new Map<string, number>()
    }
    if (role === 'master' && masterTool !== 'select') {
      return new Map<string, number>()
    }
    return computeReachableCellsPF1e(
      { ...selectedToken, speedFeet: selectedTokenSpeedFeet },
      grid,
      walls,
      visibleEnemyCellSet
    )
  }, [selectedToken, selectedTokenSpeedFeet, grid, walls, visibleEnemyCellSet, role, masterTool])

  // Smooth vision cone polygons for allied tokens
  const alliedCones = useMemo(() => {
    return tokens
      .filter((tok) => tok.type === 'pc' || tok.type === 'companion')
      .map((tok) => ({
        token: tok,
        points: computeTokenVisionPolygon(tok, grid, walls, 72),
      }))
  }, [tokens, grid, walls])

  // Filter tokens rendered on canvas (players only see visible unhidden enemies)
  const renderedTokens = useMemo(() => {
    if (role === 'master') return tokens
    return tokens.filter(
      (tok) =>
        tok.type === 'pc' ||
        tok.type === 'companion' ||
        isEnemyVisibleToParty(tok, visibility.visibleSet)
    )
  }, [tokens, role, visibility.visibleSet])

  const clientPointToGrid = (clientX: number, clientY: number): { gx: number; gy: number } | null => {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    const stageX = (clientX - rect.left - pan.x) / zoom
    const stageY = (clientY - rect.top - pan.y) / zoom
    const gx = (stageX - grid.offsetX) / cellPx
    const gy = (stageY - grid.offsetY) / cellPx
    return { gx, gy }
  }

  const normalizeWallPoint = (gx: number, gy: number) => {
    const clampedX = Math.max(0, Math.min(grid.cols, gx))
    const clampedY = Math.max(0, Math.min(grid.rows, gy))
    if (snapWallsToGrid) {
      return {
        x: snapGridCoordinate(clampedX, 1),
        y: snapGridCoordinate(clampedY, 1),
      }
    }
    return {
      x: Number(clampedX.toFixed(2)),
      y: Number(clampedY.toFixed(2)),
    }
  }

  const handleCellClick = (col: number, row: number) => {
    if (role === 'player') {
      if (pingMode) {
        onCellPing(col, row)
        return
      }
      if (selectedToken && (selectedToken.type === 'pc' || selectedToken.type === 'companion')) {
        onMoveToken(selectedToken.id, col, row)
      }
      return
    }

    // Master interactions
    if (masterTool === 'ping' || pingMode) {
      onCellPing(col, row)
      return
    }
    if (masterTool === 'fogReveal') {
      onFogPaintCells?.([cellKey(col, row)], 'reveal')
      return
    }
    if (masterTool === 'fogHide') {
      onFogPaintCells?.([cellKey(col, row)], 'hide')
      return
    }
    if (masterTool === 'select' && selectedToken) {
      onMoveToken(selectedToken.id, col, row)
    }
  }

  const handleCellPointerUp = (col: number, row: number) => {
    if (draggingTokenId) {
      onMoveToken(draggingTokenId, col, row)
      setDraggingTokenId(null)
    }
  }

  const handleWallLayerClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (role !== 'master' || (masterTool !== 'wall' && masterTool !== 'door')) return
    e.stopPropagation()
    const pt = clientPointToGrid(e.clientX, e.clientY)
    if (!pt) return
    const snapped = normalizeWallPoint(pt.gx, pt.gy)

    if (!wallAnchor) {
      setWallAnchor(snapped)
      setWallPreview(snapped)
      return
    }

    if (Math.hypot(snapped.x - wallAnchor.x, snapped.y - wallAnchor.y) >= 0.25) {
      onAddWall?.({
        x1: wallAnchor.x,
        y1: wallAnchor.y,
        x2: snapped.x,
        y2: snapped.y,
        kind: masterTool === 'door' ? 'door' : 'wall',
        ...(masterTool === 'door' ? { open: false } : {}),
      })
    }
    setWallAnchor(null)
    setWallPreview(null)
  }

  const handleWallLayerMove = (e: React.MouseEvent<SVGRectElement>) => {
    if (!wallAnchor) return
    const pt = clientPointToGrid(e.clientX, e.clientY)
    if (!pt) return
    setWallPreview(normalizeWallPoint(pt.gx, pt.gy))
  }

  const centerOnToken = (tok: MapToken | null) => {
    const target = tok ?? tokens.find((t) => t.type === 'pc') ?? tokens[0]
    if (!target || !containerRef.current) {
      setPan({ x: 16, y: 16 })
      return
    }
    const rect = containerRef.current.getBoundingClientRect()
    const viewW = rect.width || 800
    const viewH = rect.height || 600
    const cx = grid.offsetX + (target.col + target.size / 2) * cellPx
    const cy = grid.offsetY + (target.row + target.size / 2) * cellPx
    setPan({
      x: Math.round(viewW / 2 - cx * zoom),
      y: Math.round(viewH / 2 - cy * zoom),
    })
  }

  const handleBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      panOriginRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        panX: pan.x,
        panY: pan.y,
      }
    }
  }

  const handleBackgroundPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || !panOriginRef.current) return
    const dx = e.clientX - panOriginRef.current.startX
    const dy = e.clientY - panOriginRef.current.startY
    setPan({
      x: panOriginRef.current.panX + dx,
      y: panOriginRef.current.panY + dy,
    })
  }

  const handleBackgroundPointerUp = () => {
    setIsPanning(false)
    panOriginRef.current = null
    setDraggingTokenId(null)
  }

  const isWallDrawingMode = role === 'master' && (masterTool === 'wall' || masterTool === 'door')

  return (
    <div
      ref={containerRef}
      data-testid="battlemap-viewport"
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handleBackgroundPointerMove}
      onPointerUp={handleBackgroundPointerUp}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          const factor = e.deltaY < 0 ? 1.12 : 0.89
          setZoom((z) => Math.max(0.35, Math.min(2.75, Number((z * factor).toFixed(2)))))
        }
      }}
      className="relative w-full h-[68vh] min-h-[440px] rounded-2xl overflow-hidden bg-[#06060d] border border-white/10 shadow-2xl select-none"
    >
      {/* Floating Zoom & Camera Controls */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container/90 backdrop-blur-md border border-white/10 shadow-lg">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.35, Number((z - 0.15).toFixed(2))))}
          aria-label={t('battlemap.zoomOut')}
          title={t('battlemap.zoomOut')}
          className="px-2 py-1 rounded-lg text-xs font-mono text-tertiary hover:text-primary hover:bg-white/5 cursor-pointer"
        >
          −
        </button>
        <span className="font-mono text-[11px] text-on-surface min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.75, Number((z + 0.15).toFixed(2))))}
          aria-label={t('battlemap.zoomIn')}
          title={t('battlemap.zoomIn')}
          className="px-2 py-1 rounded-lg text-xs font-mono text-tertiary hover:text-primary hover:bg-white/5 cursor-pointer"
        >
          +
        </button>
        <div className="w-px h-4 bg-white/10 mx-0.5" />
        <button
          type="button"
          onClick={() => {
            setZoom(1)
            setPan({ x: 16, y: 16 })
          }}
          aria-label={t('battlemap.resetZoom')}
          title={t('battlemap.resetZoom')}
          className="px-2 py-1 rounded-lg text-[10px] font-label uppercase tracking-wider text-tertiary hover:text-primary hover:bg-white/5 cursor-pointer"
        >
          1:1
        </button>
        <button
          type="button"
          onClick={() => centerOnToken(selectedToken)}
          aria-label={t('battlemap.centerOnActive')}
          title={t('battlemap.centerOnActive')}
          className="px-2 py-1 rounded-lg text-[10px] font-label uppercase tracking-wider text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 cursor-pointer"
        >
          ⌖
        </button>
      </div>

      {/* Pan Bar (arrow pan nudges for touch/trackpad convenience) */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 px-2 py-1 rounded-xl bg-surface-container/85 backdrop-blur-md border border-white/10 text-xs text-tertiary">
        <button
          type="button"
          onClick={() => setPan((p) => ({ ...p, x: p.x + 96 }))}
          className="px-1.5 py-0.5 hover:text-primary cursor-pointer"
          aria-label="Pan Left"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => setPan((p) => ({ ...p, y: p.y + 96 }))}
          className="px-1.5 py-0.5 hover:text-primary cursor-pointer"
          aria-label="Pan Up"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => setPan((p) => ({ ...p, y: p.y - 96 }))}
          className="px-1.5 py-0.5 hover:text-primary cursor-pointer"
          aria-label="Pan Down"
        >
          ▼
        </button>
        <button
          type="button"
          onClick={() => setPan((p) => ({ ...p, x: p.x - 96 }))}
          className="px-1.5 py-0.5 hover:text-primary cursor-pointer"
          aria-label="Pan Right"
        >
          ▶
        </button>
      </div>

      {/* Transformed Stage */}
      <div
        style={{
          width: `${stageWidth}px`,
          height: `${stageHeight}px`,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        className="relative"
      >
        {/* 1. Base Map Image or Blueprint Backdrop */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={map.name}
            draggable={false}
            style={{ width: `${map.imageWidth}px`, height: `${map.imageHeight}px` }}
            className="absolute top-0 left-0 object-fill pointer-events-none select-none"
          />
        ) : (
          <div
            style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
            className="absolute inset-0 bg-gradient-to-br from-[#0c1020] via-[#090b14] to-[#120b1c] pointer-events-none"
          />
        )}

        {/* 2. Main Tactical SVG Overlay (Grid, PF1e Reach, Cones, Fog, Walls/Doors, Pings) */}
        <svg
          width={stageWidth}
          height={stageHeight}
          viewBox={`0 0 ${stageWidth} ${stageHeight}`}
          className="absolute top-0 left-0 overflow-visible"
        >
          <g transform={`translate(${grid.offsetX}, ${grid.offsetY})`}>
            {/* 2A. Interactive Grid Cells + PF1e Movement Highlight */}
            {Array.from({ length: grid.rows }).map((_, r) =>
              Array.from({ length: grid.cols }).map((__, c) => {
                const key = cellKey(c, r)
                const moveCost = reachableCells.get(key)
                const isReachable = moveCost !== undefined && moveCost > 0

                return (
                  <rect
                    key={key}
                    data-testid={`map-cell-${c}-${r}`}
                    x={c * cellPx}
                    y={r * cellPx}
                    width={cellPx}
                    height={cellPx}
                    fill={isReachable ? 'rgba(0, 240, 255, 0.14)' : 'transparent'}
                    stroke={
                      isReachable
                        ? 'rgba(0, 240, 255, 0.55)'
                        : `rgba(255, 255, 255, ${grid.gridOpacity})`
                    }
                    strokeWidth={isReachable ? 1.5 : 1}
                    onClick={() => handleCellClick(c, r)}
                    onPointerUp={() => handleCellPointerUp(c, r)}
                    className="cursor-pointer"
                  />
                )
              })
            )}

            {/* 2B. Smooth Vision Cone Glow Polygons */}
            {alliedCones.map(({ token, points }) => {
              const polyStr = points
                .map((p) => `${(p.x * cellPx).toFixed(1)},${(p.y * cellPx).toFixed(1)}`)
                .join(' ')
              const accent = ACCENT_HEX[token.color] ?? '#00f0ff'
              return (
                <polygon
                  key={`cone-${token.id}`}
                  data-testid={`vision-cone-${token.id}`}
                  points={polyStr}
                  fill={accent}
                  fillOpacity={token.id === selectedTokenId ? 0.16 : 0.08}
                  stroke={accent}
                  strokeOpacity={token.id === selectedTokenId ? 0.55 : 0.25}
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )
            })}

            {/* 2C. Fog of War Cell Layer (Unexplored vs Explored Shroud vs Visible) */}
            {Array.from({ length: grid.rows }).map((_, r) =>
              Array.from({ length: grid.cols }).map((__, c) => {
                const key = cellKey(c, r)
                const isVisible = visibility.visibleSet.has(key)
                const isExplored = visibility.exploredSet.has(key)

                if (isVisible) return null

                const fillOpacity =
                  role === 'master'
                    ? isExplored
                      ? 0.22
                      : 0.44
                    : isExplored
                      ? 0.68
                      : 0.97

                return (
                  <rect
                    key={`fog-${key}`}
                    data-testid={`fog-cell-${c}-${r}`}
                    data-fog-state={isExplored ? 'explored' : 'unexplored'}
                    x={c * cellPx}
                    y={r * cellPx}
                    width={cellPx}
                    height={cellPx}
                    fill="#05050b"
                    fillOpacity={fillOpacity}
                    pointerEvents="none"
                  />
                )
              })
            )}

            {/* 2D. Walls & Doors Layer */}
            {walls.map((seg) => {
              const isDoor = seg.kind === 'door'
              const isOpen = Boolean(seg.open)

              // Hide unseen walls/doors in completely unexplored dark areas for players
              if (role === 'player') {
                const midCol = Math.floor((seg.x1 + seg.x2) / 2)
                const midRow = Math.floor((seg.y1 + seg.y2) / 2)
                const nearExplored =
                  visibility.exploredSet.has(cellKey(midCol, midRow)) ||
                  visibility.exploredSet.has(cellKey(midCol - 1, midRow)) ||
                  visibility.exploredSet.has(cellKey(midCol, midRow - 1))
                if (!nearExplored) return null
              }

              const x1 = seg.x1 * cellPx
              const y1 = seg.y1 * cellPx
              const x2 = seg.x2 * cellPx
              const y2 = seg.y2 * cellPx

              const strokeColor = isDoor
                ? isOpen
                  ? '#10b981'
                  : '#fbbf24'
                : '#d946ef'

              const canMasterInteract =
                role === 'master' &&
                (masterTool === 'eraseWall' || (masterTool === 'select' && isDoor))

              return (
                <g key={seg.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={isDoor ? 6 : 4}
                    strokeDasharray={isDoor && isOpen ? '8 6' : undefined}
                    strokeLinecap="round"
                    pointerEvents="none"
                  />
                  {canMasterInteract && (
                    <line
                      data-testid={`wall-seg-${seg.id}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="transparent"
                      strokeWidth={18}
                      strokeLinecap="round"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (masterTool === 'eraseWall') {
                          onDeleteWall?.(seg.id)
                        } else if (isDoor) {
                          onToggleDoor?.(seg.id)
                        }
                      }}
                    >
                      <title>
                        {masterTool === 'eraseWall'
                          ? t('battlemap.toolEraseWall')
                          : isOpen
                            ? t('battlemap.doorOpen')
                            : t('battlemap.doorClosed')}
                      </title>
                    </line>
                  )}
                </g>
              )
            })}

            {/* 2E. Active Wall/Door Drawing Surface & Preview */}
            {isWallDrawingMode && (
              <>
                {wallAnchor && wallPreview && (
                  <line
                    x1={wallAnchor.x * cellPx}
                    y1={wallAnchor.y * cellPx}
                    x2={wallPreview.x * cellPx}
                    y2={wallPreview.y * cellPx}
                    stroke={masterTool === 'door' ? '#fbbf24' : '#00f0ff'}
                    strokeWidth={4}
                    strokeDasharray="6 4"
                    pointerEvents="none"
                  />
                )}
                <rect
                  data-testid="wall-drawing-surface"
                  x={0}
                  y={0}
                  width={gridWidthPx}
                  height={gridHeightPx}
                  fill="transparent"
                  className="cursor-crosshair"
                  onClick={handleWallLayerClick}
                  onMouseMove={handleWallLayerMove}
                />
              </>
            )}

            {/* 2F. Shared Radar Pings */}
            {pings.map((p) => {
              const cx = (p.col + 0.5) * cellPx
              const cy = (p.row + 0.5) * cellPx
              const pingHex =
                p.color === 'magenta' ? '#d946ef' : p.color === 'amber' ? '#fbbf24' : '#00f0ff'
              return (
                <g key={p.id} data-testid={`map-ping-${p.col}-${p.row}`} pointerEvents="none">
                  <circle
                    cx={cx}
                    cy={cy}
                    r={cellPx * 0.42}
                    fill="none"
                    stroke={pingHex}
                    strokeWidth={3}
                  />
                  <circle cx={cx} cy={cy} r={5} fill={pingHex} />
                  <text
                    x={cx}
                    y={cy - cellPx * 0.52}
                    textAnchor="middle"
                    fill={pingHex}
                    fontSize={11}
                    fontWeight="bold"
                  >
                    {p.senderName}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* 3. Interactive Token Pogs Layer */}
        {renderedTokens.map((tok) => {
          const isSelected = tok.id === selectedTokenId
          const sizePx = tok.size * cellPx
          const leftPx = grid.offsetX + tok.col * cellPx
          const topPx = grid.offsetY + tok.row * cellPx
          const accentHex = ACCENT_HEX[tok.color] ?? '#00f0ff'

          // Live character / session binding for allied tokens
          const linkedChar =
            tok.characterId ? characters.find((c) => c.id === tok.characterId) : undefined
          const linkedSession =
            tok.characterId ? sessions[tok.characterId] : undefined

          let hpRatio = 1
          let hpTitle = ''
          let conditionLabels: string[] = []

          if (tok.type === 'pc') {
            const maxHp = linkedChar?.maxHp ?? 10
            const curHp = linkedSession?.currentHp ?? maxHp
            hpRatio = Math.max(0, Math.min(1, curHp / Math.max(1, maxHp)))
            hpTitle = `${curHp}/${maxHp} HP`
            conditionLabels = (linkedSession?.conditions ?? []).map(
              (c) => getConditionInfo(c, locale).name
            )
          } else if (tok.type === 'companion' && tok.companionId && linkedSession) {
            const compMax = tok.maxHp ?? 15
            const compCur = linkedSession.companionHp?.[tok.companionId] ?? compMax
            hpRatio = Math.max(0, Math.min(1, compCur / Math.max(1, compMax)))
            hpTitle = `${compCur}/${compMax} HP`
            conditionLabels = (linkedSession.companionConditions?.[tok.companionId] ?? []).map(
              (c) => getConditionInfo(c, locale).name
            )
          } else if (tok.type === 'enemy') {
            if (role === 'master') {
              const maxHp = tok.maxHp ?? 15
              const curHp = tok.currentHp ?? maxHp
              hpRatio = Math.max(0, Math.min(1, curHp / Math.max(1, maxHp)))
              hpTitle = `${curHp}/${maxHp} HP`
            } else {
              const st = tok.healthStatus ?? computeEnemyHealthStatus(tok.currentHp, tok.maxHp)
              hpRatio =
                st === 'healthy' ? 1 : st === 'wounded' ? 0.5 : st === 'critical' ? 0.2 : 0
              hpTitle = t(ENEMY_STATUS_STYLE[st].labelKey)
            }
          }

          const enemyStatus: EnemyHealthStatus =
            tok.healthStatus ?? computeEnemyHealthStatus(tok.currentHp, tok.maxHp)
          const ringColor =
            tok.type === 'enemy'
              ? ENEMY_STATUS_STYLE[enemyStatus].color
              : hpRatio <= 0.25
                ? '#ff4b60'
                : hpRatio <= 0.5
                  ? '#fbbf24'
                  : accentHex

          const radius = 44
          const circumference = 2 * Math.PI * radius
          const strokeDashoffset = circumference * (1 - hpRatio)

          const canInteract =
            !isWallDrawingMode &&
            (role === 'master' ? masterTool === 'select' : !pingMode)

          return (
            <button
              key={tok.id}
              type="button"
              data-testid={`map-token-${tok.id}`}
              aria-label={`${tok.name}${hpTitle ? ` (${hpTitle})` : ''}`}
              title={`${tok.name}${hpTitle ? ` · ${hpTitle}` : ''}${
                conditionLabels.length > 0 ? ` · ${conditionLabels.join(', ')}` : ''
              }`}
              style={{
                left: `${leftPx}px`,
                top: `${topPx}px`,
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                opacity: tok.type === 'enemy' && tok.isHidden ? 0.55 : 1,
                pointerEvents: canInteract ? 'auto' : 'none',
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                if (role === 'player' && tok.type === 'enemy') return
                onSelectToken(tok.id)
                setDraggingTokenId(tok.id)
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (role === 'player' && tok.type === 'enemy') return
                onSelectToken(tok.id)
              }}
              className={`absolute z-20 p-1 rounded-full flex items-center justify-center transition-shadow cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-primary shadow-[0_0_20px_rgba(0,240,255,0.65)]'
                  : 'hover:brightness-110'
              }`}
            >
              {/* Token Circular Pog + HP Ring + Facing Indicator */}
              <div className="relative w-full h-full rounded-full bg-[#0b0d18]/95 border border-white/15 flex items-center justify-center overflow-visible">
                {/* Circular HP Progress Arc */}
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="6"
                  />
                  <circle
                    data-testid={`token-hp-ring-${tok.id}`}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Directional Facing Notch (for PC & Companion tokens) */}
                {(tok.type === 'pc' || tok.type === 'companion') && (
                  <div
                    style={{ transform: `rotate(${tok.facingDeg}deg)` }}
                    className="absolute inset-0 pointer-events-none flex items-center justify-end"
                  >
                    <span
                      style={{ backgroundColor: accentHex }}
                      className="w-2.5 h-2.5 -mr-1 rounded-full shadow-[0_0_8px_currentColor]"
                    />
                  </div>
                )}

                {/* Emblem or Label */}
                {tok.type === 'pc' && tok.characterId ? (
                  <div className="w-[74%] h-[74%] rounded-full overflow-hidden">
                    <CharacterEmblem
                      characterId={tok.characterId}
                      variant="avatar"
                      lore={getCharacterLore(tok.characterId)}
                    />
                  </div>
                ) : (
                  <span
                    style={{ color: accentHex }}
                    className="font-headline font-black text-xs tracking-tight uppercase"
                  >
                    {tok.label}
                  </span>
                )}

                {/* Condition Badge */}
                {conditionLabels.length > 0 && (
                  <span
                    data-testid={`token-conditions-${tok.id}`}
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-error text-[9px] font-bold text-white leading-none shadow"
                  >
                    !{conditionLabels.length}
                  </span>
                )}

                {/* Enemy Stealth Badge (Master only) */}
                {role === 'master' && tok.type === 'enemy' && tok.isHidden && (
                  <span
                    data-testid={`token-hidden-badge-${tok.id}`}
                    className="absolute -top-1 -left-1 px-1 py-0.5 rounded bg-purple-600 text-[8px] font-bold uppercase text-white leading-none"
                  >
                    INV
                  </span>
                )}

                {/* Bottom Nameplate / Enemy Status */}
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-black/85 border border-white/10 text-[9px] font-label text-on-surface leading-none pointer-events-none">
                  {tok.name}
                  {tok.type === 'enemy' &&
                    (role === 'master'
                      ? ` (${tok.currentHp ?? 0}/${tok.maxHp ?? 0})`
                      : ` · ${t(ENEMY_STATUS_STYLE[enemyStatus].labelKey)}`)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
