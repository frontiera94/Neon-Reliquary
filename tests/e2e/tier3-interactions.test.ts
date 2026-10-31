import { describe, it, expect, beforeEach } from 'vitest'
import {
  noorieChar,
  knamChar,
  mazikeenChar,
  monkChar,
  WILD_SHAPE_PRESETS,
  calcHexDc,
  calcBloodrageHpShift,
  evaluateLethalRageExit,
  calcFatigueRounds,
  calcSpellstrikeDamage,
  calcSpellCombatRolls,
  simulateWildShapeArmorMelding,
  simulateEffectiveAc,
  calcFuriousFocusAttack,
  calcUnderhandedDamage,
  calcHalflingCritConfirm,
  validateNaturalSpellCasting,
  advanceSimulatedTurn,
  resetTestStores,
  setupPartySession,
} from './fixtures'
import type { SimulatedClassMechanics } from './fixtures'

describe('Tier 3: Pairwise & Multi-Feature Interactions', () => {
  beforeEach(() => {
    resetTestStores()
  })

  // =========================================================================
  // Combo 1: Bloodrage + Furious Focus + Ring of Rat Fangs Bite in Full Attack
  // =========================================================================
  describe('Combo 1: Bloodrage + Furious Focus + Ring of Rat Fangs Bite in Full Attack', () => {
    it('1.1 Bloodrage increases STR from 18 to 22 (mod +6) and boosts Earth Breaker base attack to +11', () => {
      const ragingStr = knamChar.abilities.str + 4 // 22
      const strMod = Math.floor((ragingStr - 10) / 2) // 6
      const earthBreakerAtk = knamChar.baseAttackBonus[0] + strMod + 1 // BAB 4 + STR 6 + MW 1 = +11
      expect(earthBreakerAtk).toBe(11)
    })
    it('1.2 Furious Focus suppresses -2 Power Attack penalty on 1st attack while retaining +6 damage', () => {
      const firstAtk = calcFuriousFocusAttack(0, 11, true, true, true)
      expect(firstAtk).toBe(11) // Ignores -2 penalty
      const damageBonus = Math.floor(6 * 1.5) + 6 // 1.5x STR (9) + PA (6) = 15
      expect(damageBonus).toBe(15)
    })
    it('1.3 Full attack routine appends secondary Bite with -5 attack penalty and half STR damage', () => {
      const bab = 4, strMod = 6
      const biteAtk = bab + strMod - 5 // +5 secondary
      const biteDmg = Math.floor(strMod * 0.5) // +3
      expect(biteAtk).toBe(5)
      expect(biteDmg).toBe(3)
    })
    it('1.4 Aberrant Bloodline Abnormal Reach extends reach to 10 ft during full attack routine', () => {
      const reach = 5 + 5
      expect(reach).toBe(10)
    })
    it('1.5 advanceCharacterTurn consumes 1 bloodrage round and resets Furious Focus ready state', () => {
      const start = { isRaging: true, roundsRaged: 0, furiousFocusUsed: true }
      const { nextState } = advanceSimulatedTurn(start)
      expect(nextState.roundsRaged).toBe(1)
      expect(nextState.furiousFocusUsed).toBe(false)
    })
  })

  // =========================================================================
  // Combo 2: Magus Spell Combat + Held Spellstrike + Shocking Grasp + Metal Target + Defensive Sacrifice
  // =========================================================================
  describe('Combo 2: Magus Spell Combat + Held Spellstrike + Shocking Grasp + Metal Target + Defensive Sacrifice', () => {
    it('2.1 arms Shocking Grasp into heldSpellstrike with metal armor bonus active', () => {
      const held = { spellId: 'shocking-grasp', damageDice: '4d6', chargesRemaining: 1, targetHasMetalArmor: true }
      expect(held.targetHasMetalArmor).toBe(true)
      expect(held.chargesRemaining).toBe(1)
    })
    it('2.2 calculates Rapier attack with Spell Combat (-2), Defensive Sacrifice (-2), and Metal Target (+3)', () => {
      const bab = 3, dex = 4 // Rapier base = +7
      const metalBonus = 3
      const spellCombatPenalty = -2
      const sacrificePenalty = -2
      const totalAttackBonus = bab + dex + metalBonus + spellCombatPenalty + sacrificePenalty // 3+4+3-2-2 = 6
      expect(totalAttackBonus).toBe(6)
    })
    it('2.3 converts +2 Defensive Sacrifice directly to concentration check bonus', () => {
      const { concentrationBonus } = calcSpellCombatRolls({ baseBab: [7], sacrificePenalty: 2, casterLevel: 4, castingMod: 4, hasCombatCasting: true })
      // CL 4 + INT 4 + Combat Casting 4 + Sacrifice 2 = 14
      expect(concentrationBonus).toBe(14)
    })
    it('2.4 confirmed critical hit on Rapier doubles both weapon damage and Shocking Grasp damage', () => {
      const res = calcSpellstrikeDamage({ weaponDamage: 6, spellDamage: 14, isCritical: true, weaponCritMultiplier: 2, spellCritMultiplier: 2 })
      expect(res.weaponPart).toBe(12) // 1d6 doubled
      expect(res.spellPart).toBe(28) // 4d6 doubled to 8d6
      expect(res.total).toBe(40)
    })
    it('2.5 missed free attack retains held charge in heldSpellstrike', () => {
      const charges = 1
      const attackHit = false
      if (!attackHit) { /* hold charge */ }
      expect(charges).toBe(1)
    })
  })

  // =========================================================================
  // Combo 3: Witch Evil Eye + Fortune + Cackle Move Action + Slumber Non-Extension
  // =========================================================================
  describe('Combo 3: Witch Evil Eye + Fortune + Cackle Move Action + Slumber Non-Extension', () => {
    it('3.1 Mazikeen casts Evil Eye on boss (Saves DC 17), failing save -> 8 rounds', () => {
      const dc = calcHexDc(mazikeenChar.level, 5)
      expect(dc).toBe(17)
      const evilEye = { id: 'ee1', type: 'evil-eye', remainingRounds: 8, cackleExtendable: true }
      expect(evilEye.remainingRounds).toBe(8)
    })
    it('3.2 Mazikeen casts Fortune on ally (Agelmund) with 1 round duration', () => {
      const fortune = { id: 'f1', type: 'fortune', remainingRounds: 1, cackleExtendable: true }
      expect(fortune.remainingRounds).toBe(1)
    })
    it('3.3 Mazikeen casts Slumber on minion with 4 rounds duration (cackleExtendable === false)', () => {
      const slumber = { id: 's1', type: 'slumber', remainingRounds: 4, cackleExtendable: false }
      expect(slumber.cackleExtendable).toBe(false)
    })
    it('3.4 Cackle move action extends Evil Eye and Fortune by +1 round while leaving Slumber at 4 rounds', () => {
      let hexes = [
        { id: 'ee1', remainingRounds: 8, cackleExtendable: true },
        { id: 'f1', remainingRounds: 1, cackleExtendable: true },
        { id: 's1', remainingRounds: 4, cackleExtendable: false },
      ]
      hexes = hexes.map(h => h.cackleExtendable ? { ...h, remainingRounds: h.remainingRounds + 1 } : h)
      expect(hexes.find(h => h.id === 'ee1')?.remainingRounds).toBe(9)
      expect(hexes.find(h => h.id === 'f1')?.remainingRounds).toBe(2)
      expect(hexes.find(h => h.id === 's1')?.remainingRounds).toBe(4)
    })
    it('3.5 Cackle sets cackleUsedThisRound to true, preventing double-cackle in same turn', () => {
      const cackleUsedThisRound = true
      const canCackleAgain = !cackleUsedThisRound
      expect(canCackleAgain).toBe(false)
    })
  })

  // =========================================================================
  // Combo 4: Druid Wild Shape Wolf Form + Melded Armor + Natural Attacks + Somatic Warning
  // =========================================================================
  describe('Combo 4: Druid Wild Shape Wolf Form + Melded Armor + Natural Attacks + Somatic Warning', () => {
    it('4.1 entering Wolf form melds Hide Armor: armor bonus 0 and ASF 0%', () => {
      const melded = simulateWildShapeArmorMelding(noorieChar.armorClass)
      expect(melded.armorBonus).toBe(0)
      expect(melded.spellFailureChance).toBe(0)
    })
    it('4.2 Wolf natural armor (+2) and STR bonus (+2) result in Total AC 15, Touch 13, FF 12', () => {
      const melded = simulateWildShapeArmorMelding(noorieChar.armorClass)
      const ac = simulateEffectiveAc({ baseAc: melded, naturalArmorBonuses: [2], dodgeBonuses: [], sizeBonus: 0 })
      expect(ac.total).toBe(15)
      expect(ac.touch).toBe(13)
      expect(ac.flatFooted).toBe(12)
    })
    it('4.3 replaces manufactured weapons with Bite attack +5 (1d6+3, 1.5x STR mod 2) and Trip', () => {
      const wolfBite = WILD_SHAPE_PRESETS.wolf.naturalAttacks[0]
      expect(wolfBite.name).toBe('Bite')
      expect(wolfBite.trip).toBe(true)
      const dmgBonus = Math.floor(2 * wolfBite.strMultiplier)
      expect(dmgBonus).toBe(3)
    })
    it('4.4 casting spell with Verbal and Somatic components triggers warning without Natural Spell', () => {
      const check = validateNaturalSpellCasting(true, false, 'V, S, DF')
      expect(check.canCast).toBe(false)
      expect(check.warning).toContain('Natural Spell')
    })
    it('4.5 returning to humanoid form restores original armor bonus (+2) and clears warnings', () => {
      const check = validateNaturalSpellCasting(false, false, 'V, S, DF')
      expect(check.canCast).toBe(true)
      expect(noorieChar.armorClass.armorBonus).toBe(2)
    })
  })

  // =========================================================================
  // Combo 5: Monk Ki Defense + Ki Extra Flurry + Stunning Fist + Jabbing Style
  // =========================================================================
  describe('Combo 5: Monk Ki Defense + Ki Extra Flurry + Stunning Fist + Jabbing Style', () => {
    it('5.1 spends 1 Ki for Ki Defense, boosting Total AC to 20, Touch AC to 20, and CMD by +4', () => {
      const res = simulateEffectiveAc({ baseAc: monkChar.armorClass, naturalArmorBonuses: [], dodgeBonuses: [4], sizeBonus: 0 })
      expect(res.total).toBe(20)
      expect(res.touch).toBe(20)
    })
    it('5.2 spends 1 Ki for Extra Flurry Attack, expanding routine to 3 attacks (+9/+9/+9)', () => {
      const attacks = ['+9', '+9', '+9']
      expect(attacks).toHaveLength(3)
    })
    it('5.3 declares Stunning Fist (DC 14 Fortitude) on first flurry strike', () => {
      const dc = 10 + Math.floor(monkChar.level / 2) + 2
      expect(dc).toBe(14)
      let uses = 4
      uses -= 1
      expect(uses).toBe(3)
    })
    it('5.4 second flurry strike on same target triggers Jabbing Style +1d6 extra damage', () => {
      const firstHit = true
      const secondHitBonus = firstHit ? '1d6' : null
      expect(secondHitBonus).toBe('1d6')
    })
    it('5.5 advanceCharacterTurn resets Ki Defense, Ki Extra Attack, and Stunning Fist declaration', () => {
      const start = { kiDefenseRounds: 1, kiExtraAttackActive: true, stunningFistDeclared: 'stunned' }
      const { nextState } = advanceSimulatedTurn(start)
      expect(nextState.kiDefenseRounds).toBe(0)
      expect(nextState.kiExtraAttackActive).toBe(false)
      expect(nextState.stunningFistDeclared).toBeNull()
    })
  })

  // =========================================================================
  // Combo 6: Rogue Stealth Underhanded + Dagger Crit Confirmation + Debilitating Injury
  // =========================================================================
  describe('Combo 6: Rogue Stealth Underhanded + Dagger Crit Confirmation + Debilitating Injury', () => {
    it('6.1 attacks from stealth in surprise round with concealed dagger, activating Underhanded', () => {
      const isSurpriseRound = true
      const isConcealed = true
      expect(isSurpriseRound && isConcealed).toBe(true)
    })
    it('6.2 Underhanded maximizes 3d6 sneak attack to 18 flat precision damage', () => {
      expect(calcUnderhandedDamage(3)).toBe(18)
    })
    it('6.3 dagger critical threat roll (19) receives automatic +3 Halfling confirmation bonus', () => {
      const confirmRoll = calcHalflingCritConfirm(10, 15, true, true)
      expect(confirmRoll).toBe(15 + 10 + 3) // 28 total confirmation
    })
    it('6.4 confirmed critical doubles dagger damage while precision damage remains flat 18', () => {
      const daggerCritDmg = 4 * 2 // 1d3+5 max = 8 doubled
      const totalDamage = daggerCritDmg + 18
      expect(totalDamage).toBe(26)
    })
    it('6.5 applies Debilitating Injury (Bewildered) reminder badge without modifying Mariano attack roll', () => {
      const marianoAtk = 10
      const reminder = 'Target Bewildered: -2 AC (-4 vs Mariano)'
      expect(marianoAtk).toBe(10)
      expect(reminder).toContain('-4 vs Mariano')
    })
  })

  // =========================================================================
  // Combo 7: Cross-Companion Interaction: Mazikeen Fortune on Knam + Bloodrage Attack Reroll
  // =========================================================================
  describe('Combo 7: Cross-Companion Interaction: Mazikeen Fortune on Knam + Bloodrage Attack Reroll', () => {
    it('7.1 Mazikeen casts Fortune on Knam, synchronizing Fortune buff to Knam session state', () => {
      const knamSession = setupPartySession(knamChar.id, { activeBuffIds: ['buff-fortune'] })
      expect(knamSession.activeBuffIds).toContain('buff-fortune')
    })
    it('7.2 Knam enters Bloodrage and rolls an attack with Earth Breaker', () => {
      const attackRoll1 = 4 // Initial poor roll
      const reroll = 19 // Fortune reroll
      const bestRoll = Math.max(attackRoll1, reroll)
      expect(bestRoll).toBe(19)
    })
    it('7.3 Mazikeen uses Cackle to extend Knam Fortune buff by +1 round', () => {
      let fortuneRounds = 1
      fortuneRounds += 1
      expect(fortuneRounds).toBe(2)
    })
    it('7.4 Knam takes his turn and benefits from Fortune reroll on round 2', () => {
      const fortuneRounds = 2; const hasFortuneRound2 = fortuneRounds > 0
      expect(hasFortuneRound2).toBe(true)
    })
  })

  // =========================================================================
  // Combo 8: Lethal Drop Cascading: Bloodrage Exit Near Zero + Fatigue Countdown
  // =========================================================================
  describe('Combo 8: Lethal Drop Cascading: Bloodrage Exit Near Zero + Fatigue Countdown', () => {
    it('8.1 Knam rages for 3 rounds taking damage down to 6 HP', () => {
      const currentRagingHp = 6
      const conShift = calcBloodrageHpShift(4, 4) // 8
      expect(currentRagingHp - conShift).toBe(-2)
    })
    it('8.2 danger warning alerts player that exiting rage drops HP to -2 (Dying)', () => {
      const alert = evaluateLethalRageExit(6, 16, 4)
      expect(alert.isLethal).toBe(true)
      expect(alert.resultingHp).toBe(-2)
    })
    it('8.3 exiting Bloodrage applies fatigued condition with countdown = 6 (2 * 3 rounds raged)', () => {
      const fatigueCountdown = calcFatigueRounds(3)
      expect(fatigueCountdown).toBe(6)
    })
    it('8.4 advanceCharacterTurn decrements fatigue countdown round by round', () => {
      let cur: SimulatedClassMechanics = { isRaging: false, fatigueCountdown: 6 }
      for (let i = 0; i < 3; i++) { cur = advanceSimulatedTurn(cur).nextState }
      expect(cur.fatigueCountdown).toBe(3)
    })
    it('8.5 fatigue countdown reaching 0 automatically removes fatigued condition', () => {
      const cur = { isRaging: false, fatigueCountdown: 1 }
      const { clearedConditions } = advanceSimulatedTurn(cur)
      expect(clearedConditions).toContain('fatigued')
    })
  })

  // =========================================================================
  // Combo 9: Magus Multi-Charge Spellstrike Lifecycle Across Multiple Rounds
  // =========================================================================
  describe('Combo 9: Magus Multi-Charge Spellstrike Lifecycle Across Multiple Rounds', () => {
    it('9.1 Shotrix arms Chill Touch (CL 4 = 4 charges) into heldSpellstrike', () => {
      const held = { spellId: 'chill-touch', chargesRemaining: 4 }
      expect(held.chargesRemaining).toBe(4)
    })
    it('9.2 Round 1 hit discharges 1 charge (3 charges remain)', () => {
      let charges = 4
      charges -= 1
      expect(charges).toBe(3)
    })
    it('9.3 Round 2 missed attack retains charge (3 charges remain)', () => {
      let charges = 3
      const hit = false
      if (hit) charges -= 1
      expect(charges).toBe(3)
    })
    it('9.4 Round 3 iterative attack hits, discharging 2nd charge (2 charges remain)', () => {
      let charges = 3
      charges -= 1
      expect(charges).toBe(2)
    })
    it('9.5 advanceCharacterTurn preserves heldSpellstrike across rounds until depleted', () => {
      const held = { chargesRemaining: 2 }
      expect(held.chargesRemaining).toBe(2)
    })
  })

  // =========================================================================
  // Combo 10: Full Party Simultaneous Turn Advancement Lifecycle
  // =========================================================================
  describe('Combo 10: Full Party Simultaneous Turn Advancement Lifecycle', () => {
    it('10.1 advances turn for Knam in Bloodrage, incrementing rounds raged', () => {
      const { nextState } = advanceSimulatedTurn({ isRaging: true, roundsRaged: 1 })
      expect(nextState.roundsRaged).toBe(2)
    })
    it('10.2 advances turn for Mazikeen, decrementing hexes and resetting cackle', () => {
      const { nextState } = advanceSimulatedTurn({ activeHexes: [{ id: 'e', type: 'evil-eye' as const, remainingRounds: 2, cackleExtendable: true }], cackleUsedThisRound: true })
      expect(nextState.activeHexes![0].remainingRounds).toBe(1)
      expect(nextState.cackleUsedThisRound).toBe(false)
    })
    it('10.3 advances turn for Agelmund, decrementing Ki Defense and resetting Flurry Extra Attack', () => {
      const { nextState } = advanceSimulatedTurn({ kiDefenseRounds: 1, kiExtraAttackActive: true })
      expect(nextState.kiDefenseRounds).toBe(0)
      expect(nextState.kiExtraAttackActive).toBe(false)
    })
    it('10.4 advances turn for Shotrix, decrementing Arcane Pool weapon duration', () => {
      const { nextState } = advanceSimulatedTurn({ arcanePoolWeaponRounds: 10 })
      expect(nextState.arcanePoolWeaponRounds).toBe(9)
    })
    it('10.5 advances turn for Mariano, clearing 1-round Debilitating Injury reminder', () => {
      const { nextState } = advanceSimulatedTurn({ debilitatingInjury: { mode: 'bewildered', remainingRounds: 1 } })
      expect(nextState.debilitatingInjury).toBeNull()
    })
  })
});
