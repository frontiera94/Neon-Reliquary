import {
  FACING_DIRECTIONS,
  type EnemyHealthStatus,
  type FacingDirectionDeg,
  type GridConfig,
  type MapFogState,
  type MapToken,
  type MapWallSegment,
  type TacticalMapState,
  type TokenSizeCells,
} from '../types/map'

export interface GridCell {
  col: number
  row: number
}

export interface Point2D {
  x: number
  y: number
}

export interface PartyVisibilityResult {
  visibleCells: string[]
  exploredCells: string[]
  visibleSet: Set<string>
  exploredSet: Set<string>
}

export interface MoveValidationResult {
  ok: boolean
  reason?: 'forbidden_token_type' | 'out_of_bounds' | 'blocked_by_wall'
  distanceCells?: number
  distanceFeet?: number
  path?: GridCell[]
}

const EPS = 1e-7

export function cellKey(col: number, row: number): string {
  return `${col},${row}`
}

export function parseCellKey(key: string): GridCell | null {
  const parts = key.split(',')
  if (parts.length !== 2) return null
  const col = Number(parts[0])
  const row = Number(parts[1])
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null
  return { col, row }
}

export function isCellInBounds(col: number, row: number, cols: number, rows: number): boolean {
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 && col < cols && row < rows
}

export function isTokenInBounds(
  col: number,
  row: number,
  size: TokenSizeCells,
  cols: number,
  rows: number
): boolean {
  return (
    Number.isInteger(col) &&
    Number.isInteger(row) &&
    col >= 0 &&
    row >= 0 &&
    col + size <= cols &&
    row + size <= rows
  )
}

export function getTokenOccupiedCells(
  token: Pick<MapToken, 'col' | 'row' | 'size'>
): GridCell[] {
  const cells: GridCell[] = []
  for (let dr = 0; dr < token.size; dr++) {
    for (let dc = 0; dc < token.size; dc++) {
      cells.push({ col: token.col + dc, row: token.row + dr })
    }
  }
  return cells
}

export function getTokenCenter(token: Pick<MapToken, 'col' | 'row' | 'size'>): Point2D {
  return {
    x: token.col + token.size / 2,
    y: token.row + token.size / 2,
  }
}

export function normalizeDeg(deg: number): number {
  const mod = deg % 360
  return mod < 0 ? mod + 360 : mod
}

export function shortestAngleDiffDeg(a: number, b: number): number {
  const diff = normalizeDeg(a - b)
  return diff > 180 ? diff - 360 : diff
}

export function snapFacingDeg(deg: number): FacingDirectionDeg {
  const norm = normalizeDeg(deg)
  const snapped = (Math.round(norm / 45) * 45) % 360
  return snapped as FacingDirectionDeg
}

export function rotateFacingStep(
  current: FacingDirectionDeg,
  stepsClockwise: number
): FacingDirectionDeg {
  const next = normalizeDeg(current + stepsClockwise * 45)
  return snapFacingDeg(next)
}

export function facingFromDelta(
  dCol: number,
  dRow: number,
  fallback: FacingDirectionDeg = 90
): FacingDirectionDeg {
  if (dCol === 0 && dRow === 0) return fallback
  const deg = (Math.atan2(dRow, dCol) * 180) / Math.PI
  return snapFacingDeg(deg)
}

export function isValidFacingDeg(value: unknown): value is FacingDirectionDeg {
  return typeof value === 'number' && (FACING_DIRECTIONS as readonly number[]).includes(value)
}

export function getBlockingSegments(walls: readonly MapWallSegment[]): MapWallSegment[] {
  return walls.filter((w) => w.kind === 'wall' || !w.open)
}

/**
 * Closed-interval segment intersection between AB and CD.
 * Treats touching endpoints (`u in [0, 1]`, `t in [0, 1]`) as blocking so rays
 * cannot leak diagonally between two orthogonal walls meeting at a grid vertex.
 */
