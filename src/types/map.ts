export type FacingDirectionDeg = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315

export const FACING_DIRECTIONS: readonly FacingDirectionDeg[] = [
  270, // N
  315, // NE
  0,   // E
  45,  // SE
  90,  // S
  135, // SW
  180, // W
  225, // NW
] as const

export type TokenSizeCells = 1 | 2 | 3

export type MapTokenType = 'pc' | 'companion' | 'enemy'

export type TokenAccentColor = 'cyan' | 'magenta' | 'crimson' | 'violet' | 'amber' | 'emerald'

export type EnemyHealthStatus = 'healthy' | 'wounded' | 'critical' | 'defeated'

export interface GridConfig {
  cols: number
  rows: number
  offsetX: number
  offsetY: number
  cellSizePx: number
  gridOpacity: number
  /** Uniform vision cone range in grid cells set by the Master for this map. */
  visionRangeCells: number
  /** Fixed vision cone aperture in degrees (default 90). */
  coneAngleDeg: number
}

export type MapWallKind = 'wall' | 'door'

/**
 * Wall or door segment expressed in grid coordinates where cell `(col, row)`
 * spans `[col, col + 1] x [row, row + 1]`.
 */
export interface MapWallSegment {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  kind: MapWallKind
  /** Only meaningful when `kind === 'door'`. Open doors allow sight and movement. */
  open?: boolean
}

export interface MapToken {
  id: string
  type: MapTokenType
  /** Character ID for `pc` tokens or owner character ID for `companion` tokens. */
  characterId?: string
  companionId?: string
  name: string
  label: string
  color: TokenAccentColor
  col: number
  row: number
  size: TokenSizeCells
  facingDeg: FacingDirectionDeg
  /** Base movement speed in feet (e.g. 30 = 6 cells). */
  speedFeet?: number
  /** Master-only exact HP tracking for enemies. Stripped in player payloads. */
  currentHp?: number
  /** Master-only max HP tracking for enemies. Stripped in player payloads. */
  maxHp?: number
  /** Master stealth/invisibility override for enemies. */
  isHidden?: boolean
  /** Redacted health tier exposed to players for visible enemies. */
  healthStatus?: EnemyHealthStatus
}

export interface MapFogState {
  /** Canonical `"col,row"` keys explored by the party. */
  exploredCells: string[]
  /** Canonical `"col,row"` keys manually revealed by the Master. */
  manualRevealedCells: string[]
  /** Canonical `"col,row"` keys manually re-hidden by the Master. */
  manualHiddenCells: string[]
}

export interface MapPing {
  id: string
  col: number
  row: number
  senderName: string
  color: 'cyan' | 'magenta' | 'amber'
  createdAt: number
}

export interface TacticalMapSummary {
  id: string
  name: string
  isActive: boolean
  cols: number
  rows: number
  tokenCount: number
  enemyCount: number
  wallCount: number
  createdAt: number
  updatedAt: number
}

export interface TacticalMapState {
  id: string
  name: string
  isActive: boolean
  /** Hash/fingerprint of `imageData` so clients fetch & cache the image once. */
  imageHash: string
  /** Optional inline image data URL when requested with `includeImage=1`. */
  imageData?: string
  imageWidth: number
  imageHeight: number
  grid: GridConfig
  walls: MapWallSegment[]
  tokens: MapToken[]
  fog: MapFogState
  pings: MapPing[]
  updatedAt: number
}

export type PlayerMapAction =
  | {
      action: 'moveToken'
      mapId: string
      tokenId: string
      col: number
      row: number
      facingDeg?: FacingDirectionDeg
    }
  | {
      action: 'rotateToken'
      mapId: string
      tokenId: string
      facingDeg: FacingDirectionDeg
    }
  | {
      action: 'sendPing'
      mapId: string
      col: number
      row: number
      senderName: string
      color?: 'cyan' | 'magenta' | 'amber'
    }
