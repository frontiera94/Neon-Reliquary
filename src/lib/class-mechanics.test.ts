import { describe, it, expect, beforeEach } from 'vitest'
import {
  getDefaultClassMechanics,
  normalizeClassMechanics,
  calcHexDc,
  calcStunningFistDc,
  isTargetImmuneToHex,
  calcBloodrageHpShift,
  calcFatigueRounds,
  calcMagusSpellCombatConcentration,
  calcMagusSpellCombatAttackPenalty,
  calcSpellstrikeCritMultipliers,
  calcHalflingDaggerCritConfirm,
  calcDebilitatingInjuryEffect,
  calcUnderhandedDamage,
  advanceTurnMechanics,
} from './class-mechanics'
import { useSessionStore } from '../store/useSessionStore'
import type { SessionState } from '../types/session'
import type { FullCharacter } from '../store/useCharacterStore'
import type { WildShapePreset, HeldSpellstrike } from '../types/class-mechanics'

describe('Milestone M1: Class Mechanics Engine & State Model', () => {
  describe('1. State Initialization & Factory (getDefaultClassMechanics)', () => {
    it('CP-CM-01: initializes default Druid state with inactive Wild Shape', () => {
      const state = getDefaultClassMechanics('noorie', 'Druid')
      expect(state.wildShape).toBeDefined()
      expect(state.wildShape?.active).toBe(false)
      expect(state.wildShape?.formId).toBeNull()
      expect(state.wildShape?.meldedArmor).toBe(false)
      expect(state.druid?.active).toBe(false)
    })

    it('CP-CM-02: initializes default Magus state for spellstrike and spell combat', () => {
      const state = getDefaultClassMechanics('shotrix-blackburn', 'Magus')
      expect(state.magus).toBeDefined()
      expect(state.magus?.heldSpellstrike).toBeNull()
      expect(state.magus?.spellCombatActive).toBe(false)
      expect(state.magus?.defensiveCastingSacrifice).toBe(0)
      expect(state.magus?.arcanePoolWeapon).toBeNull()
    })

    it('CP-CM-03: initializes default Bloodrager state with zero rage and 5 staggering strike uses', () => {
      const state = getDefaultClassMechanics('knam', 'Bloodrager')
      expect(state.bloodrager).toBeDefined()
      expect(state.bloodrager?.isRaging).toBe(false)
      expect(state.bloodrager?.roundsRagedThisCombat).toBe(0)
      expect(state.bloodrager?.fatigueCountdown).toBe(0)
      expect(state.bloodrager?.staggeringStrikeUsesRemaining).toBe(5)
      expect(state.bloodrager?.furiousFocusAppliedThisRound).toBe(false)
    })

    it('CP-CM-04: initializes default Witch state with active hexes array and empty immunities', () => {
      const state = getDefaultClassMechanics('mazikeen-noctis', 'Witch')
      expect(state.witch).toBeDefined()
      expect(state.witch?.cackleUsedThisRound).toBe(false)
      expect(state.witch?.activeHexes).toEqual([])
      expect(state.witch?.immuneTargets).toEqual({})
    })

    it('CP-CM-05: initializes default Monk state with ki defense and speed zeroed', () => {
      const state = getDefaultClassMechanics('agelmund', 'Monk')
      expect(state.monk).toBeDefined()
      expect(state.monk?.kiDefenseRounds).toBe(0)
      expect(state.monk?.kiSpeedRounds).toBe(0)
      expect(state.monk?.kiExtraAttackActive).toBe(false)
      expect(state.monk?.stunningFistDeclared).toBeNull()
      expect(state.monk?.jabbingStyleActive).toBe(false)
      expect(state.monk?.stunningFistDc).toBe(14)
    })

    it('CP-CM-06: initializes default Rogue state with debilitating injury null and underhanded available', () => {
      const state = getDefaultClassMechanics('mariano-cardamomo', 'Rogue')
      expect(state.rogue).toBeDefined()
      expect(state.rogue?.debilitatingInjury).toBeNull()
      expect(state.rogue?.underhandedAvailable).toBe(true)
      expect(state.rogue?.halflingDaggerCritBonusActive).toBe(true)
    })

    it('BVA-CM-01: case-insensitive class name resolution', () => {
      const s1 = getDefaultClassMechanics('test-1', 'bLoOdRaGeR')
      expect(s1.bloodrager).toBeDefined()
      const s2 = getDefaultClassMechanics('test-2', 'DRUID')
      expect(s2.druid).toBeDefined()
      const s3 = getDefaultClassMechanics('test-3', 'witch')
      expect(s3.witch).toBeDefined()
    })

    it('BVA-CM-02: substring & archetype class name resolution', () => {
      const s1 = getDefaultClassMechanics('test-4', 'Unchained Rogue')
      expect(s1.rogue).toBeDefined()
      const s2 = getDefaultClassMechanics('test-5', 'Primal Bloodrager')
      expect(s2.bloodrager).toBeDefined()
    })

    it('BVA-CM-03: unknown non-party class fallback returns empty object', () => {
      const state = getDefaultClassMechanics('npc-1', 'Fighter')
      expect(state).toEqual({})
    })

    it('BVA-CM-04: normalizeClassMechanics defaults missing mechanics on legacy session', () => {
      const norm = normalizeClassMechanics(undefined, 'knam', 'Bloodrager')
      expect(norm.bloodrager?.isRaging).toBe(false)
      expect(norm.bloodrager?.staggeringStrikeUsesRemaining).toBe(5)
    })

    it('BVA-CM-05: normalizeClassMechanics repairs corrupted null arrays without throwing', () => {
      const corrupted = {
        witch: {
          cackleUsedThisRound: true,
          activeHexes: null as unknown as [],
          immuneTargets: null as unknown as Record<string, string>,
        },
      }
      const norm = normalizeClassMechanics(corrupted as unknown as Parameters<typeof normalizeClassMechanics>[0], 'mazikeen-noctis', 'Witch')
      expect(Array.isArray(norm.witch?.activeHexes)).toBe(true)
      expect(norm.witch?.activeHexes).toEqual([])
      expect(norm.witch?.immuneTargets).toEqual({})
    })
  })

  describe('2. Rules Calculations Math', () => {
    it('calculates Witch Hex save DC (10 + floor(level/2) + INT mod = 17)', () => {
      expect(calcHexDc(4, 5)).toBe(17)
      expect(calcHexDc(5, 5)).toBe(17)
      expect(calcHexDc(6, 5)).toBe(18)
      expect(calcHexDc(1, 3)).toBe(13)
    })

    it('calculates Monk Stunning Fist save DC (10 + floor(level/2) + WIS mod = 14)', () => {
      expect(calcStunningFistDc(4, 2)).toBe(14)
      expect(calcStunningFistDc(5, 2)).toBe(14)
      expect(calcStunningFistDc(6, 3)).toBe(16)
    })

    it('identifies immune targets case-insensitively via isTargetImmuneToHex', () => {
      const immunities = [
        { targetName: 'Bugbear Chief', hexType: 'misfortune' as const, appliedAtTimestamp: 1000 },
      ]
      expect(isTargetImmuneToHex('bugbear chief', 'misfortune', immunities)).toBe(true)
      expect(isTargetImmuneToHex('BUGBEAR CHIEF', 'misfortune', immunities)).toBe(true)
      expect(isTargetImmuneToHex('Bugbear Chief', 'slumber', immunities)).toBe(false)
      expect(isTargetImmuneToHex('Goblin Scout', 'misfortune', immunities)).toBe(false)

      // Object mapping variant
      const objImmunities = { 'bugbear chief': { hexType: 'misfortune' as const } }
      expect(isTargetImmuneToHex('Bugbear Chief', 'misfortune', objImmunities)).toBe(true)
    })

    it('calculates Bloodrage HP shift (+2 HP per level with +4 CON = +8 at Lv 4)', () => {
      expect(calcBloodrageHpShift(4, 4)).toBe(8)
      expect(calcBloodrageHpShift(1, 4)).toBe(2)
      expect(calcBloodrageHpShift(5, 4)).toBe(10)
      expect(calcBloodrageHpShift(10, 4)).toBe(20)
    })

    it('calculates fatigue duration upon exiting rage (2x rounds raged)', () => {
      expect(calcFatigueRounds(1)).toBe(2)
      expect(calcFatigueRounds(3)).toBe(6)
      expect(calcFatigueRounds(0)).toBe(0)
    })

    it('calculates Magus Spell Combat attack penalty and concentration sacrifice bonus', () => {
      expect(calcMagusSpellCombatAttackPenalty(0)).toBe(-2)
      expect(calcMagusSpellCombatAttackPenalty(3)).toBe(-5)
      expect(calcMagusSpellCombatAttackPenalty(4)).toBe(-6)
      expect(calcMagusSpellCombatAttackPenalty(10)).toBe(-6) // clamped at 4

      expect(calcMagusSpellCombatConcentration(9, 0)).toBe(9)
      expect(calcMagusSpellCombatConcentration(9, 3)).toBe(12)
      expect(calcMagusSpellCombatConcentration(9, 4)).toBe(13)
      expect(calcMagusSpellCombatConcentration(9, 10)).toBe(13) // clamped at 4
    })

    it('calculates Spellstrike critical hit multipliers (weapon xCrit, spell x2)', () => {
      // Confirmed crit with Rapier (x2)
      const rapier = calcSpellstrikeCritMultipliers(2, true)
      expect(rapier.weaponMultiplier).toBe(2)
      expect(rapier.spellMultiplier).toBe(2)

      // Confirmed crit with Scythe (x4)
      const scythe = calcSpellstrikeCritMultipliers(4, true)
      expect(scythe.weaponMultiplier).toBe(4)
      expect(scythe.spellMultiplier).toBe(2)

      // Unconfirmed threat
      const unconfirmed = calcSpellstrikeCritMultipliers(2, false)
      expect(unconfirmed.weaponMultiplier).toBe(1)
      expect(unconfirmed.spellMultiplier).toBe(1)
    })

    it('applies Halfling dagger critical confirmation bonus (+3)', () => {
      expect(calcHalflingDaggerCritConfirm('Halfling', 'Dagger')).toBe(3)
      expect(calcHalflingDaggerCritConfirm('Halfling', ['Light', 'Pugnale'])).toBe(3)
      expect(calcHalflingDaggerCritConfirm('Human', 'Dagger')).toBe(0)
      expect(calcHalflingDaggerCritConfirm('Halfling', 'Shortsword')).toBe(0)
    })

    it('calculates Debilitating Injury penalties for Bewildered, Disoriented, and Hampered', () => {
      const bew = calcDebilitatingInjuryEffect('bewildered')
      expect(bew.acPenaltyAll).toBe(-2)
      expect(bew.acPenaltyRogue).toBe(-4)
      expect(bew.halvesSpeed).toBe(false)

      const dis = calcDebilitatingInjuryEffect('disoriented')
      expect(dis.atkPenaltyAll).toBe(-2)
      expect(dis.atkPenaltyRogue).toBe(-4)
      expect(dis.halvesSpeed).toBe(false)

      const ham = calcDebilitatingInjuryEffect('hampered')
      expect(ham.halvesSpeed).toBe(true)
      expect(ham.acPenaltyAll).toBe(0)
    })

    it('calculates maximized Rogue Underhanded sneak attack damage (3d6 -> 18)', () => {
      expect(calcUnderhandedDamage(3)).toBe(18)
      expect(calcUnderhandedDamage(1)).toBe(6)
      expect(calcUnderhandedDamage(5)).toBe(30)
    })
  })

  describe('3. advanceTurnMechanics Lifecycle Engine', () => {
    let mockSession: SessionState
    let mockKnam: FullCharacter

    beforeEach(() => {
      mockSession = {
        characterId: 'knam',
        currentHp: 51,
        tempHp: 0,
        nonlethalDamage: 0,
        spentResources: {},
        activeBuffIds: [],
        conditions: [],
        preparedSpellIds: [],
        spentSpellSlots: {},
        ammo: {},
        activeSummon: null,
        itemQuantities: {},
        coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
        currentRound: 1,
        actionEconomy: { standard: true, move: true, swift: true, immediate: false, fullRound: true },
        classMechanics: {
          bloodrager: {
            isRaging: false,
            roundsRagedThisCombat: 0,
            fatigueCountdown: 2,
            aberrantReachActive: false,
            staggeringStrikeUsesRemaining: 5,
            furiousFocusAppliedThisRound: true,
          },
        },
      }
      mockKnam = {
        id: 'knam',
        class: 'Bloodrager',
        level: 4,
        abilities: { con: 16 } as unknown as FullCharacter['abilities'],
        dailyResources: [{ id: 'bloodrage-rounds', name: 'Bloodrage Rounds', total: 14 }] as unknown as FullCharacter['dailyResources'],
      } as unknown as FullCharacter
    })

    it('resets action economy and increments combat round', () => {
      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.currentRound).toBe(2)
      expect(next.actionEconomy?.standard).toBe(false)
      expect(next.actionEconomy?.move).toBe(false)
      expect(next.actionEconomy?.fullRound).toBe(false)
    })

    it('resets furiousFocusAppliedThisRound to false', () => {
      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.classMechanics?.bloodrager?.furiousFocusAppliedThisRound).toBe(false)
      expect(next.classMechanics?.bloodrager?.furiousFocusReady).toBe(true)
    })

    it('decrements fatigueCountdown from 2 to 1 and retains fatigued condition', () => {
      mockSession.conditions = ['fatigued']
      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.classMechanics?.bloodrager?.fatigueCountdown).toBe(1)
      expect(next.conditions).toContain('fatigued')
    })

    it('decrements fatigueCountdown from 1 to 0 and removes fatigued condition while preserving shaken', () => {
      mockSession.conditions = ['fatigued', 'shaken']
      mockSession.classMechanics!.bloodrager!.fatigueCountdown = 1
      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.classMechanics?.bloodrager?.fatigueCountdown).toBe(0)
      expect(next.conditions).not.toContain('fatigued')
      expect(next.conditions).toContain('shaken')
    })

    it('handles fatigue countdown already zero without underflow', () => {
      mockSession.conditions = []
      mockSession.classMechanics!.bloodrager!.fatigueCountdown = 0
      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.classMechanics?.bloodrager?.fatigueCountdown).toBe(0)
    })

    it('increments roundsRagedThisCombat and spent resources when actively bloodraging', () => {
      mockSession.classMechanics!.bloodrager!.isRaging = true
      mockSession.classMechanics!.bloodrager!.roundsRagedThisCombat = 2
      mockSession.spentResources = { 'bloodrage-rounds': 2 }

      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.classMechanics?.bloodrager?.roundsRagedThisCombat).toBe(3)
      expect(next.spentResources['bloodrage-rounds']).toBe(3)
      expect(next.classMechanics?.bloodrager?.isRaging).toBe(true)
    })

    it('auto-exits bloodrage when daily rage rounds are exhausted', () => {
      mockSession.classMechanics!.bloodrager!.isRaging = true
      mockSession.classMechanics!.bloodrager!.roundsRagedThisCombat = 13
      mockSession.spentResources = { 'bloodrage-rounds': 13 } // max is 14
      mockSession.currentHp = 30

      const next = advanceTurnMechanics(mockSession, mockKnam)
      expect(next.classMechanics?.bloodrager?.isRaging).toBe(false)
      expect(next.conditions).toContain('fatigued')
      expect(next.classMechanics?.bloodrager?.fatigueCountdown).toBe(28) // 14 * 2
      expect(next.currentHp).toBe(22) // 30 - 8
    })

    it('resets Witch cackleUsedThisRound and decrements active hex durations', () => {
      const witchSession: SessionState = {
        ...mockSession,
        characterId: 'mazikeen-noctis',
        classMechanics: {
          witch: {
            cackleUsedThisRound: true,
            immuneTargets: {},
            activeHexes: [
              { id: '1', hexType: 'evil-eye', targetName: 'Orc Boss', targetType: 'enemy', remainingRounds: 2, isExtendableByCackle: true },
              { id: '2', hexType: 'misfortune', targetName: 'Goblin', targetType: 'enemy', remainingRounds: 1, isExtendableByCackle: true },
            ],
          },
        },
      }
      const witchChar = { id: 'mazikeen-noctis', class: 'Witch', level: 4 } as FullCharacter
      const next = advanceTurnMechanics(witchSession, witchChar)
      expect(next.classMechanics?.witch?.cackleUsedThisRound).toBe(false)
      expect(next.classMechanics?.witch?.activeHexes).toHaveLength(1)
      expect(next.classMechanics?.witch?.activeHexes[0].remainingRounds).toBe(1)
      expect(next.classMechanics?.witch?.activeHexes[0].hexType).toBe('evil-eye')
    })

    it('resets Monk kiExtraAttackActive, stunningFistDeclared and decrements ki defense/speed', () => {
      const monkSession: SessionState = {
        ...mockSession,
        characterId: 'agelmund',
        classMechanics: {
          monk: {
            kiDefenseRounds: 1,
            kiSpeedRounds: 1,
            kiExtraAttackActive: true,
            stunningFistDeclared: 'stunned',
            jabbingStyleActive: true,
          },
        },
      }
      const monkChar = { id: 'agelmund', class: 'Monk', level: 4 } as FullCharacter
      const next = advanceTurnMechanics(monkSession, monkChar)
      expect(next.classMechanics?.monk?.kiExtraAttackActive).toBe(false)
      expect(next.classMechanics?.monk?.stunningFistDeclared).toBeNull()
      expect(next.classMechanics?.monk?.kiDefenseRounds).toBe(0)
      expect(next.classMechanics?.monk?.kiSpeedRounds).toBe(0)
    })

    it('decrements Magus arcanePoolWeapon remaining rounds', () => {
      const magusSession: SessionState = {
        ...mockSession,
        characterId: 'shotrix-blackburn',
        classMechanics: {
          magus: {
            heldSpellstrike: null,
            spellCombatActive: false,
            defensiveCastingSacrifice: 0,
            arcanePoolWeapon: { active: true, bonus: 1, remainingRounds: 10 },
          },
        },
      }
      const magusChar = { id: 'shotrix-blackburn', class: 'Magus', level: 4 } as FullCharacter
      const next = advanceTurnMechanics(magusSession, magusChar)
      expect(next.classMechanics?.magus?.arcanePoolWeapon?.remainingRounds).toBe(9)
    })

    it('decrements Rogue debilitating injury and nullifies when duration reaches 0', () => {
      const rogueSession: SessionState = {
        ...mockSession,
        characterId: 'mariano-cardamomo',
        classMechanics: {
          rogue: {
            debilitatingInjury: { active: true, type: 'bewildered', remainingRounds: 1, targetName: 'Troll' },
            underhandedAvailable: true,
            halflingDaggerCritBonusActive: true,
          },
        },
      }
      const rogueChar = { id: 'mariano-cardamomo', class: 'Rogue', level: 5 } as FullCharacter
      const next = advanceTurnMechanics(rogueSession, rogueChar)
      expect(next.classMechanics?.rogue?.debilitatingInjury).toBeNull()
    })

    it('maintains strict state isolation between different characters', () => {
      const witchSession: SessionState = {
        ...mockSession,
        characterId: 'mazikeen-noctis',
        classMechanics: {
          witch: {
            cackleUsedThisRound: true,
            immuneTargets: {},
            activeHexes: [{ id: '1', hexType: 'evil-eye', targetName: 'Boss', targetType: 'enemy', remainingRounds: 2, isExtendableByCackle: true }],
          },
        },
      }
      const witchChar = { id: 'mazikeen-noctis', class: 'Witch', level: 4 } as FullCharacter
      const nextWitch = advanceTurnMechanics(witchSession, witchChar)
      expect(nextWitch.characterId).toBe('mazikeen-noctis')
      expect(mockSession.classMechanics?.bloodrager?.fatigueCountdown).toBe(2) // Knam unaffected
    })
  })

  describe('4. Zustand useSessionStore Integration', () => {
    const knamChar = {
      id: 'knam',
      name: 'Knam',
      class: 'Bloodrager',
      level: 4,
      abilities: { con: 16 } as unknown as FullCharacter['abilities'],
      buffs: [{ id: 'bloodrage', name: 'Bloodrage', active: false, attackMod: 2, damageMod: 3, acMod: -2 }] as unknown as FullCharacter['buffs'],
      dailyResources: [{ id: 'bloodrage-rounds', name: 'Bloodrage Rounds', total: 14 }] as unknown as FullCharacter['dailyResources'],
    } as unknown as FullCharacter

    beforeEach(() => {
      useSessionStore.setState({ sessions: {} })
    })

    it('enters and exits Bloodrage with genuine HP shifts and fatigue application', () => {
      useSessionStore.getState().initSession('knam', 51)
      expect(useSessionStore.getState().sessions['knam'].currentHp).toBe(51)

      // Enter Bloodrage: +8 HP
      useSessionStore.getState().enterBloodrage('knam', knamChar)
      const ragingSess = useSessionStore.getState().sessions['knam']
      expect(ragingSess.currentHp).toBe(59)
      expect(ragingSess.classMechanics?.bloodrager?.isRaging).toBe(true)

      // Advance turn 2 rounds in rage
      useSessionStore.getState().advanceCharacterTurn('knam', knamChar)
      useSessionStore.getState().advanceCharacterTurn('knam', knamChar)

      // Exit Bloodrage: -8 HP, 4 rounds fatigue
      const exitResult = useSessionStore.getState().exitBloodrage('knam', knamChar)
      expect(exitResult.isLethal).toBe(false)
      expect(exitResult.remainingHp).toBe(51)

      const exitedSess = useSessionStore.getState().sessions['knam']
      expect(exitedSess.classMechanics?.bloodrager?.isRaging).toBe(false)
      expect(exitedSess.conditions).toContain('fatigued')
      expect(exitedSess.classMechanics?.bloodrager?.fatigueCountdown).toBe(4) // 2 rounds raged * 2
    })

    it('alerts lethal exit when exiting Bloodrage drops HP <= 0 or <= -CON', () => {
      useSessionStore.getState().initSession('knam', 51)
      useSessionStore.getState().enterBloodrage('knam', knamChar)

      // Take damage down to 6 HP (raging)
      useSessionStore.getState().setHp('knam', 6)

      const exitResult = useSessionStore.getState().exitBloodrage('knam', knamChar)
      expect(exitResult.isLethal).toBe(true)
      expect(exitResult.remainingHp).toBe(-2) // 6 - 8 = -2 (dying)
    })

    it('handles Witch hex application, cackle extension, and removal', () => {
      useSessionStore.getState().initSession('mazikeen-noctis', 38)

      // Apply hex
      useSessionStore.getState().applyHex('mazikeen-noctis', {
        hexType: 'evil-eye',
        targetName: 'Ogre',
        targetType: 'enemy',
        remainingRounds: 1,
        isExtendableByCackle: true,
      })

      let sess = useSessionStore.getState().sessions['mazikeen-noctis']
      expect(sess.classMechanics?.witch?.activeHexes).toHaveLength(1)
      const activeHexes = sess.classMechanics?.witch?.activeHexes ?? []
      const hexId = activeHexes[0]?.id ?? ''

      // Use Cackle: extends duration to 2
      const cackled = useSessionStore.getState().useCackle('mazikeen-noctis')
      expect(cackled).toBe(true)
      sess = useSessionStore.getState().sessions['mazikeen-noctis']
      expect(sess.classMechanics?.witch?.activeHexes[0].remainingRounds).toBe(2)
      expect(sess.classMechanics?.witch?.cackleUsedThisRound).toBe(true)

      // Cannot cackle twice in the same round
      expect(useSessionStore.getState().useCackle('mazikeen-noctis')).toBe(false)

      // Remove hex
      useSessionStore.getState().removeHex('mazikeen-noctis', hexId)
      sess = useSessionStore.getState().sessions['mazikeen-noctis']
      expect(sess.classMechanics?.witch?.activeHexes).toHaveLength(0)
    })

    it('toggles Druid Wild Shape preset in session', () => {
      useSessionStore.getState().initSession('noorie', 30)
      const wolfPreset: WildShapePreset = {
        id: 'wolf',
        name: 'Wolf',
        size: 'Medium',
        naturalArmorBonus: 2,
        speed: 50,
        senses: ['Low-light vision', 'Scent'],
      }

      useSessionStore.getState().setWildShape('noorie', wolfPreset)
      let sess = useSessionStore.getState().sessions['noorie']
      expect(sess.classMechanics?.druid?.active).toBe(true)
      expect(sess.classMechanics?.druid?.formId).toBe('wolf')

      useSessionStore.getState().setWildShape('noorie', null)
      sess = useSessionStore.getState().sessions['noorie']
      expect(sess.classMechanics?.druid?.active).toBe(false)
      expect(sess.classMechanics?.druid?.formId).toBeNull()
    })

    it('arms and consumes Magus Spellstrike touch charges', () => {
      useSessionStore.getState().initSession('shotrix-blackburn', 43)
      const spellstrike: HeldSpellstrike = {
        spellId: 'chill-touch',
        spellName: 'Chill Touch',
        spellLevel: 1,
        damageDice: '1d6',
        damageType: 'negative',
        chargesRemaining: 4,
        chargesMax: 4,
        critMultiplier: 2,
      }

      useSessionStore.getState().setHeldSpellstrike('shotrix-blackburn', spellstrike)
      let sess = useSessionStore.getState().sessions['shotrix-blackburn']
      expect(sess.classMechanics?.magus?.heldSpellstrike?.chargesRemaining).toBe(4)

      useSessionStore.getState().consumeSpellstrikeCharge('shotrix-blackburn')
      sess = useSessionStore.getState().sessions['shotrix-blackburn']
      expect(sess.classMechanics?.magus?.heldSpellstrike?.chargesRemaining).toBe(3)
    })

    it('activates Monk Ki Defense and Ki Extra Attack', () => {
      useSessionStore.getState().initSession('agelmund', 42)
      useSessionStore.getState().activateKiDefense('agelmund')
      useSessionStore.getState().activateKiExtraAttack('agelmund')

      const sess = useSessionStore.getState().sessions['agelmund']
      expect(sess.classMechanics?.monk?.kiDefenseRounds).toBe(1)
      expect(sess.classMechanics?.monk?.kiExtraAttackActive).toBe(true)
    })

    it('resets all class mechanics and clears hex immunities on Long Rest', () => {
      useSessionStore.getState().initSession('mazikeen-noctis', 38)
      useSessionStore.getState().applyHex('mazikeen-noctis', {
        hexType: 'slumber',
        targetName: 'Troll King',
        targetType: 'enemy',
        remainingRounds: 4,
        isExtendableByCackle: false,
      })

      // Perform long rest
      useSessionStore.getState().longRest('mazikeen-noctis', 38)
      const rested = useSessionStore.getState().sessions['mazikeen-noctis']
      expect(rested.classMechanics?.witch?.activeHexes).toHaveLength(0)
      expect(rested.classMechanics?.witch?.immuneTargets).toEqual({})
      expect(rested.classMechanics?.witch?.cackleUsedThisRound).toBe(false)
    })
  })
})