export function segmentsIntersectClosed(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const rX = bx - ax
  const rY = by - ay
  const sX = dx - cx
  const sY = dy - cy

  const denom = rX * sY - rY * sX
  const qpX = cx - ax
  const qpY = cy - ay
  const qpCrossR = qpX * rY - qpY * rX

  if (Math.abs(denom) < 1e-9) {
    if (Math.abs(qpCrossR) > 1e-7) return false
    const rLenSq = rX * rX + rY * rY
    if (rLenSq < 1e-12) return false
    const t0 = (qpX * rX + qpY * rY) / rLenSq
    const t1 = ((dx - ax) * rX + (dy - ay) * rY) / rLenSq
    const minT = Math.min(t0, t1)
    const maxT = Math.max(t0, t1)
    return maxT >= -EPS && minT <= 1 + EPS
  }

  const t = (qpX * sY - qpY * sX) / denom
  const u = (qpX * rY - qpY * rX) / denom

  return t >= 1e-5 && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS
}

export function isSegmentBlocked(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  blockingWalls: readonly MapWallSegment[]
): boolean {
  for (const seg of blockingWalls) {
    if (segmentsIntersectClosed(ax, ay, bx, by, seg.x1, seg.y1, seg.x2, seg.y2)) {
      return true
    }
  }
  return false
}

function raySegmentHitDistance(
  ox: number,
  oy: number,
  dirX: number,
  dirY: number,
  maxDist: number,
  seg: MapWallSegment
): number | null {
  const bx = ox + dirX * maxDist
  const by = oy + dirY * maxDist
  const rX = bx - ox
  const rY = by - oy
  const sX = seg.x2 - seg.x1
  const sY = seg.y2 - seg.y1

  const denom = rX * sY - rY * sX
  if (Math.abs(denom) < 1e-9) return null

  const qpX = seg.x1 - ox
  const qpY = seg.y1 - oy
  const t = (qpX * sY - qpY * sX) / denom
  const u = (qpX * rY - qpY * rX) / denom

  if (t > 1e-5 && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS) {
    return Math.min(maxDist, t * maxDist)
  }
  return null
}

/**
 * Computes a smooth 2D visibility cone polygon in grid coordinates for canvas rendering.
 */
export function computeTokenVisionPolygon(
  token: Pick<MapToken, 'col' | 'row' | 'size' | 'facingDeg'>,
  grid: Pick<GridConfig, 'visionRangeCells' | 'coneAngleDeg'>,
  walls: readonly MapWallSegment[],
  numRays = 96
): Point2D[] {
  const center = getTokenCenter(token)
  const blocking = getBlockingSegments(walls)
  const range = Math.max(1, grid.visionRangeCells)
  const coneDeg = grid.coneAngleDeg > 0 ? grid.coneAngleDeg : 90
  const halfCone = coneDeg / 2

  const points: Point2D[] = [{ x: center.x, y: center.y }]
  const steps = Math.max(12, numRays)

  for (let i = 0; i <= steps; i++) {
    const angleDeg = token.facingDeg - halfCone + (coneDeg * i) / steps
    const rad = (angleDeg * Math.PI) / 180
    const dirX = Math.cos(rad)
    const dirY = Math.sin(rad)

    let closest = range
    for (const seg of blocking) {
      const hit = raySegmentHitDistance(center.x, center.y, dirX, dirY, range, seg)
      if (hit !== null && hit < closest) {
        closest = hit
      }
    }

    points.push({
      x: center.x + dirX * closest,
      y: center.y + dirY * closest,
    })
  }

  return points
}

const INNER_CELL_SAMPLES: readonly [number, number][] = [
  [0.24, 0.24],
  [0.76, 0.24],
  [0.24, 0.76],
  [0.76, 0.76],
]

/**
 * Computes the exact set of grid cells visible to a single allied token.
 */
