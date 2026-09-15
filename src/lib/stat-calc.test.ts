import { describe, it, expect } from 'vitest'
import {
  calcEffectiveAbilities,
  calcEffectiveSaves,
  calcEffectiveArmorClass,
  calcEffectiveWeaponStats,
  calcEffectiveSkills,
  getActiveActionRestrictions,
} from './stat-calc'
import type { Weapon, BuffToggle } from '../types/combat'
import type { SavingThrow, ArmorClass } from '../types/defense'
import type { Skill } from '../types/skills'

describe('stat-calc engine', () => {
  const baseAbilities = {
    str: 18, // +4
    dex: 14, // +2
    con: 14, // +2
    int: 10, // +0
    wis: 12, // +1
    cha: 8,  // -1
  }

  describe('calcEffectiveAbilities', () => {
    it('returns unmodified abilities when no conditions or buffs are active', () => {
      const res = calcEffectiveAbilities(baseAbilities, [], [])
      expect(res.scores.str).toBe(18)
      expect(res.mods.str).toBe(4)
      expect(res.deltas.str).toBe(0)
    })

    it('applies fatigued (-2 STR, -2 DEX) reducing mods', () => {
      const res = calcEffectiveAbilities(baseAbilities, ['fatigued'], [])
      expect(res.scores.str).toBe(16)
      expect(res.mods.str).toBe(3)
      expect(res.deltas.str).toBe(-1)
      expect(res.scores.dex).toBe(12)
      expect(res.mods.dex).toBe(1)
      expect(res.deltas.dex).toBe(-1)
    })

    it('applies exhausted (-6 STR, -6 DEX)', () => {
      const res = calcEffectiveAbilities(baseAbilities, ['exhausted'], [])
      expect(res.scores.str).toBe(12)
      expect(res.mods.str).toBe(1)
      expect(res.deltas.str).toBe(-3)
    })

    it('applies ability buffs like Bull Strength (+4 STR)', () => {
      const buff: BuffToggle = {
        id: 'test-bull',
        name: "Bull's Strength",
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        abilityMods: { str: 4 },
      }
      const res = calcEffectiveAbilities(baseAbilities, [], [buff])
      expect(res.scores.str).toBe(22)
      expect(res.mods.str).toBe(6)
      expect(res.deltas.str).toBe(2)
    })

    it('applies paralyzed (STR and DEX become 0, modifier becomes -5)', () => {
      const res = calcEffectiveAbilities(baseAbilities, ['paralyzed'], [])
      expect(res.scores.str).toBe(0)
      expect(res.scores.dex).toBe(0)
      expect(res.mods.str).toBe(-5)
      expect(res.mods.dex).toBe(-5)
      expect(res.breakdowns.str).toContainEqual({ label: 'Paralyzed', value: -18 })
      expect(res.breakdowns.dex).toContainEqual({ label: 'Paralyzed', value: -14 })
    })

    it('stacks multiple ability score buffs simultaneously', () => {
      const bull: BuffToggle = {
        id: 'bull',
        name: "Bull's Strength",
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        abilityMods: { str: 4 },
      }
      const cat: BuffToggle = {
        id: 'cat',
        name: "Cat's Grace",
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        abilityMods: { dex: 4 },
      }
      const res = calcEffectiveAbilities(baseAbilities, [], [bull, cat])
      expect(res.scores.str).toBe(22)
      expect(res.scores.dex).toBe(18)
      expect(res.mods.str).toBe(6)
      expect(res.mods.dex).toBe(4)
    })
  })

  describe('calcEffectiveSaves', () => {
    const baseSaves: SavingThrow = {
      fort: 5,
      ref: 4,
      will: 2,
      fortBase: 3,
      refBase: 2,
      willBase: 1,
    }

    it('applies Shaken (-2 to all saves)', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['shaken'], [])
      const res = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, ['shaken'], [])
      expect(res.fortitude).toBe(3)
      expect(res.reflex).toBe(2)
      expect(res.will).toBe(0)
    })

    it('cascades DEX penalty from Fatigued into Reflex save', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['fatigued'], [])
      const res = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, ['fatigued'], [])
      // DEX went from 14 (+2) to 12 (+1) -> -1 to Reflex
      expect(res.reflex).toBe(3)
      expect(res.fortitude).toBe(5)
    })

    it('applies Haste (+1 Reflex)', () => {
      const hasteBuff: BuffToggle = {
        id: 'haste',
        name: 'Haste',
        active: true,
        attackMod: 1,
        damageMod: 0,
        acMod: 1,
        saveMod: { ref: 1 },
      }
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [hasteBuff])
      const res = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, [], [hasteBuff])
      expect(res.reflex).toBe(5)
      expect(res.fortitude).toBe(5)
      expect(res.will).toBe(2)
    })

    it('applies Sickened and Frightened (-2 each) to all saving throws', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['sickened', 'frightened'], [])
      const res = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, ['sickened', 'frightened'], [])
      // Fort: 5 - 2 (sickened) - 2 (frightened) = 1
      expect(res.fortitude).toBe(1)
      expect(res.reflex).toBe(0)
      expect(res.will).toBe(-2)
    })

    it('applies flat numeric saveMod to all saves', () => {
      const resistanceBuff: BuffToggle = {
        id: 'resistance',
        name: 'Resistance',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        saveMod: 1,
      }
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [resistanceBuff])
      const res = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, [], [resistanceBuff])
      expect(res.fortitude).toBe(6)
      expect(res.reflex).toBe(5)
      expect(res.will).toBe(3)
    })

    it('applies selective saveMod object to specific saves', () => {
      const ironWillBuff: BuffToggle = {
        id: 'iron-will',
        name: 'Iron Will Buff',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        saveMod: { will: 2, fort: 1 },
      }
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [ironWillBuff])
      const res = calcEffectiveSaves(baseSaves, baseAbilities, effAbilities, [], [ironWillBuff])
      expect(res.fortitude).toBe(6)
      expect(res.reflex).toBe(4)
      expect(res.will).toBe(4)
    })
  })

  describe('calcEffectiveArmorClass', () => {
    const baseAc: ArmorClass = {
      total: 18,
      touch: 12,
      flatFooted: 16,
      armorBonus: 6,
      shieldBonus: 0,
      dexBonus: 2,
      naturalArmor: 0,
      deflection: 0,
      misc: 0,
      spellFailureChance: 0,
    }

    it('applies Blinded (-2 AC, loses Dex)', () => {
      // baseDexMod is 2
      const res = calcEffectiveArmorClass(baseAc, 2, 2, ['blinded'], [])
      // loses DEX (+2) and takes -2 penalty -> total drops by 4
      expect(res.total).toBe(14)
      expect(res.touch).toBe(8)
    })

    it('applies AC buff', () => {
      const buff: BuffToggle = {
        id: 'shield',
        name: 'Shield',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 4,
      }
      const res = calcEffectiveArmorClass(baseAc, 2, 2, [], [buff])
      expect(res.total).toBe(22)
      expect(res.touch).toBe(16)
      expect(res.flatFooted).toBe(20)
    })

    it('applies Stunned (-2 AC, loses Dex bonus)', () => {
      const res = calcEffectiveArmorClass(baseAc, 2, 2, ['stunned'], [])
      // -2 penalty and loses +2 dex -> total drops by 4
      expect(res.total).toBe(14)
      expect(res.touch).toBe(8)
      expect(res.flatFooted).toBe(14)
    })

    it('appends special note for Prone condition without modifying total AC directly', () => {
      const res = calcEffectiveArmorClass(baseAc, 2, 2, ['prone'], [])
      expect(res.notes).toContain('-4 AC vs melee / +4 AC vs ranged (Prone)')
      expect(res.total).toBe(18)
    })

    it('applies negative AC buffs like Barbarian Rage', () => {
      const rageBuff: BuffToggle = {
        id: 'rage',
        name: 'Rage',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: -2,
      }
      const res = calcEffectiveArmorClass(baseAc, 2, 2, [], [rageBuff])
      expect(res.total).toBe(16)
      expect(res.touch).toBe(10)
      expect(res.flatFooted).toBe(14)
    })

    it('does not subtract lost Dex bonus if Dex mod is zero or negative', () => {
      const res = calcEffectiveArmorClass(baseAc, 0, 0, ['blinded'], [])
      // only -2 penalty from blinded, no negative dex bonus deducted
      expect(res.total).toBe(16)
      expect(res.touch).toBe(10)
    })
  })

  describe('calcEffectiveWeaponStats', () => {
    const sword: Weapon = {
      id: 'greatsword',
      name: 'Greatsword',
      type: 'melee',
      attackBonus: [8, 3],
      damageDice: '2d6',
      damageBonus: 6,
      critRange: 19,
      critMultiplier: 2,
      tags: ['two-handed'],
    }

    it('applies Shaken and Sickened to attack and damage', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['shaken', 'sickened'], [])
      const res = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        ['shaken', 'sickened'],
        [],
        []
      )
      // Shaken (-2) + Sickened (-2) = -4 attack
      expect(res.attackBonus).toEqual([4, -1])
      // Sickened (-2) damage
      expect(res.damageBonus).toBe(4)
    })

    it('applies STR shift from Fatigued and Bull Strength', () => {
      const bull: BuffToggle = {
        id: 'bull',
        name: 'Bull',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        abilityMods: { str: 4 }, // +2 mod
      }
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [bull])
      const res = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        [],
        [bull],
        ['bull']
      )
      expect(res.attackBonus).toEqual([10, 5])
      expect(res.damageBonus).toBe(8)
    })

    it('extracts extraDamageDice from active buffs like Sneak Attack', () => {
      const sneakBuff: BuffToggle = {
        id: 'sneak',
        name: 'Sneak Attack',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        extraDamageDice: '+2d6',
      }
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [sneakBuff])
      const res = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        [],
        [sneakBuff],
        ['sneak']
      )
      expect(res.extraDamageDice).toBe('+2d6')
    })

    it('applies Prone penalty to melee weapon (-4) but not to ranged weapon', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['prone'], [])
      const meleeRes = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        ['prone'],
        [],
        []
      )
      expect(meleeRes.attackBonus).toEqual([4, -1]) // 8-4, 3-4

      const bow: Weapon = {
        id: 'bow',
        name: 'Shortbow',
        type: 'ranged',
        attackBonus: [6],
        damageDice: '1d6',
        damageBonus: 0,
        critRange: 20,
        critMultiplier: 3,
        tags: [],
      }
      const rangedRes = calcEffectiveWeaponStats(
        bow,
        baseAbilities,
        effAbilities,
        ['prone'],
        [],
        []
      )
      expect(rangedRes.attackBonus).toEqual([6]) // no -4 prone melee penalty
    })

    it('populates attackBreakdown and damageBreakdown with detailed records', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['shaken'], [])
      const res = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        ['shaken'],
        [],
        []
      )
      expect(res.attackBreakdown).toContainEqual({ label: 'Base BAB/Mod', value: 8 })
      expect(res.attackBreakdown).toContainEqual({ label: 'Shaken', value: -2 })
      expect(res.damageBreakdown).toContainEqual({ label: 'Base Dmg', value: 6 })
    })

    it('sets hasteActive to true when Haste buff is active', () => {
      const hasteBuff: BuffToggle = {
        id: 'haste',
        name: 'Haste',
        active: true,
        attackMod: 1,
        damageMod: 0,
        acMod: 1,
      }
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [hasteBuff])
      const res = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        [],
        [hasteBuff],
        ['haste']
      )
      expect(res.hasteActive).toBe(true)
      expect(res.attackBonus).toEqual([9, 4]) // 8+1, 3+1
    })
  })

  describe('calcEffectiveSkills', () => {
    const skills: Skill[] = [
      { id: 'ath', name: 'Athletics', ability: 'str', ranks: 2, classSkill: true, trained: true, miscBonus: 0, armorCheckPenalty: true },
      { id: 'per', name: 'Perception', ability: 'wis', ranks: 4, classSkill: true, trained: true, miscBonus: 0, armorCheckPenalty: false },
      { id: 'kno', name: 'Knowledge Arcana', ability: 'int', ranks: 3, classSkill: true, trained: true, miscBonus: 0, armorCheckPenalty: false },
    ]

    it('applies Shaken (-2 to all skill checks)', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['shaken'], [])
      const res = calcEffectiveSkills(skills, baseAbilities, effAbilities, ['shaken'])
      // Athletics base: 2 ranks + 3 class + 4 str = 9 -> minus 2 shaken = 7
      expect(res[0].effectiveTotal).toBe(7)
      // Perception base: 4 ranks + 3 class + 1 wis = 8 -> minus 2 shaken = 6
      expect(res[1].effectiveTotal).toBe(6)
    })

    it('applies Blinded (-4) to Perception and STR/DEX skills, but not INT skills', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['blinded'], [])
      const res = calcEffectiveSkills(skills, baseAbilities, effAbilities, ['blinded'])
      // Athletics (STR): 2 ranks + 3 class + 4 str = 9 -> minus 4 blinded = 5
      expect(res[0].effectiveTotal).toBe(5)
      // Perception (WIS, but has perception in name): 4 ranks + 3 class + 1 wis = 8 -> minus 4 blinded = 4
      expect(res[1].effectiveTotal).toBe(4)
      // Knowledge (INT): 3 ranks + 3 class + 0 int = 6 -> unaffected by blinded
      expect(res[2].effectiveTotal).toBe(6)
    })

    it('applies Sickened and Frightened (-2 each)', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, ['sickened', 'frightened'], [])
      const res = calcEffectiveSkills(skills, baseAbilities, effAbilities, ['sickened', 'frightened'])
      // Athletics: 9 - 2 - 2 = 5
      expect(res[0].effectiveTotal).toBe(5)
    })
  })

  describe('getActiveActionRestrictions', () => {
    it('returns warning for Nauseated and danger for Stunned', () => {
      const alerts = getActiveActionRestrictions(['nauseated', 'stunned'])
      expect(alerts).toHaveLength(2)
      expect(alerts[0].condition).toBe('nauseated')
      expect(alerts[1].condition).toBe('stunned')
    })

    it('handles all 6 recognized restriction conditions', () => {
      const conditions = ['nauseated', 'stunned', 'paralyzed', 'dazed', 'prone', 'blinded'] as const
      const alerts = getActiveActionRestrictions([...conditions])
      expect(alerts).toHaveLength(6)

      const conds = alerts.map((a) => a.condition)
      expect(conds).toEqual(['nauseated', 'stunned', 'paralyzed', 'dazed', 'prone', 'blinded'])
    })

    it('returns empty array when conditions list has no restrictions', () => {
      expect(getActiveActionRestrictions([])).toEqual([])
      expect(getActiveActionRestrictions(['shaken', 'fatigued'])).toEqual([])
    })
  })
})
