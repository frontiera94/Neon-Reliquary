import { useState, useRef, useEffect } from 'react'
import type { PublicMapState } from '../../types/map'
import { useMapStore } from '../../store/useMapStore'
import { ShapeToolbar } from './ShapeToolbar'
import type { MapTool } from './ShapeToolbar'
import { TokenNode } from './TokenNode'
import { FogLayer } from './FogLayer'
import { RulerOverlay } from './RulerOverlay'

interface MapCanvasProps {
  map: PublicMapState
  isReadOnly: boolean
  mapId?: string
  secret?: string
  selectedTokenId?: string | null
  onTokenSelect?: (id: string | null) => void
}

function svgPoint(e: React.PointerEvent, svgEl: SVGSVGElement, viewBox: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  const rect = svgEl.getBoundingClientRect()
  const scaleX = viewBox.w / rect.width
  const scaleY = viewBox.h / rect.height
  return { x: (e.clientX - rect.left) * scaleX + viewBox.x, y: (e.clientY - rect.top) * scaleY + viewBox.y }
}

function snapToGrid(px: number, gridSize: number): number {
  return Math.floor(px / gridSize)
}

export function MapCanvas({ map, isReadOnly, mapId, secret, selectedTokenId, onTokenSelect }: MapCanvasProps) {
  const [activeTool, setActiveTool] = useState<MapTool>('pointer')
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 750 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
  const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null)
  const [rulerEnd, setRulerEnd] = useState<{ x: number; y: number } | null>(null)
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 1.1 : 0.9
      setViewBox(v => {
        const newW = Math.max(200, Math.min(5000, v.w * factor))
        const newH = Math.max(150, Math.min(3750, v.h * factor))
        return { ...v, w: newW, h: newH }
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const gs = map.grid.size
  const totalW = map.background ? map.background.width : map.fog.cols * gs
  const totalH = map.background ? map.background.height : map.fog.rows * gs

  const gridLines: React.ReactElement[] = []
  for (let x = 0; x <= totalW; x += gs) {
    gridLines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={totalH} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />)
  }
  for (let y = 0; y <= totalH; y += gs) {
    gridLines.push(<line key={`h${y}`} x1={0} y1={y} x2={totalW} y2={y} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />)
  }

  function handleTokenPointerDown(e: React.PointerEvent, tokenId: string) {
    if (!svgRef.current) return
    e.stopPropagation()
    svgRef.current.setPointerCapture(e.pointerId)
    setDraggingTokenId(tokenId)
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (!svgRef.current) return
    const pt = svgPoint(e, svgRef.current, viewBox)

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (activeTool === 'pointer') {
      onTokenSelect?.(null)
      return
    }

    if (activeTool === 'ruler') {
      setRulerStart(pt)
      setRulerEnd(pt)
      return
    }

    if (activeTool === 'fog-hide' || activeTool === 'fog-reveal') {
      const col = snapToGrid(pt.x, gs)
      const row = snapToGrid(pt.y, gs)
      useMapStore.getState().paintFog(col, row, activeTool === 'fog-hide')
      if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      setDrawStart(pt)
      return
    }

    setDrawStart(pt)
    setDrawCurrent(pt)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!svgRef.current) return
    const pt = svgPoint(e, svgRef.current, viewBox)

    if (draggingTokenId) {
      useMapStore.getState().moveToken(draggingTokenId, { x: snapToGrid(pt.x, gs), y: snapToGrid(pt.y, gs) })
      if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      return
    }

    if (isPanning && panStart) {
      const dx = (e.clientX - panStart.x) * (viewBox.w / svgRef.current.clientWidth)
      const dy = (e.clientY - panStart.y) * (viewBox.h / svgRef.current.clientHeight)
      setViewBox(v => ({ ...v, x: v.x - dx, y: v.y - dy }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    if (activeTool === 'ruler' && rulerStart) {
      setRulerEnd(pt)
      return
    }

    if (activeTool === 'fog-hide' || activeTool === 'fog-reveal') {
      if (drawStart && e.buttons === 1) {
        const col = snapToGrid(pt.x, gs)
        const row = snapToGrid(pt.y, gs)
        useMapStore.getState().paintFog(col, row, activeTool === 'fog-hide')
        if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      }
      return
    }

    if (drawStart) setDrawCurrent(pt)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!svgRef.current) return
    const pt = svgPoint(e, svgRef.current, viewBox)

    if (draggingTokenId) {
      setDraggingTokenId(null)
      return
    }

    if (isPanning) {
      setIsPanning(false)
      setPanStart(null)
      return
    }

    if (activeTool === 'ruler') {
      setRulerStart(null)
      setRulerEnd(null)
      return
    }

    if (!drawStart || !drawCurrent) {
      setDrawStart(null)
      return
    }

    const gs2 = map.grid.size
    const id = crypto.randomUUID()

    if (activeTool === 'rect') {
      const x = Math.min(drawStart.x, pt.x) / gs2
      const y = Math.min(drawStart.y, pt.y) / gs2
      const w = Math.abs(pt.x - drawStart.x) / gs2
      const h = Math.abs(pt.y - drawStart.y) / gs2
      if (w > 0.1 && h > 0.1) {
        useMapStore.getState().addShape({ id, kind: 'rect', x, y, w, h, stroke: '#00daf3' })
        if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      }
    } else if (activeTool === 'circle') {
      const cx = drawStart.x / gs2
      const cy = drawStart.y / gs2
      const r = Math.sqrt(Math.pow(pt.x - drawStart.x, 2) + Math.pow(pt.y - drawStart.y, 2)) / gs2
      if (r > 0.1) {
        useMapStore.getState().addShape({ id, kind: 'circle', cx, cy, r, stroke: '#00daf3' })
        if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      }
    } else if (activeTool === 'line') {
      const x1 = drawStart.x / gs2
      const y1 = drawStart.y / gs2
      const x2 = pt.x / gs2
      const y2 = pt.y / gs2
      if (Math.abs(x2 - x1) > 0.1 || Math.abs(y2 - y1) > 0.1) {
        useMapStore.getState().addShape({ id, kind: 'line', x1, y1, x2, y2, stroke: '#ffffff' })
        if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      }
    } else if (activeTool === 'label') {
      const text = window.prompt('Etichetta:')
      if (text) {
        useMapStore.getState().addLabel({ id, x: drawStart.x / gs2, y: drawStart.y / gs2, text, color: '#e9c349' })
        if (mapId && secret) useMapStore.getState().scheduleSync(mapId, secret)
      }
    }

    setDrawStart(null)
    setDrawCurrent(null)
  }

  return (
    <div className="relative w-full h-full bg-surface flex flex-col">
      {!isReadOnly && (
        <ShapeToolbar activeTool={activeTool} onToolChange={setActiveTool} />
      )}
      <div className="relative flex-1 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          style={{ cursor: isPanning ? 'grabbing' : activeTool === 'pointer' ? 'default' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {map.background && (
            <image
              href={map.background.url}
              x={0}
              y={0}
              width={map.background.width}
              height={map.background.height}
            />
          )}
          <g>{gridLines}</g>
          <g>
            {map.shapes.map(s => {
              if (s.kind === 'rect') {
                return (
                  <rect
                    key={s.id}
                    x={s.x * gs}
                    y={s.y * gs}
                    width={s.w * gs}
                    height={s.h * gs}
                    stroke={s.stroke}
                    fill={s.fill ?? 'none'}
                    strokeWidth={2}
                  />
                )
              }
              if (s.kind === 'circle') {
                return (
                  <circle
                    key={s.id}
                    cx={s.cx * gs}
                    cy={s.cy * gs}
                    r={s.r * gs}
                    stroke={s.stroke}
                    fill={s.fill ?? 'none'}
                    strokeWidth={2}
                  />
                )
              }
              return (
                <line
                  key={s.id}
                  x1={s.x1 * gs}
                  y1={s.y1 * gs}
                  x2={s.x2 * gs}
                  y2={s.y2 * gs}
                  stroke={s.stroke}
                  strokeWidth={2}
                />
              )
            })}
          </g>
          <g>
            {map.labels.map(l => (
              <text
                key={l.id}
                x={l.x * gs}
                y={l.y * gs}
                fill={l.color}
                fontSize={14}
                fontFamily="Space Grotesk"
              >
                {l.text}
              </text>
            ))}
          </g>
          <FogLayer fog={map.fog} gridSize={gs} isReadOnly={isReadOnly} />
          {map.tokens.map(token => (
            <g key={token.id} transform={`translate(${token.pos.x * gs + gs / 2}, ${token.pos.y * gs + gs / 2})`}>
              <TokenNode
                token={token}
                gridSize={gs}
                isReadOnly={isReadOnly}
                isSelected={selectedTokenId === token.id}
                onPointerDown={activeTool === 'pointer' && !isReadOnly ? (e) => handleTokenPointerDown(e, token.id) : undefined}
                onClick={activeTool === 'pointer' ? () => onTokenSelect?.(token.id) : undefined}
              />
            </g>
          ))}
          {drawStart && drawCurrent && activeTool === 'rect' && (
            <rect
              x={Math.min(drawStart.x, drawCurrent.x)}
              y={Math.min(drawStart.y, drawCurrent.y)}
              width={Math.abs(drawCurrent.x - drawStart.x)}
              height={Math.abs(drawCurrent.y - drawStart.y)}
              stroke="#00daf3"
              fill="rgba(0,218,243,0.1)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}
          {drawStart && drawCurrent && activeTool === 'circle' && (
            <circle
              cx={drawStart.x}
              cy={drawStart.y}
              r={Math.sqrt(Math.pow(drawCurrent.x - drawStart.x, 2) + Math.pow(drawCurrent.y - drawStart.y, 2))}
              stroke="#00daf3"
              fill="rgba(0,218,243,0.1)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}
          {drawStart && drawCurrent && activeTool === 'line' && (
            <line
              x1={drawStart.x}
              y1={drawStart.y}
              x2={drawCurrent.x}
              y2={drawCurrent.y}
              stroke="#ffffff"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
          )}
          <RulerOverlay startPx={rulerStart} endPx={rulerEnd} gridSize={gs} />
        </svg>
      </div>
    </div>
  )
}