export function computeTokenVisibleCells(
  token: Pick<MapToken, 'col' | 'row' | 'size' | 'facingDeg'>,
  grid: Pick<GridConfig, 'cols' | 'rows' | 'visionRangeCells' | 'coneAngleDeg'>,
  walls: readonly MapWallSegment[]
): Set<string> {
  const visible = new Set<string>()
  const occupied = getTokenOccupiedCells(token)
  const origins: Point2D[] = []

  for (const cell of occupied) {
    if (isCellInBounds(cell.col, cell.row, grid.cols, grid.rows)) {
      visible.add(cellKey(cell.col, cell.row))
      origins.push({ x: cell.col + 0.5, y: cell.row + 0.5 })
    }
  }

  if (origins.length === 0) return visible

  const blocking = getBlockingSegments(walls)
  const range = Math.max(1, grid.visionRangeCells)
  const coneDeg = grid.coneAngleDeg > 0 ? grid.coneAngleDeg : 90
  const halfCone = coneDeg / 2

  const minCol = Math.max(0, Math.floor(token.col - range - 1))
  const maxCol = Math.min(grid.cols - 1, Math.ceil(token.col + token.size + range + 1))
  const minRow = Math.max(0, Math.floor(token.row - range - 1))
  const maxRow = Math.min(grid.rows - 1, Math.ceil(token.row + token.size + range + 1))

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = cellKey(c, r)
      if (visible.has(key)) continue

      const cx = c + 0.5
      const cy = r + 0.5

      for (const origin of origins) {
        const dx = cx - origin.x
        const dy = cy - origin.y
        const dist = Math.hypot(dx, dy)
        if (dist > range + 0.08) continue

        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
        if (Math.abs(shortestAngleDiffDeg(angleDeg, token.facingDeg)) > halfCone + 0.5) {
          continue
        }

        // Primary check: direct center-to-center ray unobstructed
        if (!isSegmentBlocked(origin.x, origin.y, cx, cy, blocking)) {
          visible.add(key)
          break
        }

        // Open-corner fallback: require at least 2 inner sub-points within cone & range
        // to be unobstructed (never triggers across closed straight walls or closed corners).
        let clearCount = 0
        for (const [sx, sy] of INNER_CELL_SAMPLES) {
          const px = c + sx
          const py = r + sy
          const sdx = px - origin.x
          const sdy = py - origin.y
          if (Math.hypot(sdx, sdy) > range + 0.35) continue
          const sAngle = (Math.atan2(sdy, sdx) * 180) / Math.PI
          if (Math.abs(shortestAngleDiffDeg(sAngle, token.facingDeg)) > halfCone + 2) continue
          if (!isSegmentBlocked(origin.x, origin.y, px, py, blocking)) {
            clearCount++
            if (clearCount >= 2) break
          }
        }

        if (clearCount >= 2) {
          visible.add(key)
          break
        }
      }
    }
  }

  return visible
}

/**
 * Computes shared party visibility across all `pc` and `companion` tokens and merges
 * explored memory + Master manual fog overrides.
 */
export function computePartyVisibility(
  tokens: readonly MapToken[],
  grid: Pick<GridConfig, 'cols' | 'rows' | 'visionRangeCells' | 'coneAngleDeg'>,
  walls: readonly MapWallSegment[],
  fog: MapFogState
): PartyVisibilityResult {
  const rawVisible = new Set<string>()

  for (const token of tokens) {
    if (token.type !== 'pc' && token.type !== 'companion') continue
    const tokenVis = computeTokenVisibleCells(token, grid, walls)
    for (const k of tokenVis) {
      rawVisible.add(k)
    }
  }

  const manualHidden = new Set(fog.manualHiddenCells)
  const manualRevealed = new Set(fog.manualRevealedCells)

  const visibleSet = new Set<string>()
  for (const k of rawVisible) {
    if (!manualHidden.has(k)) visibleSet.add(k)
  }
  for (const k of manualRevealed) {
    const parsed = parseCellKey(k)
    if (parsed && isCellInBounds(parsed.col, parsed.row, grid.cols, grid.rows) && !manualHidden.has(k)) {
      visibleSet.add(k)
    }
  }

  const exploredSet = new Set<string>()
  for (const k of fog.exploredCells) {
    const parsed = parseCellKey(k)
    if (parsed && isCellInBounds(parsed.col, parsed.row, grid.cols, grid.rows) && !manualHidden.has(k)) {
      exploredSet.add(k)
    }
  }
  for (const k of visibleSet) {
    exploredSet.add(k)
  }

  return {
    visibleCells: Array.from(visibleSet),
    exploredCells: Array.from(exploredSet),
    visibleSet,
    exploredSet,
  }
}

