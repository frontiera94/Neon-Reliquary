import { describe, it, expect } from 'vitest'
import {
  calcEffectiveAbilities,
  calcEffectiveSaves,
  calcEffectiveArmorClass,
  calcDetailedAcBreakdowns,
  calcCombatManeuvers,
  calcEffectiveWeaponStats,
  calcEffectiveSkills,
  getActiveActionRestrictions,
  resolveEffectiveArmorBase,
  calcEffectiveMaxHp,
  checkBloodrageExitSafety,
  evaluateBloodrageExitRisk,
  getSpellFocusBonus,
  deriveBuffFromSpell,
} from './stat-calc'
import { spellToBuff } from './spell-buffs'
import type { Spell } from '../types/resources'
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
      expect(res.touch).toBe(12) // Shield bonus does not apply to Touch AC
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
      // Two-handed weapon gets 1.5x STR damage: base 6 (4*1.5) + delta 3 (6*1.5 - 4*1.5) = 9
      expect(res.damageBonus).toBe(9)

      // Verify one-handed weapon gets standard 1x STR damage
      const oneHandedSword: Weapon = {
        ...sword,
        id: 'longsword',
        name: 'Longsword',
        damageBonus: 4,
        tags: [],
      }
      const oneHandedRes = calcEffectiveWeaponStats(
        oneHandedSword,
        baseAbilities,
        effAbilities,
        [],
        [bull],
        ['bull']
      )
      // 4 base + 2 shift = 6
      expect(oneHandedRes.damageBonus).toBe(6)
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

    it('does not leak meleeOnly extraDamageDice to ranged weapons', () => {
      const jabbingBuff: BuffToggle = {
        id: 'jabbing-style',
        name: 'Jabbing Style',
        active: true,
        attackMod: 0,
        damageMod: 0,
        acMod: 0,
        extraDamageDice: '1d6',
        meleeOnly: true,
      }
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
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [jabbingBuff])
      const meleeRes = calcEffectiveWeaponStats(
        sword,
        baseAbilities,
        effAbilities,
        [],
        [jabbingBuff],
        ['jabbing-style']
      )
      expect(meleeRes.extraDamageDice).toBe('1d6')
      expect(meleeRes.extraDiceLabel).toBe('Jabbing Style')

      const rangedRes = calcEffectiveWeaponStats(
        bow,
        baseAbilities,
        effAbilities,
        [],
        [jabbingBuff],
        ['jabbing-style']
      )
      expect(rangedRes.extraDamageDice).toBeUndefined()
      expect(rangedRes.extraDiceLabel).toBeUndefined()
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

    it('applies armor check penalty only to skills with armorCheckPenalty: true', () => {
      const effAbilities = calcEffectiveAbilities(baseAbilities, [], [])
      const res = calcEffectiveSkills(skills, baseAbilities, effAbilities, [], 3)
      // Athletics (ACP true): 9 - 3 = 6
      expect(res[0].effectiveTotal).toBe(6)
      expect(res[0].breakdown).toContainEqual({ label: 'Armor Check Penalty', value: -3 })
      // Perception (ACP false): 8 (unaffected)
      expect(res[1].effectiveTotal).toBe(8)
      // Knowledge (ACP false): 6 (unaffected)
      expect(res[2].effectiveTotal).toBe(6)
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

  describe('M1: AC Bonus Separation, Melding & Bloodrage HP Lifecycle', () => {
    const noorieBaseAc: ArmorClass = {
      total: 15,
      touch: 13,
      flatFooted: 12,
      armorBonus: 2,
      shieldBonus: 0,
      dexBonus: 3,
      naturalArmor: 0,
      deflection: 0,
      misc: 0,
      spellFailureChance: 10,
    }

    const agelmundBaseAc: ArmorClass = {
      total: 16,
      touch: 16,
      flatFooted: 13,
      armorBonus: 0,
      shieldBonus: 0,
      dexBonus: 2,
      naturalArmor: 0,
      deflection: 0,
      misc: 4,
      spellFailureChance: 0,
    }

    describe('AC Bonus Categorization', () => {
      it('applies natural armor buff (Barkskin) to Total and Flat-Footed, but NOT Touch', () => {
        const barkskin: BuffToggle = {
          id: 'barkskin',
          name: 'Barkskin (+2 Natural Armor)',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 2,
          acType: 'natural',
        }
        const res = calcEffectiveArmorClass(noorieBaseAc, 3, 3, [], [barkskin])
        expect(res.total).toBe(17)
        expect(res.touch).toBe(13) // Unchanged!
        expect(res.flatFooted).toBe(14)
      })

      it('applies dodge bonus (Ki Defense +4) to Total and Touch, but NOT Flat-Footed without Uncanny Dodge', () => {
        const kiDefense: BuffToggle = {
          id: 'ki-defense',
          name: 'Ki Defense (+4 Dodge)',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 4,
          acType: 'dodge',
        }
        const res = calcEffectiveArmorClass(agelmundBaseAc, 2, 2, [], [kiDefense], { hasUncannyDodge: false })
        expect(res.total).toBe(20)
        expect(res.touch).toBe(20)
        expect(res.flatFooted).toBe(13) // Dodge lost on flat-footed without Uncanny Dodge
      })

      it('applies dodge bonus to Flat-Footed when character has Uncanny Dodge', () => {
        const kiDefense: BuffToggle = {
          id: 'ki-defense',
          name: 'Ki Defense (+4 Dodge)',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 4,
          acType: 'dodge',
        }
        const res = calcEffectiveArmorClass(agelmundBaseAc, 2, 2, [], [kiDefense], { hasUncannyDodge: true })
        expect(res.total).toBe(20)
        expect(res.touch).toBe(20)
        // With Uncanny Dodge: base flat-footed 13 + 2 DEX + 4 Dodge = 19
        expect(res.flatFooted).toBe(19)
      })

      it('applies size AC bonus to Total, Touch, and Flat-Footed', () => {
        const sizeBuff: BuffToggle = {
          id: 'small-size',
          name: 'Small Size Bonus',
          active: true,
          attackMod: 1,
          damageMod: 0,
          acMod: 1,
          acType: 'size',
        }
        const res = calcEffectiveArmorClass(noorieBaseAc, 3, 3, [], [sizeBuff])
        expect(res.total).toBe(16)
        expect(res.touch).toBe(14)
        expect(res.flatFooted).toBe(13)
      })

      it('applies deflection bonus to Total, Touch, and Flat-Footed', () => {
        const shieldOfFaith: BuffToggle = {
          id: 'shield-of-faith',
          name: 'Shield of Faith',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 2,
          acType: 'deflection',
        }
        const res = calcEffectiveArmorClass(noorieBaseAc, 3, 3, [], [shieldOfFaith])
        expect(res.total).toBe(17)
        expect(res.touch).toBe(15)
        expect(res.flatFooted).toBe(14)
      })

      it('heuristically classifies legacy buff without acType', () => {
        const legacyBarkskin: BuffToggle = {
          id: 'spell-barkskin',
          name: 'Barkskin (+2 Natural)',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 2,
        }
        const res = calcEffectiveArmorClass(noorieBaseAc, 3, 3, [], [legacyBarkskin])
        expect(res.total).toBe(17)
        expect(res.touch).toBe(13) // Natural detected heuristically -> Touch unaffected!
        expect(res.flatFooted).toBe(14)
      })

      it('suppresses dodge bonus when character is paralyzed / losing Dex', () => {
        const kiDefense: BuffToggle = {
          id: 'ki-defense',
          name: 'Ki Defense',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 4,
          acType: 'dodge',
        }
        const res = calcEffectiveArmorClass(agelmundBaseAc, 2, 2, ['paralyzed'], [kiDefense])
        expect(res.total).toBe(14) // 16 - 2
        expect(res.touch).toBe(14)
        expect(res.notes).toContain('Ki Defense (Dodge bonus negated while DEX denied)')
      })
    })

    describe('Detailed AC Breakdowns', () => {
      it('correctly filters bonuses into totalBreakdown, touchBreakdown, and flatFootedBreakdown', () => {
        const barkskin: BuffToggle = {
          id: 'barkskin',
          name: 'Barkskin',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 2,
          acType: 'natural',
        }
        const kiDefense: BuffToggle = {
          id: 'ki-defense',
          name: 'Ki Defense',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 4,
          acType: 'dodge',
        }

        const bd = calcDetailedAcBreakdowns(noorieBaseAc, 3, [], [barkskin, kiDefense], { hasUncannyDodge: false })
        expect(bd.totalBreakdown).toContainEqual({ label: 'Barkskin', value: 2 })
        expect(bd.totalBreakdown).toContainEqual({ label: 'Ki Defense', value: 4 })

        expect(bd.touchBreakdown).toContainEqual({ label: 'Ki Defense', value: 4 })
        expect(bd.touchBreakdown.some((b) => b.label === 'Barkskin')).toBe(false)

        expect(bd.flatFootedBreakdown).toContainEqual({ label: 'Barkskin', value: 2 })
        expect(bd.flatFootedBreakdown.some((b) => b.label === 'Ki Defense')).toBe(false)
      })
    })

    describe('calcCombatManeuvers CMD Dodge Integration', () => {
      it('adds active dodge bonus to CMD', () => {
        const mockMonk = {
          class: 'Monk',
          level: 4,
          race: 'Human',
          baseAttackBonus: [4],
          armorClass: agelmundBaseAc,
        }
        const monkAbilities = { str: 20, dex: 14, con: 14, int: 8, wis: 14, cha: 12 }
        const effAbilities = calcEffectiveAbilities(monkAbilities, [], [])
        const kiDefense: BuffToggle = {
          id: 'ki-defense',
          name: 'Ki Defense',
          active: true,
          attackMod: 0,
          damageMod: 0,
          acMod: 4,
          acType: 'dodge',
        }
        const res = calcCombatManeuvers(mockMonk, effAbilities, [], [kiDefense])
        expect(res.cmd).toBe(27)
        expect(res.breakdownCmd).toContainEqual({ label: 'Ki Defense (Dodge)', value: 4 })
      })
    })

    describe('resolveEffectiveArmorBase (Wild Shape Melding)', () => {
      it('returns identity base AC when wild shape is inactive', () => {
        const res = resolveEffectiveArmorBase(noorieBaseAc, { wildShapeActive: false })
        expect(res).toEqual(noorieBaseAc)
      })

      it('melds non-Wild leather armor zeroing armor bonus, shield bonus, and ASF for Wolf form', () => {
        const res = resolveEffectiveArmorBase(noorieBaseAc, {
          wildShapeActive: true,
          formSize: 'Medium',
          naturalArmorBonus: 2,
        })
        expect(res.armorBonus).toBe(0)
        expect(res.shieldBonus).toBe(0)
        expect(res.spellFailureChance).toBe(0)
        expect(res.naturalArmor).toBe(2)
        expect(res.total).toBe(15) // 10 + 0 armor + 3 dex + 2 nat
        expect(res.touch).toBe(13) // 10 + 3 dex
        expect(res.flatFooted).toBe(12) // 10 + 0 armor + 2 nat
      })

      it('melds armor to 0, adds +1 natural armor and +1 size AC for Eagle form', () => {
        const res = resolveEffectiveArmorBase(noorieBaseAc, {
          wildShapeActive: true,
          formSize: 'Small',
          naturalArmorBonus: 1,
        })
        expect(res.armorBonus).toBe(0)
        expect(res.naturalArmor).toBe(1)
        expect(res.misc).toBe(1) // size bonus in misc
        expect(res.total).toBe(15) // 10 + 3 dex + 1 nat + 1 size
        expect(res.touch).toBe(14) // 10 + 3 dex + 1 size
        expect(res.flatFooted).toBe(12) // 10 + 1 nat + 1 size
      })

      it('preserves armor bonus if armor has the Wild property (retainsArmor: true)', () => {
        const res = resolveEffectiveArmorBase(noorieBaseAc, {
          wildShapeActive: true,
          formSize: 'Medium',
          naturalArmorBonus: 2,
          retainsArmor: true,
        })
        expect(res.armorBonus).toBe(2)
        expect(res.naturalArmor).toBe(2)
        expect(res.total).toBe(17) // 10 + 2 armor + 3 dex + 2 nat
      })
    })

    describe('Bloodrage CON HP Lifecycle', () => {
      it('calculates effective max HP with +4 CON (+2 mod) at Level 4 (+8 HP)', () => {
        const eff = calcEffectiveMaxHp(51, 4, 3, 5)
        expect(eff).toBe(59)
      })

      it('clamps effective max HP to a minimum of 1 on massive CON penalty', () => {
        const eff = calcEffectiveMaxHp(10, 4, 2, -5)
        expect(eff).toBe(1)
      })

      it('evaluates safe, unconscious, and lethal exit thresholds via checkBloodrageExitSafety', () => {
        const safe = checkBloodrageExitSafety(35, 4, 4, 16)
        expect(safe.isLethal).toBe(false)
        expect(safe.isUnconscious).toBe(false)
        expect(safe.severity).toBe('none')

        const disabled = checkBloodrageExitSafety(8, 4, 4, 16)
        expect(disabled.isLethal).toBe(true)
        expect(disabled.isUnconscious).toBe(true)
        expect(disabled.isInstantDeath).toBe(false)
        expect(disabled.severity).toBe('danger')

        const dying = checkBloodrageExitSafety(5, 4, 4, 16)
        expect(dying.isLethal).toBe(true)
        expect(dying.isUnconscious).toBe(true)
        expect(dying.isInstantDeath).toBe(false)
        expect(dying.severity).toBe('danger')

        const dead = checkBloodrageExitSafety(-8, 4, 4, 16)
        expect(dead.isLethal).toBe(true)
        expect(dead.isInstantDeath).toBe(true)
        expect(dead.severity).toBe('danger')

        const risk = evaluateBloodrageExitRisk(20, 16, 4)
        expect(risk.isLethal).toBe(false)
        expect(risk.projectedHp).toBe(12)
      })
    })
  })

  describe('getSpellFocusBonus', () => {
    it('returns +1 for Spell Focus and +2 for Greater Spell Focus (case-insensitive)', () => {
      const feats = [
        { id: 'sf-evo', name: 'Spell Focus (Evocation)', category: 'general' as const, description: '' },
        { id: 'gsf-nec', name: 'Greater Spell Focus (Necromancy)', category: 'general' as const, description: '' },
      ]
      expect(getSpellFocusBonus('evocation', feats)).toBe(1)
      expect(getSpellFocusBonus('NECROMANCY', feats)).toBe(2)
      expect(getSpellFocusBonus('Illusion', feats)).toBe(0)
      expect(getSpellFocusBonus('Evocation', undefined)).toBe(0)
    })
  })

  describe('calcDetailedAcBreakdowns', () => {
    it('includes misc bonus in totalBreakdown, touchBreakdown, and flatFootedBreakdown', () => {
      const baseAc: ArmorClass = {
        total: 19,
        touch: 13,
        flatFooted: 17,
        armorBonus: 4,
        shieldBonus: 2,
        dexBonus: 2,
        naturalArmor: 0,
        deflection: 0,
        misc: 1,
        spellFailureChance: 0,
      }
      const breakdowns = calcDetailedAcBreakdowns(baseAc, 2, [], [])

      expect(breakdowns.totalBreakdown).toContainEqual({ label: 'Misc', value: 1 })
      expect(breakdowns.touchBreakdown).toContainEqual({ label: 'Misc', value: 1 })
      expect(breakdowns.flatFootedBreakdown).toContainEqual({ label: 'Misc', value: 1 })
    })
  })

  describe('calcEffectiveArmorClass negative DEX & deriveBuffFromSpell / spellToBuff parity', () => {
    it('penalizes flatFooted AC when effectiveDexMod becomes negative (e.g. Paralyzed)', () => {
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
      // Paralyzed sets DEX to 0 (mod -5) from base DEX 14 (mod +2)
      const res = calcEffectiveArmorClass(baseAc, 2, -5, ['paralyzed'], [])
      expect(res.total).toBe(11)
      expect(res.touch).toBe(5)
      expect(res.flatFooted).toBe(11)
    })

    it('derives consistent modifiers in deriveBuffFromSpell and spellToBuff including Shield of Faith (+2 AC) vs Shield (+4 AC)', () => {
      const makeSpell = (id: string, name: string, level = 1): Spell => ({
        id,
        name,
        level,
        school: 'Abjuration',
        castingTime: '1 standard action',
        range: 'Personal',
        duration: '1 min./level',
        description: '',
        spellResistance: false,
        components: 'V, S',
      })

      const shieldOfFaith = deriveBuffFromSpell(makeSpell('sof', 'Shield of Faith'))
      const shield = deriveBuffFromSpell(makeSpell('shd', 'Shield'))
      const haste = deriveBuffFromSpell(makeSpell('hst', 'Haste', 3))
      const divineFavor = spellToBuff(makeSpell('df', 'Divine Favor', 1))

      expect(shieldOfFaith.acMod).toBe(2)
      expect(shield.acMod).toBe(4)
      expect(haste).toMatchObject({ attackMod: 1, acMod: 1, saveMod: { ref: 1 } })
      expect(divineFavor).toMatchObject({ attackMod: 1, damageMod: 1, spellId: 'df' })
    })
  })
})
