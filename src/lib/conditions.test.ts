import { describe, it, expect } from 'vitest'
import { CONDITION_INFO } from './conditions'
import type { ConditionType } from '../types/combat'

const ALL_CONDITIONS: ConditionType[] = [
  'shaken',
  'sickened',
  'fatigued',
  'exhausted',
  'blinded',
  'confused',
  'dazed',
  'frightened',
  'nauseated',
  'paralyzed',
  'prone',
  'stunned',
]

describe('CONDITION_INFO registry', () => {
  it('has entries for all defined ConditionType values', () => {
    for (const cond of ALL_CONDITIONS) {
      expect(CONDITION_INFO[cond], `Missing condition: ${cond}`).toBeDefined()
    }
  })

  it('contains exactly the 12 Pathfinder standard conditions', () => {
    expect(Object.keys(CONDITION_INFO)).toHaveLength(12)
  })

  it('provides non-empty name, summary, and penalties array for every condition', () => {
    for (const [key, info] of Object.entries(CONDITION_INFO)) {
      expect(info.name.trim().length, `Empty name for ${key}`).toBeGreaterThan(0)
      expect(info.summary.trim().length, `Empty summary for ${key}`).toBeGreaterThan(0)
      expect(Array.isArray(info.penalties), `Penalties not an array for ${key}`).toBe(true)
      expect(info.penalties.length, `No penalties listed for ${key}`).toBeGreaterThan(0)

      for (const penalty of info.penalties) {
        expect(penalty.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('provides accurate penalty details for key conditions', () => {
    // Paralyzed: effective STR and DEX 0
    expect(CONDITION_INFO.paralyzed.penalties.some((p) => p.includes('0'))).toBe(true)

    // Blinded: -2 AC, loses Dex bonus
    expect(CONDITION_INFO.blinded.penalties.some((p) => p.includes('AC'))).toBe(true)
    expect(CONDITION_INFO.blinded.penalties.some((p) => p.includes('Dex'))).toBe(true)

    // Prone: -4 melee, +4 vs ranged (matches en-dash –4 or hyphen -4)
    expect(CONDITION_INFO.prone.penalties.some((p) => /[–-]4/.test(p))).toBe(true)
    expect(CONDITION_INFO.prone.penalties.some((p) => p.includes('+4'))).toBe(true)
  })
})