/**
 * Checks whether a single 1-cell step `(fromCol, fromRow) -> (toCol, toRow)` for a token
 * of `size` is unobstructed by map boundaries, walls, and closed doors.
 * Enforces PF1e hard-corner diagonal rule (cannot cut diagonally across wall corners).
 */
export function canStepToken(
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
  size: TokenSizeCells,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
  walls: readonly MapWallSegment[]
): boolean {
  const dCol = toCol - fromCol
  const dRow = toRow - fromRow
  if (Math.abs(dCol) > 1 || Math.abs(dRow) > 1) return false
  if (dCol === 0 && dRow === 0) return true
  if (!isTokenInBounds(fromCol, fromRow, size, grid.cols, grid.rows)) return false
  if (!isTokenInBounds(toCol, toRow, size, grid.cols, grid.rows)) return false

  const blocking = getBlockingSegments(walls)

  for (let sr = 0; sr < size; sr++) {
    for (let sc = 0; sc < size; sc++) {
      const c1 = fromCol + sc
      const r1 = fromRow + sr
      const c2 = toCol + sc
      const r2 = toRow + sr

      const x1 = c1 + 0.5
      const y1 = r1 + 0.5
      const x2 = c2 + 0.5
      const y2 = r2 + 0.5

      if (isSegmentBlocked(x1, y1, x2, y2, blocking)) {
        return false
      }

      // PF1e diagonal corner rule: moving diagonally requires both orthogonal corner paths clear
      if (dCol !== 0 && dRow !== 0) {
        const midAx = c2 + 0.5
        const midAy = r1 + 0.5
        const midBx = c1 + 0.5
        const midBy = r2 + 0.5
        if (
          isSegmentBlocked(x1, y1, midAx, midAy, blocking) ||
          isSegmentBlocked(midAx, midAy, x2, y2, blocking) ||
          isSegmentBlocked(x1, y1, midBx, midBy, blocking) ||
          isSegmentBlocked(midBx, midBy, x2, y2, blocking)
        ) {
          return false
        }
      }
    }
  }

  return true
}

const STEP_DIRS: readonly [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
]

interface PathNode {
  col: number
  row: number
  costCells: number
  diagParity: 0 | 1
}

function tokenOverlapsBlockedCells(
  col: number,
  row: number,
  size: TokenSizeCells,
  blockedCells?: ReadonlySet<string>
): boolean {
  if (!blockedCells || blockedCells.size === 0) return false
  for (let dr = 0; dr < size; dr++) {
    for (let dc = 0; dc < size; dc++) {
      if (blockedCells.has(cellKey(col + dc, row + dr))) return true
    }
  }
  return false
}

/**
 * Computes PF1e reachable cells (in 5ft cell units, using 1-2-1-2 alternating diagonals)
 * up to `maxCells` (derived from `speedFeet / 5`).
 */
