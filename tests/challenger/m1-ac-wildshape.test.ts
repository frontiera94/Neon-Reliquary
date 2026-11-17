import { describe, it, expect } from 'vitest'
import {
  calcEffectiveArmorClass,
  calcDetailedAcBreakdowns,
  calcCombatManeuvers,
  resolveEffectiveArmorBase,
  calcEffectiveAbilities,
  classifyAcBonusType,
  calcEffectiveMaxHp,
  checkBloodrageExitSafety,
} from '../../src/lib/stat-calc'
import type { ArmorClass } from '../../src/types/defense'
import type { BuffToggle } from '../../src/types/combat'
import marianoData from '../../src/data/mariano-cardamomo.json'
import knamData from '../../src/data/knam.json'

describe('M1 Challenger Hardening Suite: AC Engine & Polymorph Melding', () => {
  /* -------------------------------------------------------------------------- */
  /* Vector 1: Uncanny Dodge & Flat-Footed DEX Double-Counting                  */
  /* -------------------------------------------------------------------------- */
  describe('Vector 1: Uncanny Dodge & Flat-Footed DEX Double-Counting', () => {
    it('CHALLENGE: Mariano (Uncanny Dodge) must not exceed Total AC when Flat-Footed', () => {
      // Mariano has DEX 20 (+5 mod).
      // marianoData.armorClass.flatFooted is 20 in his JSON (already includes +5 DEX for Uncanny Dodge).
      const baseAc = marianoData.armorClass as ArmorClass
      const baseDexMod = 5
      const effDexMod = 5

      const result = calcEffectiveArmorClass(baseAc, baseDexMod, effDexMod, [], [], {
        hasUncannyDodge: true,
      })

      // In PF1e rules, Uncanny Dodge allows retaining DEX on flat-footed AC.
      // Therefore, Flat-Footed AC should NEVER exceed Total AC due to Dex retention!
      // Mariano's total AC is 20. His flat-footed AC should be 20, NOT 25!
      expect(result.total).toBe(20)
      expect(result.flatFooted).toBe(20)
    })

    it('CHALLENGE: Knam (Uncanny Dodge) must not exceed Total AC when Flat-Footed', () => {
      // Knam has DEX 14 (+2 mod).
      // knamData.armorClass.flatFooted is 19 in his JSON (already includes +2 DEX for Uncanny Dodge).
      const baseAc = knamData.armorClass as ArmorClass
      const baseDexMod = 2
      const effDexMod = 2

      const result = calcEffectiveArmorClass(baseAc, baseDexMod, effDexMod, [], [], {
        hasUncannyDodge: true,
      })

      // Knam's total AC is 19. His flat-footed AC should be 19, NOT 21!
      expect(result.total).toBe(19)
      expect(result.flatFooted).toBe(19)
    })

    it('CHALLENGE: calcEffectiveArmorClass and calcDetailedAcBreakdowns must produce identical Flat-Footed totals', () => {
      const baseAc = marianoData.armorClass as ArmorClass
      const effAc = calcEffectiveArmorClass(baseAc, 5, 5, [], [], { hasUncannyDodge: true })
      const bd = calcDetailedAcBreakdowns(baseAc, 5, [], [], { hasUncannyDodge: true })

      const breakdownSum = bd.flatFootedBreakdown.reduce((sum, item) => sum + item.value, 0)
      // Both the badge number and the tooltip breakdown must match!
      expect(effAc.flatFooted).toBe(breakdownSum)
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 2: Negative DEX & Condition Handling on Flat-Footed AC              */
  /* -------------------------------------------------------------------------- */
  describe('Vector 2: Negative DEX & Condition Handling on Flat-Footed AC', () => {
    it('CHALLENGE: Paralyzed condition (effective DEX 0, mod -5) must reduce Flat-Footed AC', () => {
      // Base character: DEX 16 (+3 mod), total AC 13, touch 13, flat-footed 10 (no armor)
      const baseAc: ArmorClass = {
        total: 13,
        touch: 13,
        flatFooted: 10,
        armorBonus: 0,
        shieldBonus: 0,
        dexBonus: 3,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 0,
      }

      // Paralyzed sets DEX to 0, which gives mod -5.
      const abilities = calcEffectiveAbilities(
        { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
        ['paralyzed'],
        []
      )
      expect(abilities.mods.dex).toBe(-5)

      const result = calcEffectiveArmorClass(baseAc, 3, abilities.mods.dex, ['paralyzed'], [])

      // In PF1e, a paralyzed character has DEX 0 (-5 mod).
      // Total AC = 10 - 5 = 5.
      // Touch AC = 10 - 5 = 5.
      // Flat-Footed AC in PF1e ALWAYS applies Dexterity penalties!
      // Flat-Footed AC should be 10 - 5 = 5, NOT 10!
      // A paralyzed creature cannot have a higher AC when flat-footed than normal!
      expect(result.total).toBe(5)
      expect(result.flatFooted).toBe(5)
    })

    it('CHALLENGE: Dex drain to negative modifier must reduce Flat-Footed AC', () => {
      // Base character: DEX 14 (+2 mod), AC 12 / 12 / 10
      const baseAc: ArmorClass = {
        total: 12,
        touch: 12,
        flatFooted: 10,
        armorBonus: 0,
        shieldBonus: 0,
        dexBonus: 2,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 0,
      }

      // Drained to DEX 6 (mod -2)
      const result = calcEffectiveArmorClass(baseAc, 2, -2, [], [])

      // Total AC = 10 - 2 = 8
      // Touch AC = 10 - 2 = 8
      // Flat-Footed AC = 10 - 2 = 8 (Dex penalty applies to flat-footed)
      expect(result.total).toBe(8)
      expect(result.flatFooted).toBe(8)
    })

    it('VERIFIED: Blinded condition negates Dodge bonuses and denies DEX even with Uncanny Dodge', () => {
      const baseAc: ArmorClass = {
        total: 13,
        touch: 13,
        flatFooted: 10,
        armorBonus: 0,
        shieldBonus: 0,
        dexBonus: 3,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 0,
      }

      const dodgeBuff: BuffToggle = {
        id: 'ki-defense',
        name: 'Ki Defense',
        acMod: 4,
        acType: 'dodge',
        attackMod: 0,
        damageMod: 0,
        active: true,
      }

      const result = calcEffectiveArmorClass(
        baseAc,
        3,
        3,
        ['blinded'],
        [dodgeBuff],
        { hasUncannyDodge: true }
      )

      // Blinded:
      // - Loses Dex bonus (+3 removed from total and touch)
      // - Specific condition penalty: -2 to Total, Touch, Flat-Footed
      // - Dodge bonus is negated when Dex is denied
      // - Uncanny Dodge cannot prevent Dex denial from Blinded
      // Total AC: 10 (base) + 0 (dex denied) - 2 (blinded) = 8
      // Touch AC: 10 (base) + 0 (dex denied) - 2 (blinded) = 8
      // Flat-Footed AC: 10 (base) - 2 (blinded) = 8
      expect(result.total).toBe(8)
      expect(result.touch).toBe(8)
      expect(result.flatFooted).toBe(8)
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 3: Bonus Types & Negative Penalties across AC and CMD               */
  /* -------------------------------------------------------------------------- */
  describe('Vector 3: Bonus Types & Negative Penalties across AC and CMD', () => {
    it('CHALLENGE: AC penalties (e.g. Bloodrage -2 AC) must apply to CMD', () => {
      // In PF1e rules (CRB p. 199): "Any penalties to a creature's AC also apply to its CMD."
      const bloodrageBuff: BuffToggle = {
        id: 'bloodrage',
        name: 'Bloodrage',
        acMod: -2,
        attackMod: 0,
        damageMod: 0,
        active: true,
      }

      const char = {
        class: 'Bloodrager',
        level: 4,
        race: 'Human',
        baseAttackBonus: [4],
        armorClass: {
          total: 19,
          touch: 12,
          flatFooted: 19,
          armorBonus: 6,
          shieldBonus: 0,
          dexBonus: 2,
          naturalArmor: 1,
          deflection: 0,
          misc: 0,
          spellFailureChance: 25,
        },
      }

      const effectiveAbilities = {
        scores: { str: 20, dex: 14, con: 18, int: 10, wis: 10, cha: 12 },
        mods: { str: 5, dex: 2, con: 4, int: 0, wis: 0, cha: 1 },
        deltas: { str: 2, dex: 0, con: 2, int: 0, wis: 0, cha: 0 },
        breakdowns: {
          str: [], dex: [], con: [], int: [], wis: [], cha: [],
        },
      }

      const maneuvers = calcCombatManeuvers(char, effectiveAbilities, [], [bloodrageBuff])

      // CMD Base = 10 + BAB(4) + STR(5) + DEX(2) = 21.
      // With Bloodrage -2 AC penalty: CMD should be 21 - 2 = 19!
      expect(maneuvers.cmd).toBe(19)
    })

    it('CHALLENGE: Active deflection buff must apply to CMD', () => {
      // Shield of Faith gives +2 deflection bonus to AC.
      // In PF1e: Deflection bonuses to AC apply to CMD.
      const shieldOfFaith: BuffToggle = {
        id: 'shield-of-faith',
        name: 'Shield of Faith',
        acMod: 2,
        acType: 'deflection',
        attackMod: 0,
        damageMod: 0,
        active: true,
      }

      const char = {
        class: 'Cleric',
        level: 4,
        race: 'Human',
        baseAttackBonus: [3],
        armorClass: {
          total: 10,
          touch: 10,
          flatFooted: 10,
          armorBonus: 0,
          shieldBonus: 0,
          dexBonus: 0,
          naturalArmor: 0,
          deflection: 0,
          misc: 0,
          spellFailureChance: 0,
        },
      }

      const effectiveAbilities = {
        scores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        mods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        deltas: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
        breakdowns: { str: [], dex: [], con: [], int: [], wis: [], cha: [] },
      }

      const maneuvers = calcCombatManeuvers(char, effectiveAbilities, [], [shieldOfFaith])

      // CMD = 10 + 3(BAB) + 0(STR) + 0(DEX) + 2(Deflection) = 15
      expect(maneuvers.cmd).toBe(15)
    })

    it('CHALLENGE: classifyAcBonusType should identify armor and shield in buff names to avoid touch AC leak', () => {
      const mageArmorBuff: BuffToggle = {
        id: 'mage-armor',
        name: 'Mage Armor',
        acMod: 4,
        attackMod: 0,
        damageMod: 0,
        active: true,
      }
      const shieldSpellBuff: BuffToggle = {
        id: 'shield-spell',
        name: 'Shield',
        acMod: 4,
        attackMod: 0,
        damageMod: 0,
        active: true,
      }

      // Without explicit acType, buff names containing "armor" or "shield" should NOT be classified as 'other'
      // because 'other' leaks into Touch AC!
      expect(classifyAcBonusType(mageArmorBuff)).toBe('armor')
      expect(classifyAcBonusType(shieldSpellBuff)).toBe('shield')
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 4: Wild Shape Polymorph Melding Edge Cases                          */
  /* -------------------------------------------------------------------------- */
  describe('Vector 4: Polymorph Armor Melding in resolveEffectiveArmorBase', () => {
    it('CHALLENGE: Melded non-Wild armor must not retain ACP and ASF when a Wild shield is equipped', () => {
      // Druid wearing Hide Armor (ACP -3, ASF 20%, armor +4) and carrying a Heavy Wooden Shield (ACP -2, ASF 15%, shield +2)
      // Total base: armorBonus 4, shieldBonus 2, spellFailureChance 35%, armorCheckPenalty -5.
      const baseAc: ArmorClass = {
        total: 16,
        touch: 10,
        flatFooted: 16,
        armorBonus: 4,
        shieldBonus: 2,
        dexBonus: 0,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 35,
        armorCheckPenalty: -5,
      }

      // Entering Wild Shape with non-wild armor and a Wild shield (isWildShield: true, retainsArmor: false)
      const transformedAc = resolveEffectiveArmorBase(baseAc, {
        active: true,
        retainsArmor: false,
        isWildShield: true,
        naturalArmorBonus: 2,
        formSize: 'Medium',
      })

      // Armor melds: armorBonus becomes 0.
      expect(transformedAc.armorBonus).toBe(0)
      // Shield is retained: shieldBonus remains 2.
      expect(transformedAc.shieldBonus).toBe(2)

      // Melded non-wild armor cannot impose ACP or ASF while melded into animal flesh!
      // In current code: (retainsArmor || retainsShield) keeps ALL 35% ASF and -5 ACP!
      expect(transformedAc.spellFailureChance).toBeLessThan(35)
      expect(transformedAc.armorCheckPenalty).toBeGreaterThan(-5)
    })

    it('CHALLENGE: resolveEffectiveArmorBase with empty params {} should NOT silently activate wild shape', () => {
      const baseAc: ArmorClass = {
        total: 16,
        touch: 12,
        flatFooted: 14,
        armorBonus: 4,
        shieldBonus: 0,
        dexBonus: 2,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 20,
        armorCheckPenalty: -2,
      }

      // If called with empty params or undefined active flags, it should not zero armorBonus by default!
      const result = resolveEffectiveArmorBase(baseAc, {})

      // If active is not specified, it should NOT assume wild shape is active and meld armor!
      expect(result.armorBonus).toBe(4)
    })

    it('VERIFIED: Standard Wild Shape melds non-Wild armor and shield completely', () => {
      const baseAc: ArmorClass = {
        total: 16,
        touch: 12,
        flatFooted: 14,
        armorBonus: 4,
        shieldBonus: 0,
        dexBonus: 2,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 20,
        armorCheckPenalty: -2,
      }

      // Entering Wolf form (Medium, +2 Natural Armor)
      const wolfAc = resolveEffectiveArmorBase(baseAc, {
        active: true,
        naturalArmorBonus: 2,
        formSize: 'Medium',
      })

      expect(wolfAc.armorBonus).toBe(0)
      expect(wolfAc.shieldBonus).toBe(0)
      expect(wolfAc.spellFailureChance).toBe(0)
      expect(wolfAc.armorCheckPenalty).toBe(0)
      expect(wolfAc.naturalArmor).toBe(2)
      expect(wolfAc.total).toBe(14) // 10 + 2 dex + 2 nat
      expect(wolfAc.touch).toBe(12) // 10 + 2 dex
      expect(wolfAc.flatFooted).toBe(12) // 10 + 2 nat
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 5: Bloodrage HP Calculations & Lethal Exit Risk                      */
  /* -------------------------------------------------------------------------- */
  describe('Vector 5: Bloodrage HP & Lethal Exit Resilience', () => {
    it('VERIFIED: calcEffectiveMaxHp adds +2 HP per level in Bloodrage', () => {
      // Lv 4 Knam: base max HP 51, base CON 14 (+2), rage CON 18 (+4) -> delta = +2
      const effMaxHp = calcEffectiveMaxHp(51, 4, 2, 4)
      expect(effMaxHp).toBe(59) // 51 + 2 * 4 = 59
    })

    it('VERIFIED: checkBloodrageExitSafety flags instant death at -CON', () => {
      // Level 4, base CON 14. Exit deducts 8 HP.
      // If current HP is -6, exit drops to -14 (<= -14) -> instant death!
      const safety = checkBloodrageExitSafety(-6, 4, 4, 14)
      expect(safety.isInstantDeath).toBe(true)
      expect(safety.severity).toBe('danger')
    })
  })
})
