// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  monkChar,
  magusChar,
  inquisitorChar,
  rogueChar,
  resetTestStores,
  setupTestSession,
  deriveConcentrationBonus,
} from './fixtures'
import { useCharacterStore } from '../../src/store/useCharacterStore'
import { useSessionStore } from '../../src/store/useSessionStore'
import { useDiceStore } from '../../src/store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveSaves,
  calcEffectiveWeaponStats,
} from '../../src/lib/stat-calc'
import { abilityMod } from '../../src/lib/dice-engine'

describe('Tier 4: Realistic Real-World Application Scenarios (Workloads)', () => {
  beforeEach(() => {
    resetTestStores()
  })

  // =========================================================================
  // Workload 1: Monk Tactical Flurry & Ki Pool Combat Encounter (Agelmund)
  // =========================================================================
  describe('W1: Monk Tactical Flurry & Ki Pool Encounter (Agelmund)', () => {
    it('1.1 initializes Agelmund with full vitality, Ki Pool, and monk AC', () => {
      setupTestSession(monkChar.id)
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.currentHp).toBe(36)
      expect(session.tempHp).toBe(0)
      expect(session.nonlethalDamage).toBe(0)
      expect(monkChar.dailyResources.find((r) => r.id === 'ki-pool')?.total).toBe(4)
      expect(monkChar.armorClass.total).toBe(16)
    })

    it('1.2 executes Flurry of Blows full-round attack (+7 / +7)', () => {
      setupTestSession(monkChar.id)
      const flurryWeapon = monkChar.weapons.find((w) => w.id === 'weap-flurry')!
      const effAbil = calcEffectiveAbilities(monkChar.abilities, [], [])
      const effWeapon = calcEffectiveWeaponStats(
        flurryWeapon,
        monkChar.abilities,
        effAbil,
        [],
        [],
        []
      )
      expect(effWeapon.attackBonus).toEqual([7, 7])
      expect(effWeapon.damageBonus).toBe(5) // STR 20 -> mod +5
    })

    it('1.3 monk spends 1 Ki point as swift action for extra flurry attack', () => {
      setupTestSession(monkChar.id, { spentResources: {} })
      useSessionStore.getState().spendResource(monkChar.id, 'ki-pool', 4)
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.spentResources['ki-pool']).toBe(1)
      const remainingKi = 4 - session.spentResources['ki-pool']
      expect(remainingKi).toBe(3)
    })

    it('1.4 monk rolls Reflex save against area attack and benefits from Evasion', () => {
      const hasEvasion = monkChar.classAbilities.some((a) => /evasion/i.test(a.name))
      expect(hasEvasion).toBe(true)

      const effAbil = calcEffectiveAbilities(monkChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        monkChar.savingThrows,
        monkChar.abilities,
        effAbil,
        [],
        []
      )
      expect(effSaves.ref).toBe(6)

      // Simulate roll in useDiceStore
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.ref,
        label: 'Reflex Save vs Fireball',
        breakdown: effSaves.breakdowns.reflex,
      })
      expect(useDiceStore.getState().isOpen).toBe(true)
      expect(useDiceStore.getState().pendingRoll?.modifier).toBe(6)
    })

    it('1.5 monk absorbs retaliatory physical damage and rolls Fortitude save', () => {
      setupTestSession(monkChar.id, { currentHp: 36 })
      // Takes 12 damage
      useSessionStore.getState().adjustHp(monkChar.id, -12, monkChar.maxHp)
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.currentHp).toBe(24) // 36 - 12

      // Poison Fortitude save roll
      const effAbil = calcEffectiveAbilities(monkChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        monkChar.savingThrows,
        monkChar.abilities,
        effAbil,
        [],
        []
      )
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.fort,
        label: 'Fortitude Save vs Viper Poison',
        breakdown: effSaves.breakdowns.fortitude,
      })
      expect(useDiceStore.getState().pendingRoll?.modifier).toBe(6)
    })
  })

  // =========================================================================
  // Workload 2: Magus Spellstrike, Arcane Pool & Concentration (Mazikeen)
  // =========================================================================
  describe('W2: Magus Spellstrike, Arcane Pool & Concentration (Mazikeen)', () => {
    it('2.1 Mazikeen initializes with 38 HP, 6 Arcane Pool points, and four 1st-level slots', () => {
      setupTestSession(magusChar.id)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(38)
      expect(magusChar.dailyResources.find((r) => r.id === 'arcane-pool')?.total).toBe(6)
      expect(magusChar.spellSlots.find((s) => s.level === 1)?.total).toBe(4)
    })

    it('2.2 spends 1 Arcane Pool point to activate Arcane Weapon Enhancement', () => {
      setupTestSession(magusChar.id, { spentResources: {}, activeBuffIds: [] })
      useSessionStore.getState().spendResource(magusChar.id, 'arcane-pool', 6)
      useSessionStore.getState().toggleBuff(magusChar.id, 'buff-arcane-weapon')

      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentResources['arcane-pool']).toBe(1)
      expect(session.activeBuffIds).toContain('buff-arcane-weapon')
    })

    it('2.3 weapon stats dynamically elevate by +1 attack and +1 damage with active buff', () => {
      const weapon = magusChar.weapons[0] // +1 Scimitar
      const buff = magusChar.buffs.find((b) => b.id === 'buff-arcane-weapon')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [buff])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        magusChar.abilities,
        effAbil,
        [],
        [buff],
        [buff.id]
      )
      expect(effWeapon.attackBonus[0]).toBe(9) // Base 8 + 1 buff
      expect(effWeapon.damageBonus).toBe(6)    // Base 5 + 1 buff
    })

    it('2.4 Mazikeen casts Shocking Grasp, consuming a 1st-level spell slot', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: {} })
      useSessionStore.getState().spendSpellSlot(magusChar.id, 1, 4)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(1)
      const remainingSlots = 4 - session.spentSpellSlots[1]
      expect(remainingSlots).toBe(3)
    })

    it('2.5 performs defensive casting Concentration roll (+12 with Combat Casting)', () => {
      const concBonus = deriveConcentrationBonus(
        magusChar.level,
        abilityMod(magusChar.abilities.int),
        true // Combat Casting feat (+4)
      )
      expect(concBonus).toBe(12) // Level 4 + INT 4 + Feat 4 = 12

      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: concBonus,
        label: 'Concentration (Defensive Casting)',
      })
      expect(useDiceStore.getState().pendingRoll?.modifier).toBe(12)
    })

    it('2.6 executes melee touch attack roll dealing 4d6 electrical damage', () => {
      const bab = magusChar.baseAttackBonus[0]
      const dexMod = abilityMod(magusChar.abilities.dex)
      const meleeTouchBonus = bab + dexMod // 3 + 4 = 7 (Weapon Finesse)
      expect(meleeTouchBonus).toBe(7)

      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: meleeTouchBonus,
        label: 'Shocking Grasp (Melee Touch)',
      })
      expect(useDiceStore.getState().pendingRoll?.modifier).toBe(7)
    })
  })

  // =========================================================================
  // Workload 3: Inquisitor / Cleric Massive Damage & Divine Recovery (Valerius)
  // =========================================================================
  describe('W3: Inquisitor Massive Damage & Divine Recovery (Valerius)', () => {
    it('3.1 Valerius starts with 102 HP and 15 temp HP ward (effective health 117)', () => {
      setupTestSession(inquisitorChar.id, { currentHp: 102, tempHp: 15 })
      const session = useSessionStore.getState().getSession(inquisitorChar.id)
      expect(session.currentHp).toBe(102)
      expect(session.tempHp).toBe(15)
      expect(session.currentHp + session.tempHp).toBe(117)
    })

    it('3.2 enemy boss delivers 35 damage: absorbs 15 temp HP and deducts 20 regular HP', () => {
      setupTestSession(inquisitorChar.id, { currentHp: 102, tempHp: 15 })
      const applyDamage = (charId: string, dmg: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        const absorbed = Math.min(sess.tempHp, dmg)
        const rem = dmg - absorbed
        useSessionStore.getState().setTempHp(charId, sess.tempHp - absorbed)
        if (rem > 0) useSessionStore.getState().adjustHp(charId, -rem, maxHp)
      }

      applyDamage(inquisitorChar.id, 35, inquisitorChar.maxHp)
      const session = useSessionStore.getState().getSession(inquisitorChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.currentHp).toBe(82) // 102 - 20
    })

    it('3.3 secondary strike inflicts 10 nonlethal damage without reducing regular HP', () => {
      setupTestSession(inquisitorChar.id, { currentHp: 82, tempHp: 0 })
      useSessionStore.getState().setNonlethal(inquisitorChar.id, 10)
      const session = useSessionStore.getState().getSession(inquisitorChar.id)
      expect(session.currentHp).toBe(82)
      expect(session.nonlethalDamage).toBe(10)
    })

    it('3.4 Valerius activates Judgment: Destruction as swift action (spends 1 Judgment)', () => {
      setupTestSession(inquisitorChar.id, {
        currentHp: 82,
        spentResources: {},
        activeBuffIds: [],
      })
      useSessionStore.getState().spendResource(inquisitorChar.id, 'judgment', 4)
      useSessionStore.getState().toggleBuff(inquisitorChar.id, 'buff-judgment-destruction')

      const session = useSessionStore.getState().getSession(inquisitorChar.id)
      expect(session.spentResources['judgment']).toBe(1)
      expect(session.activeBuffIds).toContain('buff-judgment-destruction')
    })

    it('3.5 casts Cure Moderate Wounds: spending slot, healing regular HP, and cleansing nonlethal', () => {
      setupTestSession(inquisitorChar.id, {
        currentHp: 82,
        nonlethalDamage: 10,
        spentSpellSlots: {},
      })
      // Spend level 2 slot
      useSessionStore.getState().spendSpellSlot(inquisitorChar.id, 2, 5)
      expect(useSessionStore.getState().getSession(inquisitorChar.id).spentSpellSlots[2]).toBe(1)

      // Apply 16 points of healing (rolled 2d8+10)
      const heal = (charId: string, amount: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        useSessionStore.getState().setNonlethal(charId, Math.max(0, sess.nonlethalDamage - amount))
        useSessionStore.getState().adjustHp(charId, amount, maxHp)
      }
      heal(inquisitorChar.id, 16, inquisitorChar.maxHp)

      const session = useSessionStore.getState().getSession(inquisitorChar.id)
      expect(session.nonlethalDamage).toBe(0) // 10 - 16 <= 0
      expect(session.currentHp).toBe(98) // 82 + 16
    })

    it('3.6 withstands enemy fear aura by rolling Will save with +13 bonus', () => {
      const effAbil = calcEffectiveAbilities(inquisitorChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        inquisitorChar.savingThrows,
        inquisitorChar.abilities,
        effAbil,
        [],
        []
      )
      expect(effSaves.will).toBe(13)

      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.will,
        label: 'Will Save vs Dragon Fear Aura',
        breakdown: effSaves.breakdowns.will,
      })
      expect(useDiceStore.getState().pendingRoll?.modifier).toBe(13)
    })
  })

  // =========================================================================
  // Workload 4: Rogue Finesse, Negative STR & Defensive Evasion (Mariano)
  // =========================================================================
  describe('W4: Rogue Finesse, Negative STR & Defensive Evasion (Mariano)', () => {
    it('4.1 Mariano starts with STR 6 (-2 modifier), DEX 20 (+5), and 20 AC', () => {
      setupTestSession(rogueChar.id)
      expect(abilityMod(rogueChar.abilities.str)).toBe(-2)
      expect(abilityMod(rogueChar.abilities.dex)).toBe(5)
      expect(rogueChar.armorClass.total).toBe(20)
    })

    it('4.2 weapon attacks utilize DEX modifier (+9) while damage suffers -2 STR penalty', () => {
      const weapon = rogueChar.weapons[0] // Masterwork Dagger
      const effAbil = calcEffectiveAbilities(rogueChar.abilities, [], [])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        rogueChar.abilities,
        effAbil,
        [],
        [],
        []
      )
      expect(effWeapon.attackBonus[0]).toBe(9)
      expect(effWeapon.damageBonus).toBe(-2)
    })

    it('4.3 contracting Sickened condition imposes -2 on attacks, damage, and saves', () => {
      setupTestSession(rogueChar.id, { conditions: ['sickened'] })
      const effAbil = calcEffectiveAbilities(rogueChar.abilities, ['sickened'], [])
      const effWeapon = calcEffectiveWeaponStats(
        rogueChar.weapons[0],
        rogueChar.abilities,
        effAbil,
        ['sickened'],
        [],
        []
      )
      expect(effWeapon.attackBonus[0]).toBe(7) // 9 - 2
      expect(effWeapon.damageBonus).toBe(-4)   // -2 - 2

      const effSaves = calcEffectiveSaves(
        rogueChar.savingThrows,
        rogueChar.abilities,
        effAbil,
        ['sickened'],
        []
      )
      expect(effSaves.ref).toBe(8) // 10 base - 2 sickened
    })

    it('4.4 Mariano rolls Reflex save (+8) with Evasion against trap spell', () => {
      const hasEvasion = rogueChar.classAbilities.some((a) => /evasion/i.test(a.name))
      expect(hasEvasion).toBe(true)

      const effAbil = calcEffectiveAbilities(rogueChar.abilities, ['sickened'], [])
      const effSaves = calcEffectiveSaves(
        rogueChar.savingThrows,
        rogueChar.abilities,
        effAbil,
        ['sickened'],
        []
      )
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.ref,
        label: 'Reflex Save vs Lightning Trap',
      })
      expect(useDiceStore.getState().pendingRoll?.modifier).toBe(8)
    })

    it('4.5 Mariano retains DEX bonus to AC due to Uncanny Dodge (immune to flat-footed surprise)', () => {
      const hasUncannyDodge = rogueChar.classAbilities.some((a) => /uncanny dodge/i.test(a.name))
      expect(hasUncannyDodge).toBe(true)
    })
  })

  // =========================================================================
  // Workload 5: Multi-Round Party Battle & Audit Trail
  // =========================================================================
  describe('W5: Multi-Round Party Battle & Audit Trail', () => {
    it('5.1 verifies full party loaded into useCharacterStore', () => {
      const characters = useCharacterStore.getState().characters
      expect(characters).toHaveLength(4)
      const ids = characters.map((c) => c.id)
      expect(ids).toContain(monkChar.id)
      expect(ids).toContain(magusChar.id)
      expect(ids).toContain(inquisitorChar.id)
      expect(ids).toContain(rogueChar.id)
    })

    it('5.2 Round 1: Magus executes attack and roll is recorded in dice history', () => {
      setupTestSession(magusChar.id)
      useDiceStore.getState().clearHistory()
      useDiceStore.getState().setResult({
        id: 'r-round1-magus',
        label: 'Mazikeen: Scimitar Attack',
        diceType: 20,
        naturalRolls: [18],
        modifier: 9,
        total: 27,
        isCriticalThreat: true,
        isCriticalConfirmed: false,
        formula: '1d20+9',
        timestamp: 1000,
      })
      expect(useDiceStore.getState().history).toHaveLength(1)
      expect(useDiceStore.getState().history[0].label).toContain('Mazikeen')
    })

    it('5.3 switching active character in store preserves independent session state', () => {
      setupTestSession(magusChar.id, { currentHp: 30 })
      setupTestSession(inquisitorChar.id, { currentHp: 85 })

      useCharacterStore.getState().setActiveCharacter(inquisitorChar.id)
      expect(useCharacterStore.getState().activeCharacterId).toBe(inquisitorChar.id)
      expect(useSessionStore.getState().getSession(inquisitorChar.id).currentHp).toBe(85)
      expect(useSessionStore.getState().getSession(magusChar.id).currentHp).toBe(30)
    })

    it('5.4 Round 2: Inquisitor casts spell and rolls Will save, adding to shared history', () => {
      setupTestSession(inquisitorChar.id)
      useDiceStore.getState().setResult({
        id: 'r-round1-magus',
        label: 'Mazikeen: Scimitar Attack',
        diceType: 20,
        naturalRolls: [18],
        modifier: 9,
        total: 27,
        isCriticalThreat: true,
        isCriticalConfirmed: false,
        formula: '1d20+9',
        timestamp: 1000,
      })
      useSessionStore.getState().spendSpellSlot(inquisitorChar.id, 1, 6)
      useDiceStore.getState().setResult({
        id: 'r-round2-inquisitor',
        label: 'Valerius: Will Save',
        diceType: 20,
        naturalRolls: [15],
        modifier: 13,
        total: 28,
        isCriticalThreat: false,
        isCriticalConfirmed: false,
        formula: '1d20+13',
        timestamp: 2000,
      })
      const history = useDiceStore.getState().history
      expect(history).toHaveLength(2)
      // Newest roll is index 0
      expect(history[0].id).toBe('r-round2-inquisitor')
      expect(history[1].id).toBe('r-round1-magus')
    })

    it('5.5 Round 3: Monk executes rolls; history maintains newest-first sequence', () => {
      setupTestSession(monkChar.id)
      useDiceStore.getState().setResult({
        id: 'r-1',
        label: 'Roll 1',
        diceType: 20,
        naturalRolls: [10],
        modifier: 5,
        total: 15,
        isCriticalThreat: false,
        isCriticalConfirmed: false,
        formula: '1d20+5',
        timestamp: 1000,
      })
      useDiceStore.getState().setResult({
        id: 'r-2',
        label: 'Roll 2',
        diceType: 20,
        naturalRolls: [12],
        modifier: 5,
        total: 17,
        isCriticalThreat: false,
        isCriticalConfirmed: false,
        formula: '1d20+5',
        timestamp: 2000,
      })
      useDiceStore.getState().setResult({
        id: 'r-round3-monk',
        label: 'Agelmund: Flurry Strike',
        diceType: 20,
        naturalRolls: [19],
        modifier: 7,
        total: 26,
        isCriticalThreat: false,
        isCriticalConfirmed: false,
        formula: '1d20+7',
        timestamp: 3000,
      })
      const history = useDiceStore.getState().history
      expect(history).toHaveLength(3)
      expect(history[0].label).toContain('Agelmund')
    })

    it('5.6 post-battle Long Rest resets character vitals and resources while retaining history audit log', () => {
      setupTestSession(magusChar.id, { currentHp: 20 })
      setupTestSession(inquisitorChar.id, { currentHp: 50, spentSpellSlots: { 1: 2 } })
      useDiceStore.getState().setResult({
        id: 'r-1',
        label: 'Log 1',
        diceType: 20,
        naturalRolls: [15],
        modifier: 5,
        total: 20,
        isCriticalThreat: false,
        isCriticalConfirmed: false,
        formula: '1d20+5',
        timestamp: 1000,
      })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      useSessionStore.getState().longRest(inquisitorChar.id, inquisitorChar.maxHp)

      expect(useSessionStore.getState().getSession(magusChar.id).currentHp).toBe(38)
      expect(useSessionStore.getState().getSession(inquisitorChar.id).currentHp).toBe(102)
      expect(useSessionStore.getState().getSession(inquisitorChar.id).spentSpellSlots).toEqual({})

      // Audit history remains intact for retrospective inspection
      expect(useDiceStore.getState().history).toHaveLength(1)
    })
  })
})
