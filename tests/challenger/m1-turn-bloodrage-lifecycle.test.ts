import { describe, it, expect, beforeEach } from "vitest"
import {
  calcBloodrageHpShift,
  isBloodrageExitLethal,
  calcFatigueRounds,
  advanceTurnMechanics,
  calcEffectiveMaxHp,
  checkBloodrageExitSafety,
  evaluateBloodrageExitRisk,
  calcHexDc,
  calcStunningFistDc,
  isTargetImmuneToHex,
  calcMagusSpellCombatConcentration,
  calcMagusSpellCombatAttackPenalty,
  calcSpellstrikeCritMultipliers,
  calcHalflingDaggerCritConfirm,
  calcDebilitatingInjuryEffect,
  calcUnderhandedDamage,
} from "../../src/lib/class-mechanics"
import {
  calcEffectiveArmorClass,
} from "../../src/lib/stat-calc"
import {
  createDefaultClassMechanics,
} from "../../src/types/class-mechanics"
import {
  useSessionStore,
  normalizePersistedSession,
} from "../../src/store/useSessionStore"
import type { SessionState } from "../../src/types/session"
import type { FullCharacter } from "../../src/store/useCharacterStore"
import knamData from "../../src/data/knam.json"
import shotrixData from "../../src/data/shotrix-blackburn.json"
import mazikeenData from "../../src/data/mazikeen-noctis.json"

const defaultCoins = { cp: 0, sp: 0, gp: 100, pp: 0 }

function createTestSession(charId: string, maxHp = 45): SessionState {
  const store = useSessionStore.getState()
  store.initSession(charId, maxHp, defaultCoins, [])
  return useSessionStore.getState().sessions[charId]
}

