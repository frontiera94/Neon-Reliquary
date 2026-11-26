import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  FACING_DIRECTIONS,
  type FacingDirectionDeg,
  type GridConfig,
  type MapToken,
  type MapWallSegment,
  type TacticalMapState,
} from '../../src/types/map'
import {
  computePartyVisibility,
  filterMapStateForPlayer,
  validatePlayerTokenMove,
} from '../../src/lib/battlemap-engine'

const grid: GridConfig = {
  cols: 12,
  rows: 10,
  offsetX: 0,
  offsetY: 0,
  cellSizePx: 50,
  gridOpacity: 0.3,
  visionRangeCells: 6,
  coneAngleDeg: 90,
}

const facingArb = fc.constantFrom<FacingDirectionDeg>(...FACING_DIRECTIONS)

describe('Property-Based Battlemap Invariants (fast-check)', () => {
  it('Invariant 1: visibleCells is always a subset of exploredCells, and opening a door strictly preserves or expands visibility', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: grid.cols - 1 }),
        fc.integer({ min: 0, max: grid.rows - 1 }),
        facingArb,
        fc.integer({ min: 1, max: grid.cols - 1 }),
        fc.integer({ min: 0, max: grid.rows - 2 }),
        (col, row, facingDeg, doorX, doorY) => {
          const pc: MapToken = {
            id: 'pc_prop',
            type: 'pc',
            characterId: 'shotrix-blackburn',
            name: 'Shotrix',
            label: 'SH',
            color: 'cyan',
            col,
            row,
            size: 1,
            facingDeg,
          }

          const closedWalls: MapWallSegment[] = [
            { id: 'd_prop', x1: doorX, y1: doorY, x2: doorX, y2: doorY + 1, kind: 'door', open: false },
          ]
          const openWalls: MapWallSegment[] = [
            { id: 'd_prop', x1: doorX, y1: doorY, x2: doorX, y2: doorY + 1, kind: 'door', open: true },
          ]

          const visClosed = computePartyVisibility([pc], grid, closedWalls, {
            exploredCells: ['0,0'],
            manualRevealedCells: [],
            manualHiddenCells: [],
          })
          const visOpen = computePartyVisibility([pc], grid, openWalls, {
            exploredCells: ['0,0'],
            manualRevealedCells: [],
            manualHiddenCells: [],
          })

          // Visible cells must always be included in exploredCells
          for (const k of visClosed.visibleSet) {
            expect(visClosed.exploredSet.has(k)).toBe(true)
          }

          // Opening a door can never hide a cell that was visible when the door was closed
          for (const k of visClosed.visibleSet) {
            expect(visOpen.visibleSet.has(k)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Invariant 2: a player token inside a sealed wall box can never move outside the box', () => {
    // Full sealed wall perimeter around [2..6] x [2..6]
    const sealedBox: MapWallSegment[] = [
      { id: 'top', x1: 2, y1: 2, x2: 6, y2: 2, kind: 'wall' },
      { id: 'right', x1: 6, y1: 2, x2: 6, y2: 6, kind: 'wall' },
      { id: 'bottom', x1: 2, y1: 6, x2: 6, y2: 6, kind: 'wall' },
      { id: 'left', x1: 2, y1: 2, x2: 2, y2: 6, kind: 'wall' },
    ]

    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 0, max: grid.cols - 1 }),
        fc.integer({ min: 0, max: grid.rows - 1 }),
        (startCol, startRow, targetCol, targetRow) => {
          const pc: MapToken = {
            id: 'pc_box',
            type: 'pc',
            name: 'Knam',
            label: 'KN',
            color: 'crimson',
            col: startCol,
            row: startRow,
            size: 1,
            facingDeg: 0,
          }

          const insideBox = targetCol >= 2 && targetCol <= 5 && targetRow >= 2 && targetRow <= 5
          const res = validatePlayerTokenMove(pc, targetCol, targetRow, grid, sealedBox)

          if (insideBox) {
            expect(res.ok).toBe(true)
          } else {
            expect(res.ok).toBe(false)
            expect(res.reason).toBe('blocked_by_wall')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Invariant 3: player-filtered state never exposes isHidden enemies or numeric enemy HP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: grid.cols - 1 }),
        fc.integer({ min: 0, max: grid.rows - 1 }),
        facingArb,
        fc.integer({ min: 0, max: grid.cols - 1 }),
        fc.integer({ min: 0, max: grid.rows - 1 }),
        fc.boolean(),
        fc.integer({ min: 0, max: 80 }),
        fc.integer({ min: 1, max: 80 }),
        (pcCol, pcRow, facing, enCol, enRow, isHidden, curHp, maxHp) => {
          const map: TacticalMapState = {
            id: 'm_prop',
            name: 'Test',
            isActive: true,
            imageHash: 'blank',
            imageWidth: 800,
            imageHeight: 600,
            grid,
            walls: [],
            tokens: [
              {
                id: 'pc_1',
                type: 'pc',
                name: 'Noorie',
                label: 'NO',
                color: 'emerald',
                col: pcCol,
                row: pcRow,
                size: 1,
                facingDeg: facing,
              },
              {
                id: 'en_1',
                type: 'enemy',
                name: 'Cultist',
                label: 'CU',
                color: 'crimson',
                col: enCol,
                row: enRow,
                size: 1,
                facingDeg: 180,
                currentHp: curHp,
                maxHp,
                isHidden,
              },
            ],
            fog: { exploredCells: [], manualRevealedCells: [], manualHiddenCells: [] },
            pings: [],
            updatedAt: 1,
          }

          const filtered = filterMapStateForPlayer(map)
          const enemies = filtered.tokens.filter((t) => t.type === 'enemy')

          if (isHidden) {
            expect(enemies).toHaveLength(0)
          }
          for (const e of enemies) {
            expect(e.currentHp).toBeUndefined()
            expect(e.maxHp).toBeUndefined()
            expect(e.isHidden).toBeUndefined()
            expect(e.healthStatus).toBeDefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
