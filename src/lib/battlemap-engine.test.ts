import { describe, it, expect } from 'vitest'
import {
  FACING_DIRECTIONS,
  type GridConfig,
  type MapFogState,
  type MapToken,
  type MapWallSegment,
  type TacticalMapState,
} from '../types/map'
import {
  canStepToken,
  cellKey,
  computeEnemyHealthStatus,
  computePartyVisibility,
  computeReachableCellsPF1e,
  computeTokenVisionPolygon,
  computeTokenVisibleCells,
  facingFromDelta,
  filterMapStateForPlayer,
  isEnemyVisibleToParty,
  parseCellKey,
  rotateFacingStep,
  snapFacingDeg,
  validatePlayerTokenMove,
} from './battlemap-engine'

const baseGrid: GridConfig = {
  cols: 16,
  rows: 12,
  offsetX: 0,
  offsetY: 0,
  cellSizePx: 64,
  gridOpacity: 0.35,
  visionRangeCells: 6,
  coneAngleDeg: 90,
}

const emptyFog: MapFogState = {
  exploredCells: [],
  manualRevealedCells: [],
  manualHiddenCells: [],
}

function makePc(overrides: Partial<MapToken> = {}): MapToken {
  return {
    id: 'pc_shotrix',
    type: 'pc',
    characterId: 'shotrix-blackburn',
    name: 'Shotrix',
    label: 'SH',
    color: 'cyan',
    col: 5,
    row: 5,
    size: 1,
    facingDeg: 0,
    speedFeet: 30,
    ...overrides,
  }
}

describe('battlemap-engine — 8-direction vision cones & Line of Sight', () => {
  it('supports all 8 cardinal/diagonal facing directions at 45° steps', () => {
    expect(FACING_DIRECTIONS).toHaveLength(8)
    expect(rotateFacingStep(0, 1)).toBe(45)
    expect(rotateFacingStep(0, -1)).toBe(315)
    expect(rotateFacingStep(270, 2)).toBe(0)
    expect(snapFacingDeg(44)).toBe(45)
    expect(snapFacingDeg(-90)).toBe(270)
    expect(facingFromDelta(1, 0)).toBe(0)
    expect(facingFromDelta(0, -1)).toBe(270)
    expect(facingFromDelta(-1, 1)).toBe(135)
    expect(parseCellKey('4,9')).toEqual({ col: 4, row: 9 })
    expect(parseCellKey('invalid')).toBeNull()
  })

  it('projects a 90° vision cone strictly in the facing direction up to visionRangeCells', () => {
    // Facing East (0°): sees East (+col), NOT West (-col) or directly North/South behind cone
    const eastPc = makePc({ col: 5, row: 5, facingDeg: 0 })
    const eastVis = computeTokenVisibleCells(eastPc, baseGrid, [])

    expect(eastVis.has(cellKey(5, 5))).toBe(true) // own cell always visible
    expect(eastVis.has(cellKey(8, 5))).toBe(true) // 3 cells East
    expect(eastVis.has(cellKey(11, 5))).toBe(true) // 6 cells East (at max range)
    expect(eastVis.has(cellKey(12, 5))).toBe(false) // 7 cells East (beyond range 6)
    expect(eastVis.has(cellKey(4, 5))).toBe(false) // behind (West)
    expect(eastVis.has(cellKey(5, 3))).toBe(false) // 90° North outside 45° half-cone

    // Rotate to North (270°): sees North (-row), NOT East or South
    const northPc = makePc({ col: 5, row: 5, facingDeg: 270 })
    const northVis = computeTokenVisibleCells(northPc, baseGrid, [])
    expect(northVis.has(cellKey(5, 2))).toBe(true)
    expect(northVis.has(cellKey(5, 6))).toBe(false)
    expect(northVis.has(cellKey(8, 5))).toBe(false)

    // Rotate to SE diagonal (45°): sees SE (+col, +row)
    const sePc = makePc({ col: 5, row: 5, facingDeg: 45 })
    const seVis = computeTokenVisibleCells(sePc, baseGrid, [])
    expect(seVis.has(cellKey(8, 8))).toBe(true)
    expect(seVis.has(cellKey(7, 5))).toBe(true)
    expect(seVis.has(cellKey(3, 3))).toBe(false)
  })

  it('blocks vision behind walls and closed doors without corner light leaks, and reveals when door opens', () => {
    // Sealed room [0..5] x [0..5] with walls meeting at vertex (5, 5)
    const wallsClosed: MapWallSegment[] = [
      { id: 'w_north_east', x1: 5, y1: 0, x2: 5, y2: 2, kind: 'wall' },
      { id: 'd_east', x1: 5, y1: 2, x2: 5, y2: 3, kind: 'door', open: false },
      { id: 'w_south_east', x1: 5, y1: 3, x2: 5, y2: 5, kind: 'wall' },
      { id: 'w_bottom', x1: 0, y1: 5, x2: 5, y2: 5, kind: 'wall' },
    ]

    const cornerLooker = makePc({ col: 3, row: 3, facingDeg: 45 })
    const visCorner = computeTokenVisibleCells(cornerLooker, baseGrid, wallsClosed)
    // Inside room visible, outside corner (5,5)/(6,6) must have ZERO light leak
    expect(visCorner.has(cellKey(4, 4))).toBe(true)
    expect(visCorner.has(cellKey(5, 5))).toBe(false)
    expect(visCorner.has(cellKey(6, 6))).toBe(false)

    // Facing East right at the closed door (5, 2)-(5, 3) from (3, 2)
    const doorLooker = makePc({ col: 3, row: 2, facingDeg: 0 })
    const visClosed = computeTokenVisibleCells(doorLooker, baseGrid, wallsClosed)
    expect(visClosed.has(cellKey(4, 2))).toBe(true)
    expect(visClosed.has(cellKey(5, 2))).toBe(false)
    expect(visClosed.has(cellKey(6, 2))).toBe(false)

    // Master opens the door -> light pours through doorway into (5, 2) and (6, 2)
    const wallsOpened = wallsClosed.map((w) => (w.id === 'd_east' ? { ...w, open: true } : w))
    const visOpen = computeTokenVisibleCells(doorLooker, baseGrid, wallsOpened)
    expect(visOpen.has(cellKey(5, 2))).toBe(true)
    expect(visOpen.has(cellKey(6, 2))).toBe(true)

    const poly = computeTokenVisionPolygon(doorLooker, baseGrid, wallsOpened, 48)
    expect(poly.length).toBe(50)
  })
})