describe("M1 Challenger Hardening Suite: Turn Lifecycle, Bloodrage & Persistence", () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: {} })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 1: Bloodrage Real CON HP Math & Sudden Barbarian Death Thresholds  */
  /* -------------------------------------------------------------------------- */
  describe("Vector 1: Bloodrage Real CON HP Math & Sudden Barbarian Death Thresholds", () => {
    it("scales Bloodrage HP shift by level and CON modifier bonus", () => {
      expect(calcBloodrageHpShift(1, 4)).toBe(2)
      expect(calcBloodrageHpShift(4, 4)).toBe(8)
      expect(calcBloodrageHpShift(10, 4)).toBe(20)
      expect(calcBloodrageHpShift(20, 4)).toBe(40)

      expect(calcBloodrageHpShift(4, 2)).toBe(4)
      expect(calcBloodrageHpShift(4, 6)).toBe(12)
      expect(calcBloodrageHpShift(4, 8)).toBe(16)

      expect(calcBloodrageHpShift(4, 3)).toBe(4)
      expect(calcBloodrageHpShift(4, 5)).toBe(8)

      expect(calcBloodrageHpShift(0, 4)).toBe(2)
      expect(calcBloodrageHpShift(-5, 4)).toBe(2)
    })

    it("calculates effective max HP under Constitution shifts and enforces min 1 HP floor", () => {
      const ragingMaxHp = calcEffectiveMaxHp(45, 4, 3, 5)
      expect(ragingMaxHp).toBe(53)

      const penalizedMaxHp = calcEffectiveMaxHp(45, 4, 3, 1)
      expect(penalizedMaxHp).toBe(37)

      const drainedMaxHp = calcEffectiveMaxHp(10, 4, 0, -5)
      expect(drainedMaxHp).toBe(1)
    })

    it("identifies exact HP threshold boundaries for Sudden Barbarian Death Syndrome", () => {
      const level = 4
      const baseCon = 16
      const rageBonus = 4

      // Boundary 1: Current HP = 9 -> HP after exit = 1 (> 0: Safe)
      const safe = checkBloodrageExitSafety(9, level, rageBonus, baseCon)
      expect(safe.hpAfterExit).toBe(1)
      expect(safe.isLethal).toBe(false)
      expect(safe.isInstantDeath).toBe(false)
      expect(safe.isUnconscious).toBe(false)
      expect(safe.severity).toBe("none")

      // Boundary 2: Current HP = 8 -> HP after exit = 0 (Disabled / Inabile)
      const disabled = checkBloodrageExitSafety(8, level, rageBonus, baseCon)
      expect(disabled.hpAfterExit).toBe(0)
      expect(disabled.isLethal).toBe(true)
      expect(disabled.isInstantDeath).toBe(false)
      expect(disabled.isUnconscious).toBe(true)
      expect(disabled.severity).toBe("danger")
      expect(disabled.message).toContain("inabile")

      // Boundary 3: Current HP = 7 -> HP after exit = -1 (Unconscious & Dying / Morente)
      const dying = checkBloodrageExitSafety(7, level, rageBonus, baseCon)
      expect(dying.hpAfterExit).toBe(-1)
      expect(dying.isLethal).toBe(true)
      expect(dying.isInstantDeath).toBe(false)
      expect(dying.isUnconscious).toBe(true)
      expect(dying.severity).toBe("danger")
      expect(dying.message).toContain("morente")

      // Boundary 4: Current HP = -7 -> HP after exit = -15 (Dying, 1 HP away from death)
      const nearDeath = checkBloodrageExitSafety(-7, level, rageBonus, baseCon)
      expect(nearDeath.hpAfterExit).toBe(-15)
      expect(nearDeath.isLethal).toBe(true)
      expect(nearDeath.isInstantDeath).toBe(false)
      expect(nearDeath.isUnconscious).toBe(true)

      // Boundary 5: Current HP = -8 -> HP after exit = -16 (Exact Sudden Death threshold: -CON)
      const suddenDeath = checkBloodrageExitSafety(-8, level, rageBonus, baseCon)
      expect(suddenDeath.hpAfterExit).toBe(-16)
      expect(suddenDeath.isLethal).toBe(true)
      expect(suddenDeath.isInstantDeath).toBe(true)
      expect(suddenDeath.isUnconscious).toBe(true)
      expect(suddenDeath.severity).toBe("danger")
      expect(suddenDeath.message).toContain("ALLERTA MORTALE")
      expect(suddenDeath.message).toContain("-16 CON")

      // Boundary 6: Current HP = -9 -> HP after exit = -17 (Overkill Instant Death)
      const overkill = checkBloodrageExitSafety(-9, level, rageBonus, baseCon)
      expect(overkill.hpAfterExit).toBe(-17)
      expect(overkill.isLethal).toBe(true)
      expect(overkill.isInstantDeath).toBe(true)
      expect(overkill.isUnconscious).toBe(true)
      expect(overkill.severity).toBe("danger")
    })

    it("verifies alias evaluateBloodrageExitRisk parameter mapping matches checkBloodrageExitSafety", () => {
      const fromSafety = checkBloodrageExitSafety(-8, 4, 4, 16)
      const fromRisk = evaluateBloodrageExitRisk(-8, 16, 4, 4)
      expect(fromRisk).toEqual(fromSafety)
    })

    it("verifies isBloodrageExitLethal returns correct lethal and unconscious booleans", () => {
      const safe = isBloodrageExitLethal(10, 16, 4, 4)
      expect(safe.hpAfterExit).toBe(2)
      expect(safe.isUnconscious).toBe(false)
      expect(safe.isLethal).toBe(false)

      const dying = isBloodrageExitLethal(6, 16, 4, 4)
      expect(dying.hpAfterExit).toBe(-2)
      expect(dying.isUnconscious).toBe(true)
      expect(dying.isLethal).toBe(false)

      const dead = isBloodrageExitLethal(-8, 16, 4, 4)
      expect(dead.hpAfterExit).toBe(-16)
      expect(dead.isUnconscious).toBe(true)
      expect(dead.isLethal).toBe(true)
    })

    it("property test: mathematical invariants hold across 200 pseudo-random combat states", () => {
      for (let i = 0; i < 200; i++) {
        const currentHp = Math.floor(Math.random() * 150) - 50
        const level = Math.floor(Math.random() * 20) + 1
        const baseCon = Math.floor(Math.random() * 19) + 6
        const rageBonus = [2, 4, 6, 8][Math.floor(Math.random() * 4)]

        const safety = checkBloodrageExitSafety(currentHp, level, rageBonus, baseCon)
        const expectedLoss = Math.floor(rageBonus / 2) * level
        const expectedRemaining = currentHp - expectedLoss

        expect(safety.hpAfterExit).toBe(expectedRemaining)
        expect(safety.projectedHp).toBe(expectedRemaining)
        expect(safety.isInstantDeath).toBe(expectedRemaining <= -baseCon)
        expect(safety.isUnconscious).toBe(expectedRemaining <= 0)

        if (expectedRemaining <= 0) {
          expect(safety.severity).toBe("danger")
          expect(safety.isLethal).toBe(true)
        } else {
          expect(safety.severity).toBe("none")
          expect(safety.isLethal).toBe(false)
        }
      }
    })

    it("useSessionStore enterBloodrage and exitBloodrage update HP, buffs, conditions, and lethal alert", () => {
      const store = useSessionStore.getState()
      const char = knamData as unknown as FullCharacter
      const charId = char.id

      store.initSession(charId, 45, defaultCoins, [])

      store.enterBloodrage(charId, char)
      let session = useSessionStore.getState().sessions[charId]
      expect(session.classMechanics?.bloodrager?.isRaging).toBe(true)
      expect(session.classMechanics?.bloodrager?.isBloodraging).toBe(true)
      expect(session.currentHp).toBe(55)

      useSessionStore.setState((s) => ({
        sessions: {
          ...s.sessions,
          [charId]: { ...s.sessions[charId], currentHp: 6 },
        },
      }))

      const exitResult = store.exitBloodrage(charId, char)
      session = useSessionStore.getState().sessions[charId]

      expect(exitResult.isLethal).toBe(true)
      expect(exitResult.remainingHp).toBe(-4)
      expect(session.currentHp).toBe(-4)
      expect(session.conditions).toContain("fatigued")
      expect(session.classMechanics?.bloodrager?.isRaging).toBe(false)
      expect(session.classMechanics?.bloodrager?.isBloodraging).toBe(false)
    })

    it("clamps remaining HP at -CON upon overkill exit to prevent unbounded negative HP", () => {
      const store = useSessionStore.getState()
      const char = knamData as unknown as FullCharacter
      const charId = char.id

      store.initSession(charId, 45, defaultCoins, [])

      useSessionStore.setState((s) => ({
        sessions: {
          ...s.sessions,
          [charId]: {
            ...s.sessions[charId],
            currentHp: -15,
            classMechanics: {
              ...s.sessions[charId].classMechanics,
              bloodrager: {
                ...createDefaultClassMechanics("knam").bloodrager!,
                isRaging: true,
                isBloodraging: true,
                roundsRagedThisCombat: 2,
              },
            },
          },
        },
      }))

      const exitResult = store.exitBloodrage(charId, char)
      const session = useSessionStore.getState().sessions[charId]

      expect(exitResult.isLethal).toBe(true)
      expect(exitResult.remainingHp).toBe(-16)
      expect(session.currentHp).toBe(-16)
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 2: Multi-Round Sequence Simulation of advanceCharacterTurn         */
  /* -------------------------------------------------------------------------- */
  describe("Vector 2: Multi-Round Sequence Simulation of advanceCharacterTurn", () => {
    it("simulates a complete 12-round multi-class tactical combat lifecycle", () => {
      const char = knamData as unknown as FullCharacter
      const charId = char.id

      const baseSess = createTestSession(charId, 45)
      let session: SessionState = {
        ...baseSess,
        characterId: charId,
        currentRound: 1,
        currentHp: 53,
        conditions: ["shaken"],
        spentResources: { "bloodrage-rounds": 1 },
        classMechanics: {
          bloodrager: {
            ...createDefaultClassMechanics(charId).bloodrager!,
            isRaging: true,
            isBloodraging: true,
            roundsRagedThisCombat: 1,
            roundsCurrentRage: 1,
            furiousFocusAppliedThisRound: true,
            furiousFocusReady: false,
          },
          magus: {
            heldSpellstrike: null,
            spellCombatActive: false,
            defensiveCastingSacrifice: 0,
            arcanePoolWeapon: { active: true, bonus: 1, remainingRounds: 10 },
            arcaneWeaponActive: true,
            arcaneWeaponRoundsLeft: 10,
            arcaneWeaponBonus: 1,
          },
          witch: {
            cackleUsedThisRound: true,
            activeHexes: [
              {
                id: "hex-1",
                targetName: "Orc Chieftain",
                targetType: "enemy",
                hexType: "evil-eye",
                remainingRounds: 8,
                durationRounds: 8,
                isExtendableByCackle: true,
              },
              {
                id: "hex-2",
                targetName: "Orc Shaman",
                targetType: "enemy",
                hexType: "slumber",
                remainingRounds: 3,
                durationRounds: 3,
                isExtendableByCackle: false,
              },
            ],
            immuneTargets: {},
            targetImmunities: [],
          },
          monk: {
            kiDefenseRounds: 1,
            kiSpeedRounds: 1,
            kiExtraAttackActive: true,
            stunningFistDeclared: "stunned",
            jabbingStyleActive: true,
          },
          rogue: {
            debilitatingInjury: {
              type: "bewildered",
              targetName: "Orc Chieftain",
              remainingRounds: 1,
            },
            underhandedAvailable: true,
            halflingDaggerCritBonusActive: true,
          },
        },
      }

      // Round 1 -> 2
      session = advanceTurnMechanics(session, char)
      expect(session.currentRound).toBe(2)
      expect(session.classMechanics?.bloodrager?.roundsRagedThisCombat).toBe(2)
      expect(session.classMechanics?.bloodrager?.furiousFocusAppliedThisRound).toBe(false)
      expect(session.classMechanics?.bloodrager?.furiousFocusReady).toBe(true)

      expect(session.classMechanics?.magus?.arcanePoolWeapon?.remainingRounds).toBe(9)
      expect(session.classMechanics?.magus?.arcaneWeaponRoundsLeft).toBe(9)

      expect(session.classMechanics?.witch?.cackleUsedThisRound).toBe(false)
      expect(session.classMechanics?.witch?.activeHexes.find((h) => h.id === "hex-1")?.remainingRounds).toBe(7)
      expect(session.classMechanics?.witch?.activeHexes.find((h) => h.id === "hex-2")?.remainingRounds).toBe(2)

      expect(session.classMechanics?.monk?.kiDefenseRounds).toBe(0)
      expect(session.classMechanics?.monk?.kiSpeedRounds).toBe(0)
      expect(session.classMechanics?.monk?.kiExtraAttackActive).toBe(false)
      expect(session.classMechanics?.monk?.stunningFistDeclared).toBeNull()

      expect(session.classMechanics?.rogue?.debilitatingInjury).toBeNull()

      // Round 2 -> 3
      session = advanceTurnMechanics(session, char)
      expect(session.currentRound).toBe(3)
      expect(session.classMechanics?.bloodrager?.roundsRagedThisCombat).toBe(3)
      expect(session.classMechanics?.magus?.arcanePoolWeapon?.remainingRounds).toBe(8)
      expect(session.classMechanics?.witch?.activeHexes.find((h) => h.id === "hex-1")?.remainingRounds).toBe(6)
      expect(session.classMechanics?.witch?.activeHexes.find((h) => h.id === "hex-2")?.remainingRounds).toBe(1)

      // Knam exits Bloodrage after 3 rounds
      session = {
        ...session,
        currentHp: session.currentHp - 8,
        conditions: [...session.conditions, "fatigued"],
        classMechanics: {
          ...session.classMechanics,
          bloodrager: {
            ...session.classMechanics!.bloodrager!,
            isRaging: false,
            isBloodraging: false,
            roundsRagedThisCombat: 0,
            roundsCurrentRage: 0,
            fatigueCountdown: calcFatigueRounds(3),
            fatigueRoundsLeft: calcFatigueRounds(3),
          },
        },
      }

      // Round 3 -> 4: Slumber expires (1 -> 0), fatigue decrements 6 -> 5
      session = advanceTurnMechanics(session, char)
      expect(session.currentRound).toBe(4)
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(5)
      expect(session.conditions).toContain("fatigued")
      expect(session.classMechanics?.witch?.activeHexes.some((h) => h.id === "hex-2")).toBe(false)
      expect(session.classMechanics?.witch?.activeHexes.find((h) => h.id === "hex-1")?.remainingRounds).toBe(5)

      // Rounds 4 to 8: Fatigue decays 5 -> 4 -> 3 -> 2 -> 1 -> 0
      session = advanceTurnMechanics(session, char) // 4 -> 5
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(4)
      expect(session.conditions).toContain("fatigued")

      session = advanceTurnMechanics(session, char) // 5 -> 6
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(3)
      expect(session.conditions).toContain("fatigued")

      session = advanceTurnMechanics(session, char) // 6 -> 7
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(2)
      expect(session.conditions).toContain("fatigued")

      session = advanceTurnMechanics(session, char) // 7 -> 8
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(1)
      expect(session.conditions).toContain("fatigued")

      session = advanceTurnMechanics(session, char) // 8 -> 9: Fatigue reaches 0!
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(0)
      expect(session.conditions).not.toContain("fatigued")
      expect(session.conditions).toContain("shaken")

      // Subsequent advance: no underflow
      session = advanceTurnMechanics(session, char) // 9 -> 10
      expect(session.classMechanics?.bloodrager?.fatigueCountdown).toBe(0)
      expect(session.conditions).not.toContain("fatigued")
      expect(session.conditions).toContain("shaken")

      // Arcane Pool weapon enhancement reaches 0 and nullifies
      expect(session.classMechanics?.magus?.arcanePoolWeapon?.remainingRounds).toBe(1)
      session = advanceTurnMechanics(session, char) // 10 -> 11
      expect(session.classMechanics?.magus?.arcanePoolWeapon).toBeNull()
      expect(session.classMechanics?.magus?.arcaneWeaponActive).toBe(false)
      expect(session.classMechanics?.magus?.arcaneWeaponRoundsLeft).toBe(0)
    })

    it("automatically exits Bloodrage and applies fatigue when daily rage rounds are exhausted", () => {
      const char = knamData as unknown as FullCharacter
      const charId = char.id

      const baseSess = createTestSession(charId, 45)
      const session: SessionState = {
        ...baseSess,
        characterId: charId,
        currentRound: 5,
        currentHp: 40,
        conditions: [],
        spentResources: { "bloodrage-rounds": 15 },
        classMechanics: {
          bloodrager: {
            ...createDefaultClassMechanics(charId).bloodrager!,
            isRaging: true,
            isBloodraging: true,
            roundsRagedThisCombat: 3,
            roundsCurrentRage: 3,
          },
        },
      }

      const nextSession = advanceTurnMechanics(session, char)

      expect(nextSession.spentResources["bloodrage-rounds"]).toBe(16)
      expect(nextSession.classMechanics?.bloodrager?.isRaging).toBe(false)
      expect(nextSession.classMechanics?.bloodrager?.isBloodraging).toBe(false)
      expect(nextSession.classMechanics?.bloodrager?.fatigueCountdown).toBe(8)
      expect(nextSession.conditions).toContain("fatigued")
      expect(nextSession.currentHp).toBe(30)
    })

    it("maintains strict state isolation between different characters on advanceCharacterTurn", () => {
      const store = useSessionStore.getState()
      const knam = knamData as unknown as FullCharacter
      const shotrix = shotrixData as unknown as FullCharacter

      store.initSession("knam", 45, defaultCoins, [])
      store.initSession("shotrix-blackburn", 30, defaultCoins, [])

      store.enterBloodrage("knam", knam)
      store.activateArcaneWeapon("shotrix-blackburn", 1)

      store.advanceCharacterTurn("shotrix-blackburn", shotrix)

      const sShotrix = useSessionStore.getState().sessions["shotrix-blackburn"]
      const sKnam = useSessionStore.getState().sessions["knam"]

      expect(sShotrix.currentRound).toBe(2)
      expect(sShotrix.classMechanics?.magus?.arcanePoolWeapon?.remainingRounds).toBe(9)

      expect(sKnam.currentRound).toBe(1)
      expect(sKnam.classMechanics?.bloodrager?.roundsRagedThisCombat).toBe(0)
      expect(sKnam.classMechanics?.bloodrager?.isRaging).toBe(true)
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 3: Witch Cackle Mechanics & Immunity Invariants                     */
  /* -------------------------------------------------------------------------- */
  describe("Vector 3: Witch Cackle Mechanics & Immunity Invariants", () => {
    it("empirically verifies Cackle extends eligible hexes indefinitely when used each round", () => {
      const store = useSessionStore.getState()
      const char = mazikeenData as unknown as FullCharacter
      const charId = char.id

      store.initSession(charId, 25, defaultCoins, [])

      // Mazikeen applies Evil Eye (8 rounds) and Slumber (4 rounds)
      store.applyHex(charId, {
        targetName: "Warlord",
        targetType: "enemy",
        hexType: "evil-eye",
        remainingRounds: 8,
        durationRounds: 8,
        isExtendableByCackle: true,
      })
      store.applyHex(charId, {
        targetName: "Bodyguard",
        targetType: "enemy",
        hexType: "slumber",
        remainingRounds: 4,
        durationRounds: 4,
        isExtendableByCackle: false,
      })

      // Simulate 5 consecutive rounds where Mazikeen cackles every round
      for (let r = 1; r <= 5; r++) {
        // Cackle 1/round
        const cackled = store.useCackle(charId)
        expect(cackled).toBe(true)

        // Attempt second cackle in same round -> must fail
        const doubleCackle = store.useCackle(charId)
        expect(doubleCackle).toBe(false)

        // Advance turn
        store.advanceCharacterTurn(charId, char)
        const sess = useSessionStore.getState().sessions[charId]

        // Evil eye: +1 from cackle, -1 from turn advance -> net constant 8 rounds remaining!
        expect(sess.classMechanics?.witch?.activeHexes.find((h) => h.targetName === "Warlord")?.remainingRounds).toBe(8)
        // Slumber: not extendable by cackle -> decrements each round: 4 -> 3 -> 2 -> 1 -> 0
        const slumber = sess.classMechanics?.witch?.activeHexes.find((h) => h.targetName === "Bodyguard")
        if (r < 4) {
          expect(slumber?.remainingRounds).toBe(4 - r)
        } else {
          // After 4 rounds, slumber is expired!
          expect(slumber).toBeUndefined()
        }
      }
    })

    it("calculates Witch Hex DC dynamically and validates 24-hour immunity rule", () => {
      // Mazikeen: Level 4, INT 20 (+5 mod) -> DC 10 + floor(4/2) + 5 = 17
      expect(calcHexDc(4, 5)).toBe(17)
      expect(calcHexDc(1, 4)).toBe(14)
      expect(calcHexDc(20, 8)).toBe(28)

      // 24-hour immunity verifications
      const immunities = [
        { targetName: "Orc Chieftain", hexType: "misfortune" as const, appliedAtTimestamp: Date.now(), expiresAt: "tomorrow" },
        { targetName: "Goblin King", hexType: "slumber" as const, appliedAtTimestamp: Date.now(), expiresAt: "tomorrow" },
      ]

      // Case insensitive match
      expect(isTargetImmuneToHex("orc chieftain", "misfortune", immunities)).toBe(true)
      expect(isTargetImmuneToHex("  ORC CHIEFTAIN  ", "misfortune", immunities)).toBe(true)

      // Hex type specificity: Orc Chieftain is immune to misfortune, but NOT evil-eye
      expect(isTargetImmuneToHex("Orc Chieftain", "evil-eye", immunities)).toBe(false)
      expect(isTargetImmuneToHex("Orc Chieftain", "slumber", immunities)).toBe(false)

      // Unknown target is not immune
      expect(isTargetImmuneToHex("Unknown Bandit", "misfortune", immunities)).toBe(false)
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 4: Tactical Rules & Combat Edge Cases                              */
  /* -------------------------------------------------------------------------- */
  describe("Vector 4: Tactical Rules & Combat Edge Cases", () => {
    it("verifies Magus Spell Combat sacrifice, attack penalty, and Spellstrike crit doubling", () => {
      // Spell Combat concentration sacrifice: converts 0-4 attack penalty to +0-4 concentration
      expect(calcMagusSpellCombatConcentration(10, 0)).toBe(10)
      expect(calcMagusSpellCombatConcentration(10, 2)).toBe(12)
      expect(calcMagusSpellCombatConcentration(10, 4)).toBe(14)
      expect(calcMagusSpellCombatConcentration(10, 6)).toBe(14) // Clamped at 4
      expect(calcMagusSpellCombatConcentration(10, -2)).toBe(10) // Clamped at 0

      // Attack penalty: base -2, plus sacrifice
      expect(calcMagusSpellCombatAttackPenalty(0)).toBe(-2)
      expect(calcMagusSpellCombatAttackPenalty(2)).toBe(-4)
      expect(calcMagusSpellCombatAttackPenalty(4)).toBe(-6)

      // Spellstrike critical multipliers: weapon crit multiplier + spell x2
      const unconfirmed = calcSpellstrikeCritMultipliers(2, false)
      expect(unconfirmed.weaponMultiplier).toBe(1)
      expect(unconfirmed.spellMultiplier).toBe(1)

      const confirmedRapier = calcSpellstrikeCritMultipliers(2, true)
      expect(confirmedRapier.weaponMultiplier).toBe(2)
      expect(confirmedRapier.spellMultiplier).toBe(2)

      const confirmedPick = calcSpellstrikeCritMultipliers(4, true)
      expect(confirmedPick.weaponMultiplier).toBe(4)
      expect(confirmedPick.spellMultiplier).toBe(2) // Spell damage is ALWAYS x2 in PF1e!
    })

    it("verifies Rogue Underhanded, Halfling Dagger confirmation, and Debilitating Injury penalties", () => {
      // Mariano: 3d6 sneak attack -> 3 * 6 = 18 maximized damage
      expect(calcUnderhandedDamage(3)).toBe(18)
      expect(calcUnderhandedDamage(5)).toBe(30)
      expect(calcUnderhandedDamage(0)).toBe(0)

      // Halfling Favored Class Bonus: +3 critical confirmation with daggers
      expect(calcHalflingDaggerCritConfirm("Halfling", "Dagger")).toBe(3)
      expect(calcHalflingDaggerCritConfirm("Halfling", ["Pugnale da Mischia"])).toBe(3)
      expect(calcHalflingDaggerCritConfirm("Human", "Dagger")).toBe(0)
      expect(calcHalflingDaggerCritConfirm("Halfling", "Shortsword")).toBe(0)

      // Debilitating Injury penalty profiles
      const bewildered = calcDebilitatingInjuryEffect("bewildered")
      expect(bewildered.acPenaltyAll).toBe(-2)
      expect(bewildered.acPenaltyRogue).toBe(-4)
      expect(bewildered.halvesSpeed).toBe(false)

      const disoriented = calcDebilitatingInjuryEffect("disoriented")
      expect(disoriented.atkPenaltyAll).toBe(-2)
      expect(disoriented.atkPenaltyRogue).toBe(-4)

      const hampered = calcDebilitatingInjuryEffect("hampered")
      expect(hampered.halvesSpeed).toBe(true)
    })

    it("verifies Monk Ki Defense +4 Dodge AC bonus integration and Stunning Fist save DC", () => {
      // Agelmund: Level 4, WIS 14 (+2 mod) -> DC 10 + floor(4/2) + 2 = 14
      expect(calcStunningFistDc(4, 2)).toBe(14)
      expect(calcStunningFistDc(8, 4)).toBe(18)

      // Ki Defense Dodge AC bonus (+4)
      const baseAc = {
        total: 16,
        touch: 16,
        flatFooted: 12,
        armorBonus: 0,
        shieldBonus: 0,
        dexBonus: 4,
        sizeMod: 0,
        naturalArmor: 0,
        deflection: 0,
        misc: 0,
        spellFailureChance: 0,
      }
      const kiDodgeBuff = [{
        id: "ki-defense",
        name: "Ki Defense",
        duration: "1 round",
        source: "Monk",
        active: true,
        acMod: 4,
        acType: "dodge" as const,
        attackMod: 0,
        damageMod: 0,
      }]

      // Without Uncanny Dodge: Dodge adds to Total and Touch, excluded from Flat-Footed
      const resultNormal = calcEffectiveArmorClass(baseAc, 4, 4, [], kiDodgeBuff, { hasUncannyDodge: false })
      expect(resultNormal.total).toBe(20)
      expect(resultNormal.touch).toBe(20)
      expect(resultNormal.flatFooted).toBe(12)

      // With Uncanny Dodge: Retains Dodge on Flat-Footed
      const resultUncanny = calcEffectiveArmorClass(baseAc, 4, 4, [], kiDodgeBuff, { hasUncannyDodge: true })
      expect(resultUncanny.total).toBe(20)
      expect(resultUncanny.touch).toBe(20)
      expect(resultUncanny.flatFooted).toBe(20) // Retains +4 DEX and +4 dodge on flat-footed!
    })
  })

  /* -------------------------------------------------------------------------- */
  /* Vector 5: Persistence Serialization & Resilient Normalization             */
  /* -------------------------------------------------------------------------- */
  describe("Vector 5: Persistence Serialization & Resilient Normalization", () => {
    it("achieves 100% lossless JSON serialization and deserialization across all 6 classes", () => {
      const complexSession: SessionState = {
        characterId: "shotrix-blackburn",
        currentHp: 28,
        tempHp: 5,
        nonlethalDamage: 2,
        conditions: ["fatigued"],
        activeBuffIds: ["shield-buff", "haste"],
        spentResources: { "arcane-pool": 2 },
        equippedItemIds: ["rapier-1", "leather-armor"],
        itemQuantities: { "potion-healing": 3 },
        ammo: { "arrows": 20 },
        preparedSpells: { "shocking-grasp": 2, "shield": 1 },
        preparedSpellIds: ["shocking-grasp", "shocking-grasp", "shield"],
        spentPreparedSpells: { "shocking-grasp": 1 },
        spentSpellSlots: {},
        activeSummon: null,
        coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
        actionEconomy: { standard: false, move: true, swift: false, immediate: true, fullRound: false },
        currentRound: 4,
        classMechanics: {
          druid: {
            active: true,
            formId: "wolf",
            meldedArmor: true,
            hasNaturalSpellFeat: false,
            wildShapeActive: true,
            currentFormId: "wolf",
            activeForm: null,
          },
          magus: {
            heldSpellstrike: {
              spellId: "shocking-grasp",
              spellName: "Shocking Grasp",
              spellLevel: 1,
              damageDice: "4d6",
              damageType: "electricity",
              chargesRemaining: 1,
              chargesMax: 1,
              critMultiplier: 2,
            },
            spellCombatActive: true,
            defensiveCastingSacrifice: 2,
            arcanePoolWeapon: { active: true, bonus: 1, remainingRounds: 7 },
            arcaneWeaponActive: true,
            arcaneWeaponRoundsLeft: 7,
            arcaneWeaponBonus: 1,
          },
          bloodrager: {
            isRaging: true,
            roundsRagedThisCombat: 3,
            fatigueCountdown: 0,
            aberrantReachActive: true,
            staggeringStrikeUsesRemaining: 4,
            furiousFocusAppliedThisRound: false,
            isBloodraging: true,
            roundsCurrentRage: 3,
            fatigueRoundsLeft: 0,
            furiousFocusReady: true,
            staggeringStrikeUsesSpent: 1,
          },
          witch: {
            cackleUsedThisRound: false,
            activeHexes: [
              {
                id: "hex-evil-eye-1",
                targetName: "Orc Boss",
                targetType: "enemy",
                hexType: "evil-eye",
                remainingRounds: 5,
                durationRounds: 5,
                isExtendableByCackle: true,
                isCackleable: true,
                cackleExtendable: true,
              },
            ],
            immuneTargets: { "orc-guard": "misfortune" },
            targetImmunities: [],
          },
          monk: {
            kiDefenseRounds: 0,
            kiSpeedRounds: 0,
            kiExtraAttackActive: false,
            stunningFistDeclared: null,
            jabbingStyleActive: true,
            stunningFistDc: 14,
            kiDefenseRoundsLeft: 0,
            kiSpeedRoundsLeft: 0,
            kiExtraAttack: false,
            stunningFistActive: false,
            stunningFistCondition: "stunned",
          },
          rogue: {
            debilitatingInjury: {
              active: true,
              type: "disoriented",
              mode: "disoriented",
              remainingRounds: 1,
              roundsLeft: 1,
              targetName: "Troll",
            },
            underhandedAvailable: true,
            halflingDaggerCritBonusActive: true,
            underhandedReady: false,
            halflingDaggerCritBonus: 3,
          },
        },
      }

      const serialized = JSON.stringify(complexSession)
      const parsed = JSON.parse(serialized) as SessionState
      const normalized = normalizePersistedSession(parsed)

      expect(normalized.characterId).toBe("shotrix-blackburn")
      expect(normalized.classMechanics?.druid?.active).toBe(true)
      expect(normalized.classMechanics?.druid?.formId).toBe("wolf")
      expect(normalized.classMechanics?.magus?.heldSpellstrike?.spellName).toBe("Shocking Grasp")
      expect(normalized.classMechanics?.magus?.defensiveCastingSacrifice).toBe(2)
      expect(normalized.classMechanics?.bloodrager?.isRaging).toBe(true)
      expect(normalized.classMechanics?.witch?.activeHexes).toHaveLength(1)
      expect(normalized.classMechanics?.witch?.activeHexes[0].targetName).toBe("Orc Boss")
      expect(normalized.classMechanics?.rogue?.debilitatingInjury?.type).toBe("disoriented")
      expect(normalized.classMechanics?.rogue?.debilitatingInjury?.targetName).toBe("Troll")
    })

    it("resiliently repairs corrupted, null, and malformed persisted structures", () => {
      const corruptedRaw = ({
        characterId: "mazikeen-noctis",
        currentHp: 20,
        tempHp: 0,
        nonlethalDamage: 0,
        conditions: [],
        activeBuffIds: [],
        spentResources: { "spells-1": 3, "spells-2": 1, "hex-uses": 2 } as Record<string, number>,
        spentPreparedSpells: { "magic-missile": 2.9, "invalid": -5 } as Record<string, number>,
        equippedItemIds: undefined as unknown as string[],
        itemQuantities: undefined as unknown as Record<string, number>,
        ammo: undefined as unknown as Record<string, number>,
        preparedSpells: undefined,
        preparedSpellIds: [] as string[],
        actionEconomy: undefined as unknown as SessionState["actionEconomy"],
        currentRound: undefined as unknown as number,
        classMechanics: {
          witch: {
            cackleUsedThisRound: false,
            activeHexes: null as unknown as [],
            immuneTargets: undefined as unknown as Record<string, string>,
            targetImmunities: "invalid" as unknown as [],
          },
          magus: {
            heldSpellstrike: null,
            spellCombatActive: false,
            defensiveCastingSacrifice: 10,
            arcanePoolWeapon: null,
          },
        },
      } as unknown) as SessionState

      const normalized = normalizePersistedSession(corruptedRaw)

      expect(normalized.spentResources["spells-1"]).toBeUndefined()
      expect(normalized.spentResources["spells-2"]).toBeUndefined()
      expect(normalized.spentResources["hex-uses"]).toBe(2)

      expect(normalized.spentPreparedSpells?.["magic-missile"]).toBe(2)
      expect(normalized.spentPreparedSpells?.["invalid"]).toBeUndefined()

      expect(normalized.equippedItemIds).toEqual([])
      expect(normalized.itemQuantities).toEqual({})
      expect(normalized.ammo).toEqual({})
      expect(normalized.actionEconomy).toBeDefined()
      expect(normalized.currentRound).toBe(1)

      expect(Array.isArray(normalized.classMechanics?.witch?.activeHexes)).toBe(true)
      expect(normalized.classMechanics?.witch?.activeHexes).toEqual([])
      expect(normalized.classMechanics?.witch?.immuneTargets).toEqual({})
      expect(normalized.classMechanics?.witch?.targetImmunities).toEqual([])

      expect(normalized.classMechanics?.magus?.defensiveCastingSacrifice).toBe(4)
    })

    it("falls back to default class mechanics when classMechanics is missing on legacy session", () => {
      const legacySession = ({
        characterId: "knam",
        currentHp: 40,
        tempHp: 0,
        nonlethalDamage: 0,
        conditions: [],
        activeBuffIds: [],
        spentResources: {},
      } as unknown) as SessionState

      const normalized = normalizePersistedSession(legacySession)

      expect(normalized.classMechanics).toBeDefined()
      expect(normalized.classMechanics?.bloodrager).toBeDefined()
      expect(normalized.classMechanics?.bloodrager?.isRaging).toBe(false)
      expect(normalized.classMechanics?.bloodrager?.staggeringStrikeUsesRemaining).toBe(5)
    })
  })
})