export function computeReachableCellsPF1e(
  token: Pick<MapToken, 'col' | 'row' | 'size' | 'speedFeet'>,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
  walls: readonly MapWallSegment[],
  occupiedEnemyCells?: ReadonlySet<string>,
  overrideMaxCells?: number
): Map<string, number> {
  const speedFeet = token.speedFeet ?? 30
  const maxCells = overrideMaxCells ?? Math.max(1, Math.floor(speedFeet / 5))
  const bestStateCost = new Map<string, number>()
  const bestCellCost = new Map<string, number>()

  if (!isTokenInBounds(token.col, token.row, token.size, grid.cols, grid.rows)) {
    return bestCellCost
  }

  const startKey = cellKey(token.col, token.row)
  bestCellCost.set(startKey, 0)
  bestStateCost.set(`${token.col},${token.row},0`, 0)

  const queue: PathNode[] = [{ col: token.col, row: token.row, costCells: 0, diagParity: 0 }]

  while (queue.length > 0) {
    // Pop lowest-cost node
    let bestIdx = 0
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].costCells < queue[bestIdx].costCells) bestIdx = i
    }
    const curr = queue[bestIdx]
    queue[bestIdx] = queue[queue.length - 1]
    queue.pop()

    const stateKey = `${curr.col},${curr.row},${curr.diagParity}`
    const knownState = bestStateCost.get(stateKey)
    if (knownState !== undefined && curr.costCells > knownState) continue

    for (const [dc, dr] of STEP_DIRS) {
      const nextCol = curr.col + dc
      const nextRow = curr.row + dr
      const isDiag = dc !== 0 && dr !== 0
      const stepCost = isDiag ? (curr.diagParity === 1 ? 2 : 1) : 1
      const nextCost = curr.costCells + stepCost
      if (nextCost > maxCells) continue

      if (tokenOverlapsBlockedCells(nextCol, nextRow, token.size, occupiedEnemyCells)) {
        continue
      }
      if (!canStepToken(curr.col, curr.row, nextCol, nextRow, token.size, grid, walls)) {
        continue
      }

      const nextParity: 0 | 1 = isDiag ? (curr.diagParity === 0 ? 1 : 0) : curr.diagParity
      const nextStateKey = `${nextCol},${nextRow},${nextParity}`
      const prevStateCost = bestStateCost.get(nextStateKey)

      if (prevStateCost === undefined || nextCost < prevStateCost) {
        bestStateCost.set(nextStateKey, nextCost)
        const cKey = cellKey(nextCol, nextRow)
        const prevCellCost = bestCellCost.get(cKey)
        if (prevCellCost === undefined || nextCost < prevCellCost) {
          bestCellCost.set(cKey, nextCost)
        }
        queue.push({ col: nextCol, row: nextRow, costCells: nextCost, diagParity: nextParity })
      }
    }
  }

  return bestCellCost
}

/**
 * Validates whether a player on `/map` is allowed to move `token` to `(toCol, toRow)`.
 * Any player can move any allied `pc` or `companion` token, provided an unobstructed
 * path exists without crossing walls or closed doors. Players can never move `enemy` tokens.
 */
export function validatePlayerTokenMove(
  token: MapToken,
  toCol: number,
  toRow: number,
  grid: Pick<GridConfig, 'cols' | 'rows'>,
  walls: readonly MapWallSegment[]
): MoveValidationResult {
  if (token.type !== 'pc' && token.type !== 'companion') {
    return { ok: false, reason: 'forbidden_token_type' }
  }
  if (!isTokenInBounds(toCol, toRow, token.size, grid.cols, grid.rows)) {
    return { ok: false, reason: 'out_of_bounds' }
  }
  if (token.col === toCol && token.row === toRow) {
    return {
      ok: true,
      distanceCells: 0,
      distanceFeet: 0,
      path: [{ col: token.col, row: token.row }],
    }
  }

  // Dijkstra with PF1e 1-2-1-2 diagonal cost across the full grid
  const maxPossibleCost = grid.cols * grid.rows * 2
  const bestStateCost = new Map<string, number>()
  const parentMap = new Map<string, string>()

  const startState = `${token.col},${token.row},0`
  bestStateCost.set(startState, 0)
  const queue: PathNode[] = [{ col: token.col, row: token.row, costCells: 0, diagParity: 0 }]

  let foundEndState: string | null = null
  let foundCost = Infinity

  while (queue.length > 0) {
    let bestIdx = 0
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].costCells < queue[bestIdx].costCells) bestIdx = i
    }
    const curr = queue[bestIdx]
    queue[bestIdx] = queue[queue.length - 1]
    queue.pop()

    const currStateKey = `${curr.col},${curr.row},${curr.diagParity}`
    if (curr.col === toCol && curr.row === toRow) {
      foundEndState = currStateKey
      foundCost = curr.costCells
      break
    }

    const known = bestStateCost.get(currStateKey)
    if (known !== undefined && curr.costCells > known) continue

    for (const [dc, dr] of STEP_DIRS) {
      const nextCol = curr.col + dc
      const nextRow = curr.row + dr
      if (!canStepToken(curr.col, curr.row, nextCol, nextRow, token.size, grid, walls)) {
        continue
      }
      const isDiag = dc !== 0 && dr !== 0
      const stepCost = isDiag ? (curr.diagParity === 1 ? 2 : 1) : 1
      const nextCost = curr.costCells + stepCost
      if (nextCost > maxPossibleCost) continue

      const nextParity: 0 | 1 = isDiag ? (curr.diagParity === 0 ? 1 : 0) : curr.diagParity
      const nextStateKey = `${nextCol},${nextRow},${nextParity}`
      const prev = bestStateCost.get(nextStateKey)
      if (prev === undefined || nextCost < prev) {
        bestStateCost.set(nextStateKey, nextCost)
        parentMap.set(nextStateKey, currStateKey)
        queue.push({ col: nextCol, row: nextRow, costCells: nextCost, diagParity: nextParity })
      }
    }
  }

  if (!foundEndState) {
    return { ok: false, reason: 'blocked_by_wall' }
  }

  const path: GridCell[] = []
  let cursor: string | undefined = foundEndState
  while (cursor) {
    const [cStr, rStr] = cursor.split(',')
    path.push({ col: Number(cStr), row: Number(rStr) })
    cursor = parentMap.get(cursor)
  }
  path.reverse()

  return {
    ok: true,
    distanceCells: foundCost,
    distanceFeet: foundCost * 5,
    path,
  }
}