describe('battlemap-engine — Shared Party Fog of War & Master Overrides', () => {
  it('merges cones of all allied PCs/companions, preserves explored shroud, and applies Master overrides', () => {
    const shotrix = makePc({ id: 'pc_1', col: 2, row: 2, facingDeg: 0 })
    const salem: MapToken = {
      id: 'comp_salem',
      type: 'companion',
      characterId: 'mazikeen-noctis',
      companionId: 'salem',
      name: 'Salem',
      label: 'SA',
      color: 'magenta',
      col: 2,
      row: 8,
      size: 1,
      facingDeg: 90,
    }

    const step1 = computePartyVisibility([shotrix, salem], baseGrid, [], emptyFog)
    expect(step1.visibleSet.has(cellKey(5, 2))).toBe(true) // seen by Shotrix
    expect(step1.visibleSet.has(cellKey(2, 10))).toBe(true) // seen by Salem

    // Shotrix rotates away to South (90°): (5, 2) is no longer visible now, but stays in exploredSet!
    const rotatedShotrix = { ...shotrix, facingDeg: 90 as const }
    const step2 = computePartyVisibility([rotatedShotrix, salem], baseGrid, [], {
      exploredCells: step1.exploredCells,
      manualRevealedCells: [cellKey(14, 10)],
      manualHiddenCells: [cellKey(2, 10)],
    })

    expect(step2.visibleSet.has(cellKey(5, 2))).toBe(false)
    expect(step2.exploredSet.has(cellKey(5, 2))).toBe(true) // dim shroud memory preserved!
    expect(step2.visibleSet.has(cellKey(14, 10))).toBe(true) // Master reveal override
    expect(step2.visibleSet.has(cellKey(2, 10))).toBe(false) // Master hide override
    expect(step2.exploredSet.has(cellKey(2, 10))).toBe(false)
  })
})

