import { describe, it, expect } from 'vitest'
import {
  scaleStrDamage,
  getActiveWildShapePreset,
  getWildShapeView,
  buildWildShapeWeapons,
  buildHeldSpellstrike,
  calcSpellstrikeAttackBonus,
  calcSpellCombatExtraPenalty,
  calcHexDuration,
  calcFuriousFocusBonus,
  hasFeatNamed,
  isTwoHandedWeapon,
} from './class-combat'
import type { ArmorClass } from '../types/defense'
import type { Weapon } from '../types/combat'
import type { WildShapePreset } from '../types/class-mechanics'

const baseAc: ArmorClass = {
  total: 18,
  touch: 12,
  flatFooted: 16,
  armorBonus: 4,
  shieldBonus: 2,
  dexBonus: 2,
  naturalArmor: 0,
  deflection: 0,
  misc: 0,
  spellFailureChance: 0,
}

const baseAbilities = { str: 14, dex: 14, con: 14, int: 10, wis: 16, cha: 10 }

describe('class-combat pure PF1e helpers', () => {
  describe('scaleStrDamage', () => {
    it('scales positive STR modifiers with floor rounding and preserves non-positive', () => {
      expect(scaleStrDamage(5, 1.5)).toBe(7)
      expect(scaleStrDamage(5, 0.5)).toBe(2)
      expect(scaleStrDamage(4, 1)).toBe(4)
      expect(scaleStrDamage(0, 1.5)).toBe(0)
      expect(scaleStrDamage(-2, 1.5)).toBe(-2)
    })
  })

  describe('Wild Shape helpers', () => {
    it('returns inactive view when no wild shape is active', () => {
      expect(getActiveWildShapePreset(undefined)).toBeNull()
      expect(getActiveWildShapePreset({ druid: { active: false, formId: null } })).toBeNull()
      const view = getWildShapeView({ abilities: baseAbilities, armorClass: baseAc }, undefined)
      expect(view.active).toBe(false)
      expect(view.abilities).toEqual(baseAbilities)
      expect(view.armorClass).toEqual(baseAc)
      expect(view.hasNaturalSpell).toBe(false)
    })

    it('resolves active preset, ability bonuses, melded AC, and Natural Spell feat', () => {
      const view = getWildShapeView(
        {
          abilities: baseAbilities,
          armorClass: baseAc,
          feats: [{ name: 'Natural Spell' }],
        },
        { druid: { active: true, formId: 'wolf' } }
      )
      expect(view.active).toBe(true)
      expect(view.hasNaturalSpell).toBe(true)
      expect(view.preset?.id).toBe('wolf')
      expect(view.abilities.str).toBeGreaterThan(baseAbilities.str)
    })

    it('builds natural weapons from a WildShapePreset with tags and scaled STR damage', () => {
      const preset: WildShapePreset = {
        id: 'tiger-test',
        name: 'Tiger',
        size: 'Medium',
        speed: 40,
        senses: ['Low-light vision', 'Scent'],
        strBonus: 4,
        dexBonus: -2,
        naturalArmorBonus: 4,
        sizeAtkBonus: -1,
        naturalAttacks: [
          { name: 'Bite', attackCount: 1, damageDice: '2d6', attackBonusMod: 0, strMultiplier: 1.5, isPrimary: true, grab: true },
          { name: 'Claws', attackCount: 2, damageDice: '1d8', attackBonusMod: -5, strMultiplier: 0.5, isPrimary: false, trip: true },
        ],
      }
      const weapons = buildWildShapeWeapons(preset, 4, 5)
      expect(weapons).toHaveLength(2)
      expect(weapons[0].name).toBe('Bite')
      expect(weapons[0].attackBonus).toEqual([8]) // 4 BAB + 5 STR - 1 size + 0
      expect(weapons[0].damageBonus).toBe(7) // floor(5 * 1.5)
      expect(weapons[0].tags).toContain('Grab')
      expect(weapons[0].tags).toContain('one-and-half-str')

      expect(weapons[1].name).toBe('Claws x2')
      expect(weapons[1].attackBonus).toEqual([3, 3])
      expect(weapons[1].damageBonus).toBe(2) // floor(5 * 0.5)
      expect(weapons[1].tags).toContain('Trip')
      expect(weapons[1].tags).toContain('half-str')
    })
  })

  describe('Magus Spellstrike & Spell Combat', () => {
    it('builds Shocking Grasp with caster-level dice capped at 5d6 and metal bonus toggle', () => {
      const held3 = buildHeldSpellstrike('shocking-grasp', 3)
      expect(held3?.damageDice).toBe('3d6')
      expect(held3?.chargesMax).toBe(1)
      expect(held3?.hasMetalBonusToggle).toBe(true)

      const held10 = buildHeldSpellstrike('shocking-grasp', 10)
      expect(held10?.damageDice).toBe('5d6')
    })

    it('builds multi-charge touch spells (Chill Touch / Frostbite) and returns null for unknown', () => {
      const chill = buildHeldSpellstrike('chill-touch', 5)
      expect(chill?.damageDice).toBe('1d6')
      expect(chill?.chargesRemaining).toBe(5)
      expect(buildHeldSpellstrike('unknown-spell', 5)).toBeNull()
    })

    it('calculates metal armor bonus and spell combat penalty without double-counting buff', () => {
      const held = buildHeldSpellstrike('shocking-grasp', 4)!
      expect(calcSpellstrikeAttackBonus(held)).toBe(0)
      expect(calcSpellstrikeAttackBonus({ ...held, metalBonusActive: true })).toBe(3)
      expect(calcSpellstrikeAttackBonus(null)).toBe(0)

      expect(calcSpellCombatExtraPenalty(2, false)).toBe(-4)
      expect(calcSpellCombatExtraPenalty(2, true)).toBe(-2)
      expect(calcSpellCombatExtraPenalty(99, true)).toBe(-4) // clamped to 4
      expect(calcSpellCombatExtraPenalty(-5, true)).toBe(0) // clamped to 0
    })
  })

  describe('Witch Hexes, Furious Focus & Weapon Tags', () => {
    it('computes hex durations for passed and failed saves', () => {
      expect(calcHexDuration('evil-eye', 4, 5, 'failed')).toBe(7)
      expect(calcHexDuration('evil-eye', 4, 5, 'passed')).toBe(1)
      expect(calcHexDuration('misfortune', 4, 5, 'failed')).toBe(1)
      expect(calcHexDuration('misfortune', 4, 5, 'passed')).toBe(0)
      expect(calcHexDuration('slumber', 4, 5, 'failed')).toBe(5)
      expect(calcHexDuration('slumber', 4, 5, 'passed')).toBe(0)
      expect(calcHexDuration('fortune', 4, 5, 'passed')).toBe(1)
    })

    it('computes Furious Focus bonus only when all 4 conditions hold', () => {
      expect(calcFuriousFocusBonus(true, true, true, true, 2)).toBe(2)
      expect(calcFuriousFocusBonus(false, true, true, true, 2)).toBe(0)
      expect(calcFuriousFocusBonus(true, false, true, true, 2)).toBe(0)
      expect(calcFuriousFocusBonus(true, true, false, true, 2)).toBe(0)
      expect(calcFuriousFocusBonus(true, true, true, false, 2)).toBe(0)
    })

    it('checks feat names and two-handed weapon tags', () => {
      expect(hasFeatNamed([{ name: 'Power Attack' }], /power attack/i)).toBe(true)
      expect(hasFeatNamed(undefined, /power attack/i)).toBe(false)

      const greataxe: Weapon = {
        id: 'ga',
        name: 'Greataxe',
        type: 'melee',
        attackBonus: [6],
        damageDice: '1d12',
        damageBonus: 4,
        critRange: 20,
        critMultiplier: 3,
        tags: ['two-handed'],
      }
      expect(isTwoHandedWeapon(greataxe)).toBe(true)
      expect(isTwoHandedWeapon({ ...greataxe, tags: ['light'] })).toBe(false)
    })
  })
})
