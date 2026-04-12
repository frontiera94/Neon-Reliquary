import { describe, it, expect } from 'vitest'
import { rollDice, parseDiceFormula, abilityMod } from './dice-engine'
import type { DiceRoll } from '../types/dice'

// ─── abilityMod ──────────────────────────────────────────────────────────────

describe('abilityMod', () => {
  it('returns 0 for score 10', () => expect(abilityMod(10)).toBe(0))
  it('returns 0 for score 11', () => expect(abilityMod(11)).toBe(0))
  it('returns +1 for score 12', () => expect(abilityMod(12)).toBe(1))
  it('returns +4 for score 18', () => expect(abilityMod(18)).toBe(4))
  it('returns -1 for score 8', () => expect(abilityMod(8)).toBe(-1))
  it('returns -5 for score 1', () => expect(abilityMod(1)).toBe(-5))
  it('returns +5 for score 20', () => expect(abilityMod(20)).toBe(5))
})

// ─── parseDiceFormula ────────────────────────────────────────────────────────

describe('parseDiceFormula', () => {
  it('parses "2d6"', () => {
    expect(parseDiceFormula('2d6')).toEqual({ count: 2, sides: 6, bonus: 0 })
  })

  it('parses "1d8+3"', () => {
    expect(parseDiceFormula('1d8+3')).toEqual({ count: 1, sides: 8, bonus: 3 })
  })

  it('parses "d20+5" (no count prefix)', () => {
    expect(parseDiceFormula('d20+5')).toEqual({ count: 1, sides: 20, bonus: 5 })
  })

  it('parses "d20" (no count, no bonus)', () => {
    expect(parseDiceFormula('d20')).toEqual({ count: 1, sides: 20, bonus: 0 })
  })

  it('parses negative bonus "1d6-2"', () => {
    expect(parseDiceFormula('1d6-2')).toEqual({ count: 1, sides: 6, bonus: -2 })
  })

  it('returns default {count:1, sides:20, bonus:0} for invalid input', () => {
    expect(parseDiceFormula('invalid')).toEqual({ count: 1, sides: 20, bonus: 0 })
    expect(parseDiceFormula('')).toEqual({ count: 1, sides: 20, bonus: 0 })
  })
})

// ─── rollDice ────────────────────────────────────────────────────────────────

describe('rollDice', () => {
  const baseRoll: DiceRoll = { diceType: 6, count: 1, modifier: 0, label: 'Test' }

  it('returns a result with the correct label', () => {
    const result = rollDice({ ...baseRoll, label: 'Fireball' })
    expect(result.label).toBe('Fireball')
  })

  it('returns a unique id each time', () => {
    const a = rollDice(baseRoll)
    const b = rollDice(baseRoll)
    expect(a.id).not.toBe(b.id)
  })

  it('total equals sum of natural rolls plus modifier', () => {
    const result = rollDice({ diceType: 6, count: 3, modifier: 5, label: 'Damage' })
    const sumNatural = result.naturalRolls.reduce((a, b) => a + b, 0)
    expect(result.total).toBe(sumNatural + 5)
  })

  it('rolls the correct number of dice', () => {
    const result = rollDice({ diceType: 6, count: 4, modifier: 0, label: 'Multi' })
    expect(result.naturalRolls).toHaveLength(4)
  })

  it('each roll is within [1, diceType]', () => {
    // Run many times to increase confidence
    for (let i = 0; i < 50; i++) {
      const result = rollDice({ diceType: 8, count: 2, modifier: 0, label: 'Range check' })
      result.naturalRolls.forEach((r) => {
        expect(r).toBeGreaterThanOrEqual(1)
        expect(r).toBeLessThanOrEqual(8)
      })
    }
  })

  it('detects a critical threat when first die meets critRange', () => {
    // We cannot force a specific roll, but we can verify the logic:
    // isCriticalThreat must be (firstRoll >= critRange)
    for (let i = 0; i < 100; i++) {
      const result = rollDice({ diceType: 20, count: 1, modifier: 0, label: 'Atk', critRange: 20 })
      const expected = result.naturalRolls[0] >= 20
      expect(result.isCriticalThreat).toBe(expected)
    }
  })

  it('respects a lower critRange (e.g. 19)', () => {
    for (let i = 0; i < 100; i++) {
      const result = rollDice({ diceType: 20, count: 1, modifier: 0, label: 'Atk', critRange: 19 })
      const expected = result.naturalRolls[0] >= 19
      expect(result.isCriticalThreat).toBe(expected)
    }
  })

  it('isCriticalConfirmed is always false (not resolved by rollDice)', () => {
    const result = rollDice(baseRoll)
    expect(result.isCriticalConfirmed).toBe(false)
  })

  it('applies a positive modifier to total', () => {
    const result = rollDice({ diceType: 6, count: 1, modifier: 10, label: 'Mod' })
    expect(result.total).toBe(result.naturalRolls[0] + 10)
  })

  it('applies a negative modifier to total', () => {
    const result = rollDice({ diceType: 20, count: 1, modifier: -3, label: 'Penalty' })
    expect(result.total).toBe(result.naturalRolls[0] - 3)
  })

  it('formula contains the dice type', () => {
    const result = rollDice({ diceType: 12, count: 2, modifier: 0, label: 'Axe' })
    expect(result.formula).toContain('d12')
  })

  it('single-die formula does not include count prefix', () => {
    const result = rollDice({ diceType: 20, count: 1, modifier: 0, label: 'Atk' })
    expect(result.formula).toMatch(/^d20:/)
  })

  it('multi-die formula includes count prefix', () => {
    const result = rollDice({ diceType: 6, count: 3, modifier: 0, label: 'Multi' })
    expect(result.formula).toMatch(/^3d6:/)
  })
})
