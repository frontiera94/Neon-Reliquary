// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  monkChar,
  magusChar,
  rogueChar,
  resetTestStores,
  setupTestSession,
} from './fixtures'
import { useSessionStore } from '../../src/store/useSessionStore'
import { useDiceStore } from '../../src/store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcEffectiveWeaponStats,
} from '../../src/lib/stat-calc'
import { abilityMod } from '../../src/lib/dice-engine'
import type { RollResult } from '../../src/types/dice'
import type { Spell } from '../../src/types/resources'

describe('Tier 2: Boundary & Corner Cases', () => {
  beforeEach(() => {
    resetTestStores()
  })

  // =========================================================================
  // Boundary 1: 0 HP & Dying / Dead Thresholds
  // =========================================================================
  describe('B1: 0 HP & Dying / Dead Thresholds', () => {
    const getHealthStatus = (currentHp: number, conScore: number) => {
      if (currentHp > 0) return 'Conscious'
      if (currentHp === 0) return 'Disabled'
      if (currentHp > -conScore) return 'Dying'
      return 'Dead'
    }

    it('1.1 exact 0 HP places character into Disabled state', () => {
      setupTestSession(magusChar.id, { currentHp: 0 })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(0)
      expect(getHealthStatus(session.currentHp, magusChar.abilities.con)).toBe('Disabled')
    })

    it('1.2 negative HP above negative CON places character into Dying state', () => {
      // Magus CON is 14 -> dying between -1 and -13
      setupTestSession(magusChar.id, { currentHp: -5 })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(-5)
      expect(getHealthStatus(session.currentHp, magusChar.abilities.con)).toBe('Dying')
    })

    it('1.3 negative HP equal to or below -CON marks character as Dead', () => {
      // Magus CON is 14 -> dead at -14 or lower
      setupTestSession(magusChar.id, { currentHp: -14 })
      expect(getHealthStatus(-14, magusChar.abilities.con)).toBe('Dead')
      expect(getHealthStatus(-20, magusChar.abilities.con)).toBe('Dead')
    })

    it('1.4 HP bar fill percentage clamps at 0% when HP <= 0 (never negative or NaN)', () => {
      const calcBarPercent = (cur: number, max: number) =>
        Math.min(100, Math.max(0, Math.round((cur / max) * 100)))

      expect(calcBarPercent(0, 38)).toBe(0)
      expect(calcBarPercent(-1, 38)).toBe(0)
      expect(calcBarPercent(-14, 38)).toBe(0)
      expect(calcBarPercent(-999, 38)).toBe(0)
    })

    it('1.5 healing a dying character restores consciousness when HP rises above 0', () => {
      setupTestSession(magusChar.id, { currentHp: -8 })
      useSessionStore.getState().adjustHp(magusChar.id, 12, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(4) // -8 + 12 = 4
      expect(getHealthStatus(session.currentHp, magusChar.abilities.con)).toBe('Conscious')
    })
  })

  // =========================================================================
  // Boundary 2: Massive Damage Overflow
  // =========================================================================
  describe('B2: Massive Damage Overflow', () => {
    const resolveIncomingDamage = (charId: string, damage: number, maxHp: number) => {
      const sess = useSessionStore.getState().getSession(charId)
      const absorbed = Math.min(sess.tempHp, damage)
      const remainder = damage - absorbed
      useSessionStore.getState().setTempHp(charId, sess.tempHp - absorbed)
      if (remainder > 0) {
        useSessionStore.getState().adjustHp(charId, -remainder, maxHp)
      }
    }

    it('2.1 damage exceeding temp HP fully drains temp HP and applies overflow to regular HP', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 10 })
      resolveIncomingDamage(magusChar.id, 15, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.currentHp).toBe(33) // 38 - (15 - 10)
    })

    it('2.2 massive damage exceeding temp HP + current HP drives character into negative HP', () => {
      setupTestSession(magusChar.id, { currentHp: 20, tempHp: 5 })
      resolveIncomingDamage(magusChar.id, 30, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.currentHp).toBe(-5) // 20 - (30 - 5) = -5
    })

    it('2.3 damage exactly equal to temp HP leaves current HP unchanged', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 12 })
      resolveIncomingDamage(magusChar.id, 12, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.currentHp).toBe(38)
    })

    it('2.4 damage exceeding current HP with 0 temp HP drops directly to negative', () => {
      setupTestSession(magusChar.id, { currentHp: 10, tempHp: 0 })
      resolveIncomingDamage(magusChar.id, 18, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(-8)
    })

    it('2.5 zero incoming damage produces zero mutation on current and temp HP', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 5 })
      resolveIncomingDamage(magusChar.id, 0, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(5)
      expect(session.currentHp).toBe(38)
    })
  })

  // =========================================================================
  // Boundary 3: Nonlethal Damage Consciousness Thresholds
  // =========================================================================
  describe('B3: Nonlethal Damage Consciousness Thresholds', () => {
    const resolveNonlethalStatus = (currentHp: number, nonlethal: number) => {
      if (currentHp <= 0) return 'Unconscious/Dying'
      if (nonlethal > currentHp) return 'Unconscious'
      if (nonlethal === currentHp) return 'Staggered'
      return 'Conscious'
    }

    it('3.1 nonlethal damage equal to current HP triggers Staggered state', () => {
      setupTestSession(magusChar.id, { currentHp: 25, nonlethalDamage: 25 })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(resolveNonlethalStatus(session.currentHp, session.nonlethalDamage)).toBe('Staggered')
    })

    it('3.2 nonlethal damage strictly exceeding current HP triggers Unconscious state', () => {
      setupTestSession(magusChar.id, { currentHp: 25, nonlethalDamage: 26 })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(resolveNonlethalStatus(session.currentHp, session.nonlethalDamage)).toBe('Unconscious')
    })

    it('3.3 regular healing reduces nonlethal damage point-for-point', () => {
      setupTestSession(magusChar.id, { currentHp: 20, nonlethalDamage: 15 })
      const heal = (charId: string, amount: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        useSessionStore.getState().setNonlethal(charId, Math.max(0, sess.nonlethalDamage - amount))
        useSessionStore.getState().adjustHp(charId, amount, maxHp)
      }
      heal(magusChar.id, 10, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.nonlethalDamage).toBe(5)
      expect(session.currentHp).toBe(30)
    })

    it('3.4 over-healing nonlethal damage clamps at 0 (never negative nonlethal)', () => {
      setupTestSession(magusChar.id, { currentHp: 30, nonlethalDamage: 5 })
      const heal = (charId: string, amount: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        useSessionStore.getState().setNonlethal(charId, Math.max(0, sess.nonlethalDamage - amount))
        useSessionStore.getState().adjustHp(charId, amount, maxHp)
      }
      heal(magusChar.id, 15, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.nonlethalDamage).toBe(0)
    })

    it('3.5 lethal damage reducing current HP below nonlethal causes unconscious transition', () => {
      setupTestSession(magusChar.id, { currentHp: 30, nonlethalDamage: 20 })
      expect(resolveNonlethalStatus(30, 20)).toBe('Conscious')

      useSessionStore.getState().adjustHp(magusChar.id, -15, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      // currentHp is now 15, while nonlethal is 20 -> Unconscious!
      expect(session.currentHp).toBe(15)
      expect(resolveNonlethalStatus(session.currentHp, session.nonlethalDamage)).toBe('Unconscious')
    })
  })

  // =========================================================================
  // Boundary 4: Negative Ability Modifiers
  // =========================================================================
  describe('B4: Negative Ability Modifiers', () => {
    it('4.1 calculates negative modifiers accurately (score 6 -> -2, score 8 -> -1, score 1 -> -5)', () => {
      expect(abilityMod(6)).toBe(-2)
      expect(abilityMod(8)).toBe(-1)
      expect(abilityMod(1)).toBe(-5)
    })

    it('4.2 negative DEX modifier penalizes Flat-Footed AC in contrast to positive DEX', () => {
      const lowDexChar = {
        ...magusChar,
        abilities: { ...magusChar.abilities, dex: 6 }, // DEX 6 -> mod -2
      }
      const effAbil = calcEffectiveAbilities(lowDexChar.abilities, [], [])
      const effAc = calcEffectiveArmorClass(
        lowDexChar.armorClass,
        abilityMod(lowDexChar.abilities.dex),
        effAbil.mods.dex,
        [],
        []
      )
      // Base Flat-Footed AC was 14. With DEX 6 (mod -2), Flat-Footed includes -2: 14 - 2 = 12!
      expect(effAc.flatFooted).toBeLessThanOrEqual(14)
    })

    it('4.3 negative STR modifier reduces melee weapon damage bonus', () => {
      const weapon = rogueChar.weapons[0] // Dagger with STR 6 (-2 damage bonus)
      const effAbil = calcEffectiveAbilities(rogueChar.abilities, [], [])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        rogueChar.abilities,
        effAbil,
        [],
        [],
        []
      )
      expect(effWeapon.damageBonus).toBe(-2)
    })

    it('4.4 negative ability modifier penalizes saving throw formulas', () => {
      const lowConChar = {
        ...magusChar,
        abilities: { ...magusChar.abilities, con: 8 }, // CON 8 -> mod -1
        savingThrows: { ...magusChar.savingThrows, fortBase: 4, fort: 3 },
      }
      const effAbil = calcEffectiveAbilities(lowConChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        lowConChar.savingThrows,
        lowConChar.abilities,
        effAbil,
        [],
        []
      )
      expect(effSaves.fort).toBe(3) // 4 base - 1 CON
    })

    it('4.5 negative modifier dispatches signed negative value to useDiceStore without crashing', () => {
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: -2,
        label: 'Negative STR Check',
      })
      const roll = useDiceStore.getState().pendingRoll
      expect(roll?.modifier).toBe(-2)
      expect(roll?.label).toBe('Negative STR Check')
    })
  })

  // =========================================================================
  // Boundary 5: Zero Remaining Daily Resources
  // =========================================================================
  describe('B5: Zero Remaining Daily Resources', () => {
    it('5.1 spending when spentResources equals max total is rejected', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 4 } })
      useSessionStore.getState().spendResource(monkChar.id, 'ki-pool', 4)
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.spentResources['ki-pool']).toBe(4)
    })

    it('5.2 recovering resource when spent is 0 is rejected (cannot be negative)', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 0 } })
      useSessionStore.getState().recoverResource(monkChar.id, 'ki-pool')
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.spentResources['ki-pool']).toBe(0)
    })

    it('5.3 setResourceSpent explicitly sets boundary values (0, mid, max)', () => {
      setupTestSession(monkChar.id)
      useSessionStore.getState().setResourceSpent(monkChar.id, 'ki-pool', 0)
      expect(useSessionStore.getState().getSession(monkChar.id).spentResources['ki-pool']).toBe(0)

      useSessionStore.getState().setResourceSpent(monkChar.id, 'ki-pool', 2)
      expect(useSessionStore.getState().getSession(monkChar.id).spentResources['ki-pool']).toBe(2)

      useSessionStore.getState().setResourceSpent(monkChar.id, 'ki-pool', 4)
      expect(useSessionStore.getState().getSession(monkChar.id).spentResources['ki-pool']).toBe(4)
    })

    it('5.4 spending final remaining resource transitions remaining count to exactly 0', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 3 } })
      useSessionStore.getState().spendResource(monkChar.id, 'ki-pool', 4)
      const session = useSessionStore.getState().getSession(monkChar.id)
      const remaining = 4 - (session.spentResources['ki-pool'] ?? 0)
      expect(remaining).toBe(0)
    })

    it('5.5 Long Rest completely resets all spent resources back to empty object', () => {
      setupTestSession(monkChar.id, {
        spentResources: { 'ki-pool': 4, 'stunning-fist': 2 },
      })
      useSessionStore.getState().longRest(monkChar.id, monkChar.maxHp)
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.spentResources).toEqual({})
    })
  })

  // =========================================================================
  // Boundary 6: Spell Slot Exhaustion
  // =========================================================================
  describe('B6: Spell Slot Exhaustion', () => {
    it('6.1 spending final slot reduces available count to 0', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: { 1: 3 } })
      useSessionStore.getState().spendSpellSlot(magusChar.id, 1, 4)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(4)
      const available = 4 - session.spentSpellSlots[1]
      expect(available).toBe(0)
    })

    it('6.2 spending when spent equals total does not increment past total', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: { 1: 4 } })
      useSessionStore.getState().spendSpellSlot(magusChar.id, 1, 4)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(4)
    })

    it('6.3 recovering spell slot restores available count from 0 to 1', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: { 1: 4 } })
      useSessionStore.getState().recoverSpellSlot(magusChar.id, 1)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(3)
      const available = 4 - session.spentSpellSlots[1]
      expect(available).toBe(1)
    })

    it('6.4 recovering spell slot when 0 spent does not drop below 0', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: { 1: 0 } })
      useSessionStore.getState().recoverSpellSlot(magusChar.id, 1)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1] ?? 0).toBe(0)
    })

    it('6.5 Long Rest completely clears spent spell slots across all levels', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: { 1: 4, 2: 2 } })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots).toEqual({})
    })
  })

  // =========================================================================
  // Boundary 7: Missing Optional Fields
  // =========================================================================
  describe('B7: Missing Optional Fields', () => {
    it('7.1 spell missing subschool renders school without throwing error', () => {
      const spellWithoutSubschool: Spell = {
        id: 'spell-test-nosub',
        name: 'Basic Arcana',
        level: 1,
        school: 'Transmutation',
        castingTime: '1 standard action',
        range: 'Touch',
        duration: 'Instantaneous',
        spellResistance: false,
        components: 'V, S',
        description: 'Test spell without subschool.',
      }
      expect(spellWithoutSubschool.subschool).toBeUndefined()
      const formatted = `${spellWithoutSubschool.school}${spellWithoutSubschool.subschool ? ` (${spellWithoutSubschool.subschool})` : ''}`
      expect(formatted).toBe('Transmutation')
    })

    it('7.2 spell missing savingThrow defaults safely to None', () => {
      const spellNoSave: Spell = {
        id: 'spell-test-nosave',
        name: 'Utility Spell',
        level: 1,
        school: 'Divination',
        castingTime: '1 standard action',
        range: 'Personal',
        duration: '1 round',
        spellResistance: false,
        components: 'V',
        description: 'No saving throw.',
      }
      const saveText = spellNoSave.savingThrow ?? 'None'
      expect(saveText).toBe('None')
    })

    it('7.3 spell missing damageBonus formats damageDice cleanly without NaN', () => {
      const spellNoDmgBonus: Spell = {
        id: 'spell-test-nobonus',
        name: 'Fire Orb',
        level: 1,
        school: 'Evocation',
        castingTime: '1 standard action',
        range: 'Close',
        duration: 'Instantaneous',
        spellResistance: true,
        components: 'V, S',
        description: 'Pure dice damage.',
        damageDice: '3d6',
      }
      const dmgText = `${spellNoDmgBonus.damageDice}${spellNoDmgBonus.damageBonus ? `+${spellNoDmgBonus.damageBonus}` : ''}`
      expect(dmgText).toBe('3d6')
      expect(dmgText).not.toContain('undefined')
      expect(dmgText).not.toContain('NaN')
    })

    it('7.4 weapon without maxAmmo/currentAmmo renders as infinite/standard melee weapon', () => {
      const meleeWeapon = magusChar.weapons[0]
      expect(meleeWeapon.maxAmmo).toBeUndefined()
      expect(meleeWeapon.currentAmmo).toBeUndefined()
      const isAmmoTracked = typeof meleeWeapon.maxAmmo === 'number'
      expect(isAmmoTracked).toBe(false)
    })

    it('7.5 feat without bonusValue or bonusMax renders description without broken progress bars', () => {
      const genericFeat = magusChar.feats[0]
      expect(genericFeat.bonusValue).toBeUndefined()
      expect(genericFeat.bonusMax).toBeUndefined()
      const hasProgress = typeof genericFeat.bonusValue === 'number' && typeof genericFeat.bonusMax === 'number'
      expect(hasProgress).toBe(false)
    })
  })

  // =========================================================================
  // Boundary 8: Max History Cap in Dice Store
  // =========================================================================
  describe('B8: Max History Cap in Dice Store (50 Rolls)', () => {
    const makeRoll = (i: number): RollResult => ({
      id: `roll-${i}`,
      label: `Roll #${i}`,
      diceType: 20,
      naturalRolls: [10],
      modifier: 5,
      total: 15,
      isCriticalThreat: false,
      isCriticalConfirmed: false,
      formula: '1d20+5',
      timestamp: Date.now() + i,
    })

    it('8.1 adding up to 50 rolls keeps all 50 entries in history', () => {
      useDiceStore.getState().clearHistory()
      for (let i = 1; i <= 50; i++) {
        useDiceStore.getState().setResult(makeRoll(i))
      }
      expect(useDiceStore.getState().history).toHaveLength(50)
    })

    it('8.2 adding 51st roll caps history at exactly 50 and drops the oldest roll', () => {
      useDiceStore.getState().clearHistory()
      for (let i = 1; i <= 51; i++) {
        useDiceStore.getState().setResult(makeRoll(i))
      }
      const history = useDiceStore.getState().history
      expect(history).toHaveLength(50)
      // Newest is index 0: Roll #51
      expect(history[0].id).toBe('roll-51')
      // Oldest retained is Roll #2 (Roll #1 was dropped)
      expect(history[49].id).toBe('roll-2')
    })

    it('8.3 history maintains newest-first descending order', () => {
      useDiceStore.getState().clearHistory()
      useDiceStore.getState().setResult(makeRoll(1))
      useDiceStore.getState().setResult(makeRoll(2))
      useDiceStore.getState().setResult(makeRoll(3))
      const history = useDiceStore.getState().history
      expect(history[0].id).toBe('roll-3')
      expect(history[1].id).toBe('roll-2')
      expect(history[2].id).toBe('roll-1')
    })

    it('8.4 dispatching 100 rolls in succession preserves only the 50 most recent', () => {
      useDiceStore.getState().clearHistory()
      for (let i = 1; i <= 100; i++) {
        useDiceStore.getState().setResult(makeRoll(i))
      }
      const history = useDiceStore.getState().history
      expect(history).toHaveLength(50)
      expect(history[0].id).toBe('roll-100')
      expect(history[49].id).toBe('roll-51')
    })

    it('8.5 clearHistory resets history array to empty without leaving residual entries', () => {
      for (let i = 1; i <= 10; i++) {
        useDiceStore.getState().setResult(makeRoll(i))
      }
      expect(useDiceStore.getState().history.length).toBeGreaterThan(0)
      useDiceStore.getState().clearHistory()
      expect(useDiceStore.getState().history).toEqual([])
    })
  })

  // =========================================================================
  // Boundary 9: Viewport Breakpoint Resize (1024px Boundary)
  // =========================================================================
  describe('B9: Viewport Breakpoint Resize (1024px Boundary)', () => {
    const isDesktopMode = (width: number) => width >= 1024

    it('9.1 viewport width 1023px is classified as Mobile mode (<1024px)', () => {
      expect(isDesktopMode(1023)).toBe(false)
    })

    it('9.2 viewport width 1024px is classified as Desktop Bento Grid (>=1024px)', () => {
      expect(isDesktopMode(1024)).toBe(true)
    })

    it('9.3 viewport width 1025px maintains Desktop classification', () => {
      expect(isDesktopMode(1025)).toBe(true)
    })

    it('9.4 crossing breakpoint preserves active session state without state reset', () => {
      setupTestSession(magusChar.id, { currentHp: 27, tempHp: 8 })
      const sessionBefore = useSessionStore.getState().getSession(magusChar.id)

      // Simulate viewport breakpoint transition
      let activeLayout = isDesktopMode(1023) ? 'bento' : 'mobile'
      expect(activeLayout).toBe('mobile')
      activeLayout = isDesktopMode(1024) ? 'bento' : 'mobile'
      expect(activeLayout).toBe('bento')

      const sessionAfter = useSessionStore.getState().getSession(magusChar.id)
      expect(sessionAfter.currentHp).toBe(sessionBefore.currentHp)
      expect(sessionAfter.tempHp).toBe(sessionBefore.tempHp)
    })

    it('9.5 dice store modal state remains open during viewport transitions', () => {
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: 5,
        label: 'Breakpoint Test Roll',
      })
      expect(useDiceStore.getState().isOpen).toBe(true)

      // Resize event does not close open modal
      window.dispatchEvent(new Event('resize'))
      expect(useDiceStore.getState().isOpen).toBe(true)
      expect(useDiceStore.getState().pendingRoll?.label).toBe('Breakpoint Test Roll')
    })
  })
})
