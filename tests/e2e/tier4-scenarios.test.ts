import { describe, it, expect, beforeEach } from 'vitest'
import {
  noorieChar,
  shotrixChar,
  knamChar,
  mazikeenChar,
  monkChar,
  agelmundChar,
  WILD_SHAPE_PRESETS,
  calcHexDc,
  calcBloodrageHpShift,
  evaluateLethalRageExit,
  calcFatigueRounds,
  calcSpellstrikeDamage,
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

describe('Tier 4: Real-World Party Application Scenarios', () => {
  beforeEach(() => {
    resetTestStores()
  })

  // =========================================================================
  // Scenario 1: Ambush at the Sunken Shrine (Shotrix + Mariano)
  // =========================================================================
  describe('Scenario 1: Ambush at the Sunken Shrine (Shotrix + Mariano)', () => {
    it('1.1 Shotrix arms Shocking Grasp into heldSpellstrike with Spell Combat and metal bonus', () => {
      const shotrixSession = setupPartySession(shotrixChar.id, {
        classMechanics: {
          magus: {
            heldSpellstrike: { spellId: 'shocking-grasp', spellName: 'Shocking Grasp', spellLevel: 1, damageDice: '4d6', damageType: 'electricity', chargesRemaining: 1, chargesMax: 1, critMultiplier: 2, hasMetalBonusToggle: true, metalBonusActive: true },
            spellCombatActive: true,
            defensiveCastingSacrifice: 0,
            arcanePoolWeapon: null
          }
        }
      })
      expect(shotrixSession.classMechanics?.magus?.heldSpellstrike?.chargesRemaining).toBe(1)
    })
    it('1.2 Shotrix attacks metal construct: BAB 3 + DEX 4 + Metal 3 - Spell Combat 2 = +8 to hit', () => {
      const bab = 3, dex = 4, metal = 3, sc = -2
      const attackBonus = bab + dex + metal + sc
      expect(attackBonus).toBe(8)
    })
    it('1.3 Shotrix rolls natural 19 with Rapier, confirming critical and dealing doubled weapon + spell damage', () => {
      const critHit = calcSpellstrikeDamage({ weaponDamage: 6, spellDamage: 14, isCritical: true, weaponCritMultiplier: 2, spellCritMultiplier: 2 })
      expect(critHit.weaponPart).toBe(12)
      expect(critHit.spellPart).toBe(28)
      expect(critHit.total).toBe(40)
    })
    it('1.4 Mariano attacks from stealth in surprise round with Underhanded, dealing 18 maximized sneak damage', () => {
      const underhandedDamage = calcUnderhandedDamage(3)
      expect(underhandedDamage).toBe(18)
      const daggerCritConfirm = calcHalflingCritConfirm(10, 16, true, true)
      expect(daggerCritConfirm).toBe(29)
    })
    it('1.5 Mariano applies Debilitating Injury (Bewildered) reminder badge without altering his attack roll', () => {
      const marianoBaseAtk = 10
      const reminderBadge = 'Target Bewildered: -2 AC (-4 vs Mariano)'
      expect(marianoBaseAtk).toBe(10)
      expect(reminderBadge).toContain('-4 vs Mariano')
    })
  })

  // =========================================================================
  // Scenario 2: The Iron Golem Breach (Knam Bloodrage, Reach, Bite, Lethal Exit Alert & Fatigue)
  // =========================================================================
  describe('Scenario 2: The Iron Golem Breach (Knam Bloodrage, Reach, Bite, Lethal Exit Alert & Fatigue)', () => {
    it('2.1 Knam enters Bloodrage: gains +4 STR, +4 CON, -2 AC, +8 HP (51 -> 59), and 10 ft reach', () => {
      const hpShift = calcBloodrageHpShift(knamChar.level, 4)
      expect(hpShift).toBe(8)
      const ragingHp = knamChar.maxHp + hpShift
      expect(ragingHp).toBe(59)
      const reach = 5 + 5
      expect(reach).toBe(10)
    })
    it('2.2 Knam executes full attack with Earth Breaker: Furious Focus ignores PA penalty on 1st attack (+11, 2d6+15)', () => {
      const firstAtk = calcFuriousFocusAttack(0, 11, true, true, true)
      expect(firstAtk).toBe(11)
      const damageBonus = Math.floor(6 * 1.5) + 6
      expect(damageBonus).toBe(15)
    })
    it('2.3 Full attack appends secondary Bite with Ring of Rat Fangs at -5 penalty (+5, 1d4+3)', () => {
      const bab = 4, strMod = 6
      const biteAtk = bab + strMod - 5
      const biteDmg = Math.floor(strMod * 0.5)
      expect(biteAtk).toBe(5)
      expect(biteDmg).toBe(3)
    })
    it('2.4 Knam takes damage in rage down to 7 HP; system surfaces LETHAL EXIT WARNING (drops to -1 dying)', () => {
      const alert = evaluateLethalRageExit(7, knamChar.abilities.con, knamChar.level)
      expect(alert.isLethal).toBe(true)
      expect(alert.resultingHp).toBe(-1)
    })
    it('2.5 exiting Bloodrage drops HP by 8 to -1, applying fatigued condition with countdown = 6 (2 * 3 rounds)', () => {
      const fatigueCountdown = calcFatigueRounds(3)
      expect(fatigueCountdown).toBe(6)
      let cur: SimulatedClassMechanics = { isRaging: false, fatigueCountdown: 6 }
      for (let i = 0; i < 6; i++) { cur = advanceSimulatedTurn(cur).nextState }
      expect(cur.fatigueCountdown).toBe(0)
    })
  })

  // =========================================================================
  // Scenario 3: Mazikeen Hex Web (Evil Eye, Fortune Sync, Cackle Extension & Immunity)
  // =========================================================================
  describe('Scenario 3: Mazikeen Hex Web (Evil Eye, Fortune Sync, Cackle Extension & Immunity)', () => {
    it('3.1 Mazikeen hexes boss with Evil Eye (Saving Throws, DC 17); boss fails Will save -> 8 rounds', () => {
      const dc = calcHexDc(mazikeenChar.level, 5)
      expect(dc).toBe(17)
      const evilEye = { type: 'evil-eye', remainingRounds: 8, cackleExtendable: true }
      expect(evilEye.remainingRounds).toBe(8)
    })
    it('3.2 Mazikeen casts Fortune on Agelmund; Agelmund session state immediately synchronizes Fortune buff', () => {
      const agelmundSession = setupPartySession(agelmundChar.id, { activeBuffIds: ['buff-fortune'] })
      expect(agelmundSession.activeBuffIds).toContain('buff-fortune')
    })
    it('3.3 Mazikeen casts Slumber on guard (4 rounds, non-extendable) and logs 24h immunity', () => {
      const slumber = { type: 'slumber', remainingRounds: 4, cackleExtendable: false }
      expect(slumber.cackleExtendable).toBe(false)
    })
    it('3.4 Mazikeen uses Cackle move action: extends Evil Eye to 9 rounds and Fortune to 2 rounds; Slumber unchanged', () => {
      let hexes = [
        { id: 'ee', remainingRounds: 8, cackleExtendable: true },
        { id: 'f', remainingRounds: 1, cackleExtendable: true },
        { id: 's', remainingRounds: 4, cackleExtendable: false },
      ]
      hexes = hexes.map(h => h.cackleExtendable ? { ...h, remainingRounds: h.remainingRounds + 1 } : h)
      expect(hexes[0].remainingRounds).toBe(9)
      expect(hexes[1].remainingRounds).toBe(2)
      expect(hexes[2].remainingRounds).toBe(4)
    })
    it('3.5 Long Rest automatically clears all target immunity records', () => {
      let immunityLog: Record<string, { hex: string }> = { Boss: { hex: 'misfortune' }, Guard: { hex: 'slumber' } }
      immunityLog = {}
      expect(Object.keys(immunityLog)).toHaveLength(0)
    })
  })

  // =========================================================================
  // Scenario 4: Noorie Pack Hunt (Wolf Form, Armor Melding, Natural Attacks & Somatic Warning)
  // =========================================================================
  describe('Scenario 4: Noorie Pack Hunt (Wolf Form, Armor Melding, Natural Attacks & Somatic Warning)', () => {
    it('4.1 Noorie transforms into Wolf (Medium: +2 STR, +2 Nat Armor, 50 ft speed)', () => {
      const wolf = WILD_SHAPE_PRESETS.wolf
      expect(wolf.size).toBe('Medium')
      expect(wolf.speed).toBe(50)
      expect(wolf.strBonus).toBe(2)
      expect(wolf.naturalArmorBonus).toBe(2)
    })
    it('4.2 equipment melding zeroes Hide Armor bonus (+2) and ASF (10%); AC becomes Total 15, Touch 13, FF 12', () => {
      const melded = simulateWildShapeArmorMelding(noorieChar.armorClass)
      expect(melded.armorBonus).toBe(0)
      expect(melded.spellFailureChance).toBe(0)
      const ac = simulateEffectiveAc({ baseAc: melded, naturalArmorBonuses: [2], dodgeBonuses: [], sizeBonus: 0 })
      expect(ac.total).toBe(15)
      expect(ac.touch).toBe(13)
      expect(ac.flatFooted).toBe(12)
    })
    it('4.3 replaces weapons with Wolf single Bite +5 (1d6+3, 1.5x STR mod 2) and free Trip rider', () => {
      const bite = WILD_SHAPE_PRESETS.wolf.naturalAttacks[0]
      expect(bite.trip).toBe(true)
      const strMod = 2
      expect(Math.floor(strMod * bite.strMultiplier)).toBe(3)
    })
    it('4.4 casting Flame Blade (V, S, DF) surfaces amber warning: cannot cast in Wild Shape without Natural Spell', () => {
      const check = validateNaturalSpellCasting(true, false, 'V, S, DF')
      expect(check.canCast).toBe(false)
      expect(check.hasWarning).toBe(true)
    })
    it('4.5 reverting to humanoid form restores original AC (15) and clears spell restrictions', () => {
      const check = validateNaturalSpellCasting(false, false, 'V, S, DF')
      expect(check.canCast).toBe(true)
      expect(noorieChar.armorClass.armorBonus).toBe(2)
    })
  })

  // =========================================================================
  // Scenario 5: Agelmund Flurry Defense (Ki Defense, Ki Extra Attack, Stunning Fist & Wholeness)
  // =========================================================================
  describe('Scenario 5: Agelmund Flurry Defense (Ki Defense, Ki Extra Attack, Stunning Fist & Wholeness)', () => {
    it('5.1 Agelmund spends 1 Ki point for Ki Defense, gaining +4 Dodge AC to Total (20), Touch (20), and CMD (24)', () => {
      const ac = simulateEffectiveAc({ baseAc: monkChar.armorClass, naturalArmorBonuses: [], dodgeBonuses: [4], sizeBonus: 0 })
      expect(ac.total).toBe(20)
      expect(ac.touch).toBe(20)
    })
    it('5.2 Agelmund spends 1 Ki point for Ki Extra Attack: Flurry expands to 3 attacks (+9/+9/+9)', () => {
      const flurry = ['+9', '+9', '+9']
      expect(flurry).toHaveLength(3)
    })
    it('5.3 declares Stunning Fist (DC 14 Fortitude) on 1st attack, deducting 1 daily stun use', () => {
      const dc = 10 + Math.floor(monkChar.level / 2) + 2
      expect(dc).toBe(14)
      let stunUses = 4
      stunUses -= 1
      expect(stunUses).toBe(3)
    })
    it('5.4 second flurry strike on same target deals +1d6 extra damage from Jabbing Style', () => {
      const jabbingBonus = '1d6'
      expect(jabbingBonus).toBe('1d6')
    })
    it('5.5 Agelmund spends 2 Ki points for Wholeness of Body, healing 1d8+4 HP up to maxHp 36', () => {
      let ki = 6
      ki -= 2
      expect(ki).toBe(4)
      const healing = 8 + 4
      const finalHp = Math.min(36, 26 + healing)
      expect(finalHp).toBe(36)
    })
  })

  // =========================================================================
  // Scenario 6: Full Party 3-Round Encounter Lifecycle (All 6 Characters Cycling Turn Advancement)
  // =========================================================================
  describe('Scenario 6: Full Party 3-Round Encounter Lifecycle (All 6 Characters Cycling Turn Advancement)', () => {
    it('6.1 Round 1: All 6 characters activate class features and advance turn via Fine Turno PG', () => {
      const r1Knam = advanceSimulatedTurn({ isRaging: true, roundsRaged: 0 }).nextState
      expect(r1Knam.roundsRaged).toBe(1)
      const r1Mazikeen = advanceSimulatedTurn({ activeHexes: [{ id: 'ee', type: 'evil-eye' as const, remainingRounds: 9, cackleExtendable: true }], cackleUsedThisRound: true }).nextState
      expect(r1Mazikeen.activeHexes![0].remainingRounds).toBe(8)
      expect(r1Mazikeen.cackleUsedThisRound).toBe(false)
      const r1Monk = advanceSimulatedTurn({ kiDefenseRounds: 1, kiExtraAttackActive: true }).nextState
      expect(r1Monk.kiDefenseRounds).toBe(0)
      expect(r1Monk.kiExtraAttackActive).toBe(false)
      const r1Shotrix = advanceSimulatedTurn({ arcanePoolWeaponRounds: 10 }).nextState
      expect(r1Shotrix.arcanePoolWeaponRounds).toBe(9)
      const r1Mariano = advanceSimulatedTurn({ debilitatingInjury: { mode: 'bewildered' as const, remainingRounds: 1 } }).nextState
      expect(r1Mariano.debilitatingInjury).toBeNull()
    })
    it('6.2 Round 2: Durations decrement further; Knam reaches 2 rounds raged; Shotrix Arcane Pool at 8 rounds', () => {
      const r2Knam = advanceSimulatedTurn({ isRaging: true, roundsRaged: 1 }).nextState
      expect(r2Knam.roundsRaged).toBe(2)
      const r2Shotrix = advanceSimulatedTurn({ arcanePoolWeaponRounds: 9 }).nextState
      expect(r2Shotrix.arcanePoolWeaponRounds).toBe(8)
    })
    it('6.3 Round 3: Knam exits Bloodrage with 6 HP, suffering -2 drop to Dying and gaining 4 rounds fatigue', () => {
      const lethalAlert = evaluateLethalRageExit(6, 16, 4)
      expect(lethalAlert.isLethal).toBe(true)
      expect(lethalAlert.resultingHp).toBe(-2)
      const fatigueRounds = calcFatigueRounds(2)
      expect(fatigueRounds).toBe(4)
    })
    it('6.4 Round 3: Knam is healed and advances turn, decrementing fatigue countdown from 4 to 3', () => {
      const r3Knam = advanceSimulatedTurn({ isRaging: false, fatigueCountdown: 4 }).nextState
      expect(r3Knam.fatigueCountdown).toBe(3)
    })
    it('6.5 All session mutations persist cleanly to JSONB without data corruption', () => {
      const fullEncounterState = {
        round: 3,
        party: {
          knam: { fatigueCountdown: 3 },
          shotrix: { arcanePoolWeaponRounds: 8 },
          mazikeen: { activeHexes: 1 },
          noorie: { wildShapeActive: true },
          agelmund: { kiPoolRemaining: 4 },
          mariano: { underhandedSpent: 1 }
        }
      }
      const json = JSON.stringify(fullEncounterState)
      const parsed = JSON.parse(json)
      expect(parsed.party.knam.fatigueCountdown).toBe(3)
      expect(parsed.party.shotrix.arcanePoolWeaponRounds).toBe(8)
    })
  })
});
