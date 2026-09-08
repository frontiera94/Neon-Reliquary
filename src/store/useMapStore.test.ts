import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMapStore } from './useMapStore'
import type { PublicMapState, Token } from '../types/map'
import { pushMap } from '../lib/map-api'

vi.mock('../lib/map-api', () => ({
  pushMap: vi.fn().mockResolvedValue(undefined),
}))

function makeMap(overrides: Partial<PublicMapState> = {}): PublicMapState {
  return {
    id: 'test-map',
    createdAt: 0,
    updatedAt: 0,
    background: null,
    grid: { size: 50 },
    tokens: [],
    shapes: [],
    labels: [],
    fog: { cols: 10, rows: 10, cells: new Array(100).fill(0) },
    initiative: { order: [], currentIndex: 0, round: 1 },
    ...overrides,
  }
}

function makeToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 'tok1',
    name: 'Goblin',
    color: '#ff0000',
    initial: 'G',
    hp: { current: 10, max: 10 },
    pos: { x: 0, y: 0 },
    kind: 'enemy',
    initiative: null,
    ...overrides,
  }
}

describe('useMapStore', () => {
  beforeEach(() => {
    useMapStore.setState({ map: null, isPushing: false })
  })

  describe('setMap / clearMap', () => {
    it('setMap stores state', () => {
      useMapStore.getState().setMap(makeMap())
      expect(useMapStore.getState().map?.id).toBe('test-map')
    })

    it('clearMap resets to null', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().clearMap()
      expect(useMapStore.getState().map).toBeNull()
    })
  })

  describe('addToken', () => {
    it('appends token to tokens array', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken())
      expect(useMapStore.getState().map!.tokens).toHaveLength(1)
      expect(useMapStore.getState().map!.tokens[0].id).toBe('tok1')
    })

    it('adds token id to initiative order', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken())
      expect(useMapStore.getState().map!.initiative.order).toContain('tok1')
    })

    it('does not duplicate id in order if already present', () => {
      useMapStore.getState().setMap(makeMap({ initiative: { order: ['tok1'], currentIndex: 0, round: 1 } }))
      useMapStore.getState().addToken(makeToken())
      expect(useMapStore.getState().map!.initiative.order).toHaveLength(1)
    })

    it('is no-op when map is null', () => {
      useMapStore.getState().addToken(makeToken())
      expect(useMapStore.getState().map).toBeNull()
    })
  })

  describe('moveToken', () => {
    it('updates token position', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken())
      useMapStore.getState().moveToken('tok1', { x: 3, y: 7 })
      expect(useMapStore.getState().map!.tokens[0].pos).toEqual({ x: 3, y: 7 })
    })

    it('does not affect other tokens', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ id: 'a', pos: { x: 0, y: 0 } }))
      useMapStore.getState().addToken(makeToken({ id: 'b', pos: { x: 5, y: 5 } }))
      useMapStore.getState().moveToken('a', { x: 99, y: 99 })
      expect(useMapStore.getState().map!.tokens[1].pos).toEqual({ x: 5, y: 5 })
    })
  })

  describe('editHP', () => {
    it('applies positive delta', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ hp: { current: 5, max: 10 } }))
      useMapStore.getState().editHP('tok1', 3)
      expect(useMapStore.getState().map!.tokens[0].hp.current).toBe(8)
    })

    it('applies negative delta', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ hp: { current: 5, max: 10 } }))
      useMapStore.getState().editHP('tok1', -3)
      expect(useMapStore.getState().map!.tokens[0].hp.current).toBe(2)
    })

    it('clamps to max HP', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ hp: { current: 8, max: 10 } }))
      useMapStore.getState().editHP('tok1', 100)
      expect(useMapStore.getState().map!.tokens[0].hp.current).toBe(10)
    })

    it('clamps to 0', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ hp: { current: 3, max: 10 } }))
      useMapStore.getState().editHP('tok1', -999)
      expect(useMapStore.getState().map!.tokens[0].hp.current).toBe(0)
    })
  })

  describe('addShape / removeShape', () => {
    it('addShape appends', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addShape({ id: 's1', kind: 'rect', x: 0, y: 0, w: 2, h: 2, stroke: '#fff' })
      expect(useMapStore.getState().map!.shapes).toHaveLength(1)
    })

    it('removeShape filters by id', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addShape({ id: 's1', kind: 'rect', x: 0, y: 0, w: 2, h: 2, stroke: '#fff' })
      useMapStore.getState().addShape({ id: 's2', kind: 'rect', x: 1, y: 1, w: 1, h: 1, stroke: '#fff' })
      useMapStore.getState().removeShape('s1')
      const shapes = useMapStore.getState().map!.shapes
      expect(shapes).toHaveLength(1)
      expect(shapes[0].id).toBe('s2')
    })
  })

  describe('addLabel / removeLabel', () => {
    it('addLabel appends', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addLabel({ id: 'l1', x: 0, y: 0, text: 'Hello', color: '#fff' })
      expect(useMapStore.getState().map!.labels).toHaveLength(1)
    })

    it('removeLabel filters by id', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addLabel({ id: 'l1', x: 0, y: 0, text: 'A', color: '#fff' })
      useMapStore.getState().addLabel({ id: 'l2', x: 1, y: 1, text: 'B', color: '#fff' })
      useMapStore.getState().removeLabel('l1')
      expect(useMapStore.getState().map!.labels[0].id).toBe('l2')
    })
  })

  describe('paintFog / paintFogRect', () => {
    it('paintFog marks cell hidden', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().paintFog(2, 3, true)
      expect(useMapStore.getState().map!.fog.cells[3 * 10 + 2]).toBe(1)
    })

    it('paintFogRect marks region', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().paintFogRect(0, 0, 2, 2, true)
      const cells = useMapStore.getState().map!.fog.cells
      expect(cells[0]).toBe(1)
      expect(cells[2 * 10 + 2]).toBe(1)
      expect(cells[3 * 10]).toBe(0)
    })
  })

  describe('advanceTurn', () => {
    it('increments currentIndex', () => {
      useMapStore.getState().setMap(makeMap({
        initiative: { order: ['a', 'b', 'c'], currentIndex: 0, round: 1 },
      }))
      useMapStore.getState().advanceTurn()
      expect(useMapStore.getState().map!.initiative.currentIndex).toBe(1)
    })

    it('wraps to 0 and increments round', () => {
      useMapStore.getState().setMap(makeMap({
        initiative: { order: ['a', 'b'], currentIndex: 1, round: 1 },
      }))
      useMapStore.getState().advanceTurn()
      const init = useMapStore.getState().map!.initiative
      expect(init.currentIndex).toBe(0)
      expect(init.round).toBe(2)
    })

    it('is no-op when map is null', () => {
      useMapStore.getState().advanceTurn()
      expect(useMapStore.getState().map).toBeNull()
    })
  })

  describe('setTokenInitiative', () => {
    it('sorts tokens descending by initiative', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ id: 'a', initiative: null }))
      useMapStore.getState().addToken(makeToken({ id: 'b', initiative: null }))
      useMapStore.getState().setTokenInitiative('a', 5)
      useMapStore.getState().setTokenInitiative('b', 15)
      const order = useMapStore.getState().map!.initiative.order
      expect(order[0]).toBe('b')
      expect(order[1]).toBe('a')
    })

    it('places null-initiative tokens last', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().addToken(makeToken({ id: 'a', initiative: null }))
      useMapStore.getState().addToken(makeToken({ id: 'b', initiative: 10 }))
      useMapStore.getState().setTokenInitiative('b', 10)
      const order = useMapStore.getState().map!.initiative.order
      expect(order[0]).toBe('b')
      expect(order[order.length - 1]).toBe('a')
    })
  })

  describe('setInitiativeOrder', () => {
    it('resets currentIndex to 0 when order changes', () => {
      useMapStore.getState().setMap(makeMap({
        initiative: { order: ['a', 'b'], currentIndex: 1, round: 2 },
      }))
      useMapStore.getState().setInitiativeOrder(['b', 'a'])
      expect(useMapStore.getState().map!.initiative.currentIndex).toBe(0)
    })

    it('preserves currentIndex when order is identical', () => {
      useMapStore.getState().setMap(makeMap({
        initiative: { order: ['a', 'b'], currentIndex: 1, round: 2 },
      }))
      useMapStore.getState().setInitiativeOrder(['a', 'b'])
      expect(useMapStore.getState().map!.initiative.currentIndex).toBe(1)
    })
  })

  describe('setBackground', () => {
    it('sets background image and dimensions', () => {
      useMapStore.getState().setMap(makeMap())
      useMapStore.getState().setBackground({ url: 'https://img.png', width: 800, height: 600 })
      expect(useMapStore.getState().map?.background).toEqual({ url: 'https://img.png', width: 800, height: 600 })
    })

    it('clears background to null', () => {
      useMapStore.getState().setMap(makeMap({ background: { url: 'https://img.png', width: 800, height: 600 } }))
      useMapStore.getState().setBackground(null)
      expect(useMapStore.getState().map?.background).toBeNull()
    })
  })

  describe('scheduleSync', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.mocked(pushMap).mockClear()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('debounces calls and calls pushMap after 300ms', async () => {
      const map = makeMap()
      useMapStore.getState().setMap(map)

      useMapStore.getState().scheduleSync('map-1', 'sec-1')
      useMapStore.getState().scheduleSync('map-1', 'sec-1')
      useMapStore.getState().scheduleSync('map-1', 'sec-1')

      expect(pushMap).not.toHaveBeenCalled()

      vi.advanceTimersByTime(300)
      await vi.runAllTimersAsync()

      expect(pushMap).toHaveBeenCalledOnce()
      expect(pushMap).toHaveBeenCalledWith('map-1', 'sec-1', map)
    })
  })

  describe('operations when map is null', () => {
    it('handles operations safely without error', () => {
      useMapStore.getState().moveToken('tok1', { x: 1, y: 1 })
      useMapStore.getState().editHP('tok1', 5)
      useMapStore.getState().addShape({ id: 's1', kind: 'rect', x: 0, y: 0, w: 1, h: 1, stroke: '#fff' })
      useMapStore.getState().removeShape('s1')
      useMapStore.getState().addLabel({ id: 'l1', x: 0, y: 0, text: 'hi', color: '#fff' })
      useMapStore.getState().removeLabel('l1')
      useMapStore.getState().paintFog(0, 0, true)
      useMapStore.getState().paintFogRect(0, 0, 1, 1, true)
      useMapStore.getState().setInitiativeOrder(['a'])
      useMapStore.getState().setTokenInitiative('a', 10)
      useMapStore.getState().advanceTurn()

      expect(useMapStore.getState().map).toBeNull()
    })
  })
})