export function computeEnemyHealthStatus(
  currentHp: number | undefined,
  maxHp: number | undefined
): EnemyHealthStatus {
  const max = typeof maxHp === 'number' && maxHp > 0 ? maxHp : 10
  const cur = typeof currentHp === 'number' ? currentHp : max
  if (cur <= 0) return 'defeated'
  const ratio = cur / max
  if (ratio <= 0.25) return 'critical'
  if (ratio <= 0.5) return 'wounded'
  return 'healthy'
}

export function isEnemyVisibleToParty(
  enemy: MapToken,
  visibleCellSet: ReadonlySet<string>
): boolean {
  if (enemy.isHidden) return false
  const cells = getTokenOccupiedCells(enemy)
  return cells.some((c) => visibleCellSet.has(cellKey(c.col, c.row)))
}

/**
 * Produces a player-safe view of a tactical map:
 * 1. Updates `fog.exploredCells` with currently visible party cells.
 * 2. Strips unseen and `isHidden` enemy tokens.
 * 3. Redacts exact `currentHp` / `maxHp` / `isHidden` on visible enemies into `healthStatus`.
 */
export function filterMapStateForPlayer(map: TacticalMapState): TacticalMapState {
  const visibility = computePartyVisibility(map.tokens, map.grid, map.walls, map.fog)

  const filteredTokens: MapToken[] = []
  for (const tok of map.tokens) {
    if (tok.type === 'pc' || tok.type === 'companion') {
      filteredTokens.push({ ...tok })
      continue
    }
    if (isEnemyVisibleToParty(tok, visibility.visibleSet)) {
      const redacted: MapToken = {
        id: tok.id,
        type: 'enemy',
        name: tok.name,
        label: tok.label,
        color: tok.color,
        col: tok.col,
        row: tok.row,
        size: tok.size,
        facingDeg: tok.facingDeg,
        healthStatus: computeEnemyHealthStatus(tok.currentHp, tok.maxHp),
      }
      filteredTokens.push(redacted)
    }
  }

  return {
    ...map,
    tokens: filteredTokens,
    fog: {
      exploredCells: visibility.exploredCells,
      manualRevealedCells: [...map.fog.manualRevealedCells],
      manualHiddenCells: [...map.fog.manualHiddenCells],
    },
  }
}

export function snapGridCoordinate(value: number, step = 0.5): number {
  return Math.round(value / step) * step
}
