// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { rollDice, abilityMod } from '../../src/lib/dice-engine'
import { calcSpellDc, calcConcentrationBonus, calcEffectiveAbilities, calcEffectiveArmorClass, calcEffectiveSaves } from '../../src/lib/stat-calc'
import { useSessionStore } from '../../src/store/useSessionStore'
import { en } from '../../src/i18n/en'
import { it as itDict } from '../../src/i18n/it'
import type { DiceType } from '../../src/types/dice'
import type { ConditionType } from '../../src/types/combat'

const ALL_CONDITIONS: ConditionType[] = [
  'fatigued',
  'exhausted',
  'sickened',
  'shaken',
  'frightened',
  'prone',
  'blinded',
  'stunned',
]

function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      result[path] = value
    } else if (value && typeof value === 'object') {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, path))
    }
  }
  return result
}

describe('Property-based invariants (fast-check)', () => {
  it('rollDice always respects die bounds, total sum, and critical threat range', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<DiceType>(4, 6, 8, 10, 12, 20, 100),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: -20, max: 50 }),
        fc.integer({ min: 15, max: 20 }),
        (diceType, count, modifier, critRange) => {
          const res = rollDice({ diceType, count, modifier, label: 'prop', critRange })
          expect(res.naturalRolls).toHaveLength(count)
          for (const d of res.naturalRolls) {
            expect(d).toBeGreaterThanOrEqual(1)
            expect(d).toBeLessThanOrEqual(diceType)
          }
          const sum = res.naturalRolls.reduce((a: number, b: number) => a + b, 0)
          expect(res.total).toBe(sum + modifier)
          if (diceType === 20) {
            expect(res.isCriticalThreat).toBe(res.naturalRolls[0] >= critRange)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('stat-calc functions never return NaN or Infinity for arbitrary PF1e abilities and conditions', () => {
    fc.assert(
      fc.property(
        fc.record({
          str: fc.integer({ min: 1, max: 45 }),
          dex: fc.integer({ min: 1, max: 45 }),
          con: fc.integer({ min: 1, max: 45 }),
          int: fc.integer({ min: 1, max: 45 }),
          wis: fc.integer({ min: 1, max: 45 }),
          cha: fc.integer({ min: 1, max: 45 }),
        }),
        fc.subarray(ALL_CONDITIONS),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 1, max: 20 }),
        (abilities, conditions, spellLevel, casterLevel) => {
          const effResult = calcEffectiveAbilities(abilities, conditions, [])
          const effAbilities = effResult.scores
          for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
            expect(Number.isFinite(effAbilities[k])).toBe(true)
            expect(Number.isFinite(abilityMod(effAbilities[k]))).toBe(true)
          }

          const ac = calcEffectiveArmorClass(
            {
              total: 15,
              touch: 12,
              flatFooted: 13,
              armorBonus: 3,
              shieldBonus: 0,
              dexBonus: 2,
              naturalArmor: 0,
              deflection: 0,
              misc: 0,
              spellFailureChance: 0,
            },
            abilityMod(abilities.dex),
            abilityMod(effAbilities.dex),
            conditions,
            []
          )
          expect(Number.isFinite(ac.total)).toBe(true)
          expect(Number.isFinite(ac.touch)).toBe(true)
          expect(Number.isFinite(ac.flatFooted)).toBe(true)

          const saves = calcEffectiveSaves(
            { fort: 3, ref: 4, will: 2, fortBase: 1, refBase: 2, willBase: 1 },
            abilities,
            effResult,
            conditions,
            []
          )
          expect(Number.isFinite(saves.fort)).toBe(true)
          expect(Number.isFinite(saves.ref)).toBe(true)
          expect(Number.isFinite(saves.will)).toBe(true)

          const dc = calcSpellDc(spellLevel, abilityMod(effAbilities.int))
          const conc = calcConcentrationBonus(casterLevel, abilityMod(effAbilities.int))
          expect(Number.isFinite(dc)).toBe(true)
          expect(Number.isFinite(conc)).toBe(true)
        }
      ),
      { numRuns: 75 }
    )
  })

  it('useSessionStore damage absorption and longRest idempotence hold for arbitrary values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 0, max: 150 }),
        (maxHp, tempHp, damage) => {
          const charId = 'prop-char'
          useSessionStore.setState({ sessions: {} })
          const store = useSessionStore.getState()
          store.initSession(charId, maxHp)
          if (tempHp > 0) store.setTempHp(charId, tempHp)

          store.applyDamage(charId, damage)
          const afterDmg = useSessionStore.getState().getSession(charId)!
          expect(afterDmg.tempHp).toBeGreaterThanOrEqual(0)
          expect(afterDmg.tempHp).toBe(Math.max(0, tempHp - damage))
          const absorbedByTemp = tempHp - afterDmg.tempHp
          const expectedHp = Math.max(-10, maxHp - (damage - absorbedByTemp))
          expect(afterDmg.currentHp).toBe(expectedHp)

          store.longRest(charId, maxHp)
          const afterRest1 = useSessionStore.getState().getSession(charId)!
          store.longRest(charId, maxHp)
          const afterRest2 = useSessionStore.getState().getSession(charId)!
          expect(afterRest1.currentHp).toBe(maxHp)
          expect(afterRest1.tempHp).toBe(0)
          expect(afterRest1.nonlethalDamage).toBe(0)
          expect(afterRest2).toEqual(afterRest1)
        }
      ),
      { numRuns: 60 }
    )
  })

  it('i18n EN and IT dictionaries have identical leaf keys and interpolation placeholders', () => {
    const enFlat = flattenKeys(en as unknown as Record<string, unknown>)
    const itFlat = flattenKeys(itDict as unknown as Record<string, unknown>)

    expect(Object.keys(enFlat).sort()).toEqual(Object.keys(itFlat).sort())

    for (const [key, enVal] of Object.entries(enFlat)) {
      const itVal = itFlat[key]
      const enParams = [...enVal.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
      const itParams = [...itVal.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
      expect(itParams).toEqual(enParams)
    }
  })
})
