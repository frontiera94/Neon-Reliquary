import { describe, it, expect, beforeEach } from 'vitest'
import { useDiceStore } from './useDiceStore'
import type { DiceRoll, RollResult } from '../types/dice'

function makeResult(id: string, total = 15): RollResult {
  return {
    id,
    label: 'Test Roll',
    diceType: 20,
    naturalRolls: [total - 2],
    modifier: 2,
    total,
    isCriticalThreat: false,
    isCriticalConfirmed: false,
    formula: `d20: ${total - 2} + 2 = ${total}`,
    timestamp: Date.now(),
  }
}

describe('useDiceStore', () => {
  beforeEach(() => {
    useDiceStore.setState({
      isOpen: false,
      isRolling: false,
      pendingRoll: null,
      lastResult: null,
      history: [],
    })
  })

  describe('initial state', () => {
    it('has default inactive state', () => {
      const state = useDiceStore.getState()
      expect(state.isOpen).toBe(false)
      expect(state.isRolling).toBe(false)
      expect(state.pendingRoll).toBeNull()
      expect(state.lastResult).toBeNull()
      expect(state.history).toEqual([])
    })
  })

  describe('openRoll', () => {
    it('sets isOpen and isRolling to true, saves pending roll, and resets lastResult', () => {
      // Precondition with previous result
      useDiceStore.setState({ lastResult: makeResult('prev') })

      const roll: DiceRoll = { diceType: 20, count: 1, modifier: 5, label: 'Attack' }
      useDiceStore.getState().openRoll(roll)

      const state = useDiceStore.getState()
      expect(state.isOpen).toBe(true)
      expect(state.isRolling).toBe(true)
      expect(state.pendingRoll).toEqual(roll)
      expect(state.lastResult).toBeNull()
    })
  })

  describe('setResult', () => {
    it('sets isRolling to false, records lastResult, and prepends to history', () => {
      const res = makeResult('roll-1', 18)
      useDiceStore.getState().setResult(res)

      const state = useDiceStore.getState()
      expect(state.isRolling).toBe(false)
      expect(state.lastResult).toEqual(res)
      expect(state.history).toEqual([res])
    })

    it('prepends newest rolls to history', () => {
      const res1 = makeResult('roll-1', 10)
      const res2 = makeResult('roll-2', 20)

      useDiceStore.getState().setResult(res1)
      useDiceStore.getState().setResult(res2)

      const state = useDiceStore.getState()
      expect(state.history[0].id).toBe('roll-2')
      expect(state.history[1].id).toBe('roll-1')
      expect(state.history).toHaveLength(2)
    })

    it('caps history at exactly 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        useDiceStore.getState().setResult(makeResult(`roll-${i}`, i))
      }

      const state = useDiceStore.getState()
      expect(state.history).toHaveLength(50)
      // Most recent should be roll-59
      expect(state.history[0].id).toBe('roll-59')
      // Oldest retained should be roll-10 (0..9 were sliced off)
      expect(state.history[49].id).toBe('roll-10')
    })
  })

  describe('setRolling', () => {
    it('toggles isRolling flag', () => {
      useDiceStore.getState().setRolling(true)
      expect(useDiceStore.getState().isRolling).toBe(true)

      useDiceStore.getState().setRolling(false)
      expect(useDiceStore.getState().isRolling).toBe(false)
    })
  })

  describe('close', () => {
    it('closes modal and clears pendingRoll', () => {
      const roll: DiceRoll = { diceType: 6, count: 2, modifier: 3, label: 'Damage' }
      useDiceStore.getState().openRoll(roll)

      useDiceStore.getState().close()

      const state = useDiceStore.getState()
      expect(state.isOpen).toBe(false)
      expect(state.pendingRoll).toBeNull()
    })
  })

  describe('clearHistory', () => {
    it('empties history array', () => {
      useDiceStore.getState().setResult(makeResult('r1'))
      useDiceStore.getState().setResult(makeResult('r2'))
      expect(useDiceStore.getState().history).toHaveLength(2)

      useDiceStore.getState().clearHistory()
      expect(useDiceStore.getState().history).toEqual([])
    })
  })
})