describe('battlemap-engine — PF1e 1-2-1-2 Movement, Collisions & Enemy Redaction', () => {
  it('calculates PF1e 1-2-1-2 diagonal movement costs accurately for 20ft, 30ft, and 40ft speeds', () => {
    const pc30 = makePc({ col: 5, row: 5, speedFeet: 30 }) // 6 cells max
    const reach30 = computeReachableCellsPF1e(pc30, baseGrid, [])

    // 1st diagonal = 1 cell (5ft), 2nd diagonal = +2 (3 cells / 15ft), 3rd = +1 (4 cells / 20ft), 4th = +2 (6 cells / 30ft)
    expect(reach30.get(cellKey(6, 6))).toBe(1)
    expect(reach30.get(cellKey(7, 7))).toBe(3)
    expect(reach30.get(cellKey(8, 8))).toBe(4)
    expect(reach30.get(cellKey(9, 9))).toBe(6)
    expect(reach30.has(cellKey(10, 10))).toBe(false) // 5th diagonal = 7 cells > 6

    // Halfling Mariano (20 ft = 4 cells)
    const mariano = makePc({ col: 5, row: 5, speedFeet: 20 })
    const reach20 = computeReachableCellsPF1e(mariano, baseGrid, [])
    expect(reach20.has(cellKey(9, 5))).toBe(true) // 4 cells orthogonal
    expect(reach20.has(cellKey(10, 5))).toBe(false) // 5 cells > 4

    // Monk Agelmund (40 ft = 8 cells)
    const agelmund = makePc({ col: 5, row: 5, speedFeet: 40 })
    const reach40 = computeReachableCellsPF1e(agelmund, baseGrid, [])
    expect(reach40.has(cellKey(13, 5))).toBe(true) // 8 cells East
  })

  it('allows players to move any allied token around open corridors, while blocking walls, closed doors, and enemy moves', () => {
    // Vertical wall at x=5 from y=0..12 with a closed door at y=4..5
    const sealedWalls: MapWallSegment[] = [
      { id: 'w1', x1: 5, y1: 0, x2: 5, y2: 4, kind: 'wall' },
      { id: 'd1', x1: 5, y1: 4, x2: 5, y2: 5, kind: 'door', open: false },
      { id: 'w2', x1: 5, y1: 5, x2: 5, y2: 12, kind: 'wall' },
    ]

    const mazikeen = makePc({ id: 'pc_maze', characterId: 'mazikeen-noctis', col: 3, row: 4 })
    const blockedRes = validatePlayerTokenMove(mazikeen, 6, 4, baseGrid, sealedWalls)
    expect(blockedRes.ok).toBe(false)
    expect(blockedRes.reason).toBe('blocked_by_wall')

    // Open the door -> path (3,4)->(4,4)->(5,4)->(6,4) succeeds!
    const openWalls = sealedWalls.map((w) => (w.id === 'd1' ? { ...w, open: true } : w))
    const allowedRes = validatePlayerTokenMove(mazikeen, 6, 4, baseGrid, openWalls)
    expect(allowedRes.ok).toBe(true)
    expect(allowedRes.distanceFeet).toBe(15)

    // Hard corner diagonal cut past wall endpoint is blocked by PF1e rules
    const cornerWall: MapWallSegment[] = [{ id: 'wc', x1: 4, y1: 4, x2: 4, y2: 8, kind: 'wall' }]
    expect(canStepToken(3, 4, 4, 3, 1, baseGrid, cornerWall)).toBe(false)

    // Moving an enemy token as a player is strictly forbidden
    const goblin: MapToken = {
      id: 'en_1',
      type: 'enemy',
      name: 'Goblin',
      label: 'G1',
      color: 'crimson',
      col: 7,
      row: 4,
      size: 1,
      facingDeg: 180,
      currentHp: 6,
      maxHp: 6,
    }
    const enemyMove = validatePlayerTokenMove(goblin, 8, 4, baseGrid, [])
    expect(enemyMove.ok).toBe(false)
    expect(enemyMove.reason).toBe('forbidden_token_type')
  })

  it('filters unseen and stealth enemies from player view and redacts HP to healthStatus', () => {
    expect(computeEnemyHealthStatus(20, 20)).toBe('healthy')
    expect(computeEnemyHealthStatus(9, 20)).toBe('wounded')
    expect(computeEnemyHealthStatus(4, 20)).toBe('critical')
    expect(computeEnemyHealthStatus(0, 20)).toBe('defeated')

    const pc = makePc({ col: 2, row: 2, facingDeg: 0 }) // sees East
    const seenOrc: MapToken = {
      id: 'en_orc',
      type: 'enemy',
      name: 'Orco',
      label: 'OR',
      color: 'crimson',
      col: 5,
      row: 2,
      size: 2, // 2x2 Large
      facingDeg: 180,
      currentHp: 8,
      maxHp: 20,
      isHidden: false,
    }
    const stealthAssassin: MapToken = {
      id: 'en_stealth',
      type: 'enemy',
      name: 'Assassino',
      label: 'AS',
      color: 'violet',
      col: 4,
      row: 2, // right inside cone, but isHidden = true!
      size: 1,
      facingDeg: 180,
      currentHp: 30,
      maxHp: 30,
      isHidden: true,
    }
    const behindSkeleton: MapToken = {
      id: 'en_skel',
      type: 'enemy',
      name: 'Scheletro',
      label: 'SK',
      color: 'amber',
      col: 0,
      row: 10, // outside cone
      size: 1,
      facingDeg: 0,
      currentHp: 12,
      maxHp: 12,
      isHidden: false,
    }

    const fullMap: TacticalMapState = {
      id: 'map_1',
      name: 'Cripta',
      isActive: true,
      imageHash: 'blank',
      imageWidth: 1024,
      imageHeight: 768,
      grid: baseGrid,
      walls: [],
      tokens: [pc, seenOrc, stealthAssassin, behindSkeleton],
      fog: emptyFog,
      pings: [],
      updatedAt: 1000,
    }

    const playerView = filterMapStateForPlayer(fullMap)
    const enemyTokens = playerView.tokens.filter((t) => t.type === 'enemy')
    expect(enemyTokens).toHaveLength(1)
    expect(enemyTokens[0].id).toBe('en_orc')
    expect(enemyTokens[0].healthStatus).toBe('wounded')
    expect(enemyTokens[0].currentHp).toBeUndefined()
    expect(enemyTokens[0].maxHp).toBeUndefined()
    expect(enemyTokens[0].isHidden).toBeUndefined()
    expect(isEnemyVisibleToParty(stealthAssassin, new Set([cellKey(4, 2)]))).toBe(false)
  })
})
