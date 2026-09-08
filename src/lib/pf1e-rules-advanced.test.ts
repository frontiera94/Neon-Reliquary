import { describe, it, expect } from 'vitest'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcEffectiveWeaponStats,
} from './stat-calc'
import type { AbilityKey } from './stat-calc'
import type { BuffToggle, Weapon } from '../types/combat'
import type { ArmorClass, SavingThrow } from '../types/defense'
import { abilityMod } from './dice-engine'

describe('Pathfinder 1e Advanced Rules & Cascading Engine', () => {
  const baseAbilities: Record<AbilityKey, number> = {
    str: 16, // mod +3
    dex: 14, // mod +2
    con: 14, // mod +2
    int: 10, // mod +0
    wis: 12, // mod +1
    cha: 8,  // mod -1
  }

  const baseAc: ArmorClass = {
    total: 18, // 10 + 4 armor + 2 shield + 2 dex
    touch: 12, // 10 + 2 dex
    flatFooted: 16, // 10 + 4 armor + 2 shield
    armorBonus: 4,
    shieldBonus: 2,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 15,
  }

  const baseSaves: SavingThrow = {
    fort: 5,
    ref: 4,
    will: 2,
    fortBase: 3,
    refBase: 3,
    willBase: 1,
  }

  describe('1. Ability Score Cascades & Condition Transitions', () => {
    it('fatigued imposes -2 Str and -2 Dex, adjusting modifiers by -1', () => {
      const result = calcEffectiveAbilities(baseAbilities, ['fatigued'], [])

      expect(result.scores.str).toBe(14)
      expect(result.scores.dex).toBe(12)
      expect(result.mods.str).toBe(2)
      expect(result.mods.dex).toBe(1)
      expect(result.deltas.str).toBe(-1)
      expect(result.deltas.dex).toBe(-1)
    })

    it('exhausted imposes severe -6 Str and -6 Dex, adjusting modifiers by -3', () => {
      const result = calcEffectiveAbilities(baseAbilities, ['exhausted'], [])

      expect(result.scores.str).toBe(10)
      expect(result.scores.dex).toBe(8)
      expect(result.mods.str).toBe(0)
      expect(result.mods.dex).toBe(-1)
      expect(result.deltas.str).toBe(-3)
      expect(result.deltas.dex).toBe(-3)
    })

    it('paralyzed reduces effective Str and Dex to 0 (-5 modifier)', () => {
      const result = calcEffectiveAbilities(baseAbilities, ['paralyzed'], [])

      expect(result.scores.str).toBe(0)
      expect(result.scores.dex).toBe(0)
      expect(result.mods.str).toBe(-5)
      expect(result.mods.dex).toBe(-5)
    })

    it('combines physical buffs with conditions accurately', () => {
      // Bull's Strength (+4 Str) while Fatigued (-2 Str) -> net +2 Str
      const bullsStrength: BuffToggle = {
        id: 'bulls-str',
        name: "Bull's Strength",
        active: false,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        abilityMods: { str: 4 },
      }

      const result = calcEffectiveAbilities(baseAbilities, ['fatigued'], [bullsStrength])
      expect(result.scores.str).toBe(18) // 16 - 2 + 4
      expect(result.mods.str).toBe(4) // mod 18 is +4 (net +1 over base +3)
    })
  })

  describe('2. Armor Class Penalties & Loss of Dex Bonus', () => {
    it('blinded strips Dex bonus to AC and imposes an additional -2 AC penalty', () => {
      const baseDexMod = abilityMod(baseAbilities.dex) // +2
      const effDexMod = baseDexMod

      const result = calcEffectiveArmorClass(baseAc, baseDexMod, effDexMod, ['blinded'], [])

      // Base 18 - 2 (lost dex) - 2 (blinded penalty) = 14
      expect(result.total).toBe(14)
      // Touch 12 - 2 (lost dex) - 2 (blinded penalty) = 8
      expect(result.touch).toBe(8)
      // Flat-footed 16 - 2 (blinded penalty) = 14
      expect(result.flatFooted).toBe(14)
    })

    it('stunned strips Dex bonus to AC and imposes -2 AC penalty', () => {
      const baseDexMod = 2
      const effDexMod = 2

      const result = calcEffectiveArmorClass(baseAc, baseDexMod, effDexMod, ['stunned'], [])

      expect(result.total).toBe(14)
      expect(result.touch).toBe(8)
      expect(result.flatFooted).toBe(14)
    })

    it('fatigued reduces Dex mod by 1, automatically lowering total and touch AC', () => {
      const baseDexMod = 2
      const effDexMod = 1 // 12 Dex has +1 mod

      const result = calcEffectiveArmorClass(baseAc, baseDexMod, effDexMod, ['fatigued'], [])

      expect(result.total).toBe(17) // 18 - 1
      expect(result.touch).toBe(11) // 12 - 1
      expect(result.flatFooted).toBe(16) // unchanged
    })

    it('stacks dodge/shield buffs on top of AC', () => {
      const shieldSpell: BuffToggle = {
        id: 'shield-spell',
        name: 'Shield',
        active: false,
        attackMod: 0,
        damageMod: 0,
        acMod: 4,
      }

      const result = calcEffectiveArmorClass(baseAc, 2, 2, [], [shieldSpell])
      expect(result.total).toBe(22)
      expect(result.touch).toBe(16)
      expect(result.flatFooted).toBe(20)
    })
  })

  describe('3. Saving Throw Modifiers & Condition Penalties', () => {
    it('shaken imposes a flat -2 fear penalty to all saving throws', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['shaken'], [])
      const saves = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, ['shaken'], [])

      expect(saves.fort).toBe(3) // 5 - 2
      expect(saves.ref).toBe(2)  // 4 - 2
      expect(saves.will).toBe(0) // 2 - 2
    })

    it('sickened imposes a -2 penalty across all saves', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['sickened'], [])
      const saves = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, ['sickened'], [])

      expect(saves.fort).toBe(3)
      expect(saves.ref).toBe(2)
      expect(saves.will).toBe(0)
    })

    it('constitution changes directly propagate to Fortitude save', () => {
      // +4 Con buff increases Con mod from +2 to +4 (+2 delta)
      const bearsEndurance: BuffToggle = {
        id: 'bears-endurance',
        name: "Bear's Endurance",
        active: false,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        abilityMods: { con: 4 },
      }

      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [bearsEndurance])
      const saves = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, [], [bearsEndurance])

      expect(saves.fort).toBe(7) // 5 + 2
      expect(saves.ref).toBe(4)  // unaffected
      expect(saves.will).toBe(2) // unaffected
    })
  })

  describe('4. Combat Weapon Multi-Buff Stacking & Calculations', () => {
    const greatsword: Weapon = {
      id: 'greatsword',
      name: 'Greatsword',
      type: 'melee',
      attackBonus: [8, 3],
      damageDice: '2d6',
      damageBonus: 6,
      critRange: 19,
      critMultiplier: 2,
      tags: ['Two-Handed'],
    }

    it('calculates combined Power Attack (-2 att, +6 dmg) and Haste (+1 att)', () => {
      const powerAttack: BuffToggle = {
        id: 'power-attack',
        name: 'Power Attack',
        active: false,
        attackMod: -2,
        damageMod: 6,
        acMod: 0,
        meleeOnly: true,
      }
      const haste: BuffToggle = {
        id: 'haste',
        name: 'Haste',
        active: false,
        attackMod: 1,
        damageMod: 0,
        acMod: 1,
      }

      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [powerAttack, haste])
      const effective = calcEffectiveWeaponStats(
        greatsword,
        baseAbilities,
        effAbilities,
        [],
        [powerAttack, haste],
        ['power-attack', 'haste']
      )

      // Net attack modifier: -2 + 1 = -1
      expect(effective.attackBonus).toEqual([7, 2])
      // Net damage modifier: +6
      expect(effective.damageBonus).toBe(12) // 6 + 6
      expect(effective.acMod).toBe(1)
    })

    it('melee-only buffs do not apply to ranged weapons', () => {
      const longbow: Weapon = {
        id: 'longbow',
        name: 'Composite Longbow',
        type: 'ranged',
        attackBonus: [7],
        damageDice: '1d8',
        damageBonus: 3,
        critRange: 20,
        critMultiplier: 3,
        tags: ['Ranged'],
      }

      const powerAttackMelee: BuffToggle = {
        id: 'power-attack',
        name: 'Power Attack',
        active: false,
        attackMod: -2,
        damageMod: 4,
        acMod: 0,
        meleeOnly: true,
      }

      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [powerAttackMelee])
      const effective = calcEffectiveWeaponStats(
        longbow,
        baseAbilities,
        effAbilities,
        [],
        [powerAttackMelee],
        ['power-attack']
      )

      // Longbow should ignore melee-only Power Attack
      expect(effective.attackBonus).toEqual([7])
      expect(effective.damageBonus).toBe(3)
    })
  })

  describe('5. Health Thresholds & Vital States in Pathfinder 1e', () => {
    function evaluateVitalStatus(currentHp: number, conScore: number): 'conscious' | 'disabled' | 'dying' | 'dead' {
      if (currentHp > 0) return 'conscious'
      if (currentHp === 0) return 'disabled'
      if (currentHp > -conScore) return 'dying'
      return 'dead'
    }

    it('correctly categorizes vital status according to PF1e rules', () => {
      const con = 14

      expect(evaluateVitalStatus(25, con)).toBe('conscious')
      expect(evaluateVitalStatus(1, con)).toBe('conscious')
      expect(evaluateVitalStatus(0, con)).toBe('disabled')
      expect(evaluateVitalStatus(-1, con)).toBe('dying')
      expect(evaluateVitalStatus(-13, con)).toBe('dying')
      expect(evaluateVitalStatus(-14, con)).toBe('dead')
      expect(evaluateVitalStatus(-20, con)).toBe('dead')
    })
  })
})
