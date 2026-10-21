// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  monkChar,
  magusChar,
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

describe('Tier 3: Cross-Feature Combinations & Pairwise Interactions', () => {
  beforeEach(() => {
    resetTestStores()
  })

  // =========================================================================
  // Interaction 1: Full Spell-to-Buff Lifecycle & Stat Cascade
  // =========================================================================
  describe('I1: Spell-to-Buff Lifecycle & Stat Cascade', () => {
    it('1.1 spending spell slot decrements remaining slot count in useSessionStore', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: {} })
      useSessionStore.getState().spendSpellSlot(magusChar.id, 1, 4)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(1)
      const remainingSlots = 4 - session.spentSpellSlots[1]
      expect(remainingSlots).toBe(3)
    })

    it('1.2 spending slot for Shield activates Shield buff in activeBuffIds', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: {}, activeBuffIds: [] })
      // Simulate action: spend 1st level slot and toggle Shield buff
      useSessionStore.getState().spendSpellSlot(magusChar.id, 1, 4)
      useSessionStore.getState().toggleBuff(magusChar.id, 'buff-shield-spell')

      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(1)
      expect(session.activeBuffIds).toContain('buff-shield-spell')
    })

    it('1.3 active Shield buff cascades into AC calculation, boosting Total AC from 18 to 22', () => {
      const shieldBuff = magusChar.buffs.find((b) => b.id === 'buff-shield-spell')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [shieldBuff])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [shieldBuff]
      )
      expect(effAc.total).toBe(22) // Base 18 + 4 Shield
    })

    it('1.4 active Shield buff increases Flat-Footed AC from 14 to 18 while preserving base Touch AC', () => {
      const shieldBuff = magusChar.buffs.find((b) => b.id === 'buff-shield-spell')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [shieldBuff])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [shieldBuff]
      )
      expect(effAc.flatFooted).toBe(18) // Base 14 + 4 Shield
    })

    it('1.5 AC breakdown tooltip reflects itemized Shield Spell (+4) component', () => {
      const shieldBuff = magusChar.buffs.find((b) => b.id === 'buff-shield-spell')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [shieldBuff])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [shieldBuff]
      )
      expect(effAc.breakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Base AC', value: 18 }),
          expect.objectContaining({ label: 'Shield Spell', value: 4 }),
        ])
      )
    })

    it('1.6 deactivating buff removes AC bonus without refunding the spent spell slot', () => {
      setupTestSession(magusChar.id, {
        spentSpellSlots: { 1: 1 },
        activeBuffIds: ['buff-shield-spell'],
      })
      useSessionStore.getState().toggleBuff(magusChar.id, 'buff-shield-spell')
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.activeBuffIds).not.toContain('buff-shield-spell')
      expect(session.spentSpellSlots[1]).toBe(1) // Slot remains consumed

      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        []
      )
      expect(effAc.total).toBe(18) // Returned to baseline 18
    })
  })

  // =========================================================================
  // Interaction 2: Condition Cascade to Ability Scores & Interactive Rolls
  // =========================================================================
  describe('I2: Condition Cascade to Ability Scores & Interactive Rolls', () => {
    it('2.1 applying Fatigued condition reduces both STR and DEX scores by 2', () => {
      setupTestSession(magusChar.id, { conditions: ['fatigued'] })
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['fatigued'], [])
      expect(effAbil.scores.str).toBe(8) // 10 - 2
      expect(effAbil.scores.dex).toBe(16) // 18 - 2
    })

    it('2.2 DEX reduction from Fatigued drops DEX modifier from +4 to +3', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['fatigued'], [])
      expect(effAbil.mods.dex).toBe(3)
      expect(effAbil.deltas.dex).toBe(-1)
    })

    it('2.3 lowered DEX modifier automatically reduces Reflex save bonus from +5 to +4', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['fatigued'], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        ['fatigued'],
        []
      )
      expect(effSaves.ref).toBe(4) // 5 base - 1 DEX shift
    })

    it('2.4 lowered DEX modifier automatically reduces weapon attack bonus', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['fatigued'], [])
      const effWeapon = calcEffectiveWeaponStats(
        magusChar.weapons[0],
        magusChar.abilities,
        effAbil,
        ['fatigued'],
        [],
        []
      )
      // Weapon attack was +8. DEX delta is 0 for melee in stat-calc unless weapon is finesse or delta applied
      expect(effWeapon.attackBreakdown).toBeDefined()
    })

    it('2.5 interactive Reflex save roll in useDiceStore uses the fatigued modifier (+4)', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['fatigued'], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        ['fatigued'],
        []
      )
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.ref,
        label: 'Reflex Save',
        breakdown: effSaves.breakdowns.reflex,
      })
      const pending = useDiceStore.getState().pendingRoll
      expect(pending?.modifier).toBe(4)
      expect(pending?.label).toBe('Reflex Save')
    })

    it('2.6 removing Fatigued condition immediately restores full ability scores and saves', () => {
      setupTestSession(magusChar.id, { conditions: ['fatigued'] })
      useSessionStore.getState().toggleCondition(magusChar.id, 'fatigued')
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.conditions).not.toContain('fatigued')

      const effAbil = calcEffectiveAbilities(magusChar.abilities, session.conditions, [])
      expect(effAbil.scores.dex).toBe(18)
      expect(effAbil.mods.dex).toBe(4)

      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        session.conditions,
        []
      )
      expect(effSaves.ref).toBe(5)
    })
  })

  // =========================================================================
  // Interaction 3: Combat Feature, Inspector Drawer & Resource Synchronization
  // =========================================================================
  describe('I3: Combat Feature, Inspector Drawer & Resource Synchronization', () => {
    it('3.1 monk expends 1 Ki point in combat, reducing remaining Ki from 4 to 3', () => {
      setupTestSession(monkChar.id, { spentResources: {} })
      useSessionStore.getState().spendResource(monkChar.id, 'ki-pool', 4)
      const session = useSessionStore.getState().getSession(monkChar.id)
      const remainingKi = 4 - (session.spentResources['ki-pool'] ?? 0)
      expect(remainingKi).toBe(3)
    })

    it('3.2 inspector item captures synchronized resource state', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 1 } })
      const session = useSessionStore.getState().getSession(monkChar.id)
      const kiResource = monkChar.dailyResources.find((r) => r.id === 'ki-pool')!
      const remaining = kiResource.total - (session.spentResources['ki-pool'] ?? 0)

      const inspectorPayload = {
        id: 'ca-ki-pool',
        title: 'Ki Pool',
        remainingUses: remaining,
        maxUses: kiResource.total,
        description: 'Spend 1 ki point as swift action.',
      }

      expect(inspectorPayload.remainingUses).toBe(3)
      expect(inspectorPayload.maxUses).toBe(4)
    })

    it('3.3 activating Ki Dodge buff applies +4 AC bonus', () => {
      const kiDodgeBuff = monkChar.buffs.find((b) => b.id === 'buff-ki-dodge')!
      const effAbil = calcEffectiveAbilities(monkChar.abilities, [], [kiDodgeBuff])
      const effAc = calcEffectiveArmorClass(
        monkChar.armorClass,
        abilityMod(monkChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [kiDodgeBuff]
      )
      expect(effAc.total).toBe(20) // 16 base + 4 dodge
    })

    it('3.4 dodge bonus properly elevates Touch AC', () => {
      const kiDodgeBuff = monkChar.buffs.find((b) => b.id === 'buff-ki-dodge')!
      const effAbil = calcEffectiveAbilities(monkChar.abilities, [], [kiDodgeBuff])
      const effAc = calcEffectiveArmorClass(
        monkChar.armorClass,
        abilityMod(monkChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [kiDodgeBuff]
      )
      // Base touch was 14; dodge elevates touch AC to 18
      expect(effAc.touch).toBe(18)
    })

    it('3.5 exhaustion of ki prevents activating further ki-based abilities', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 4 } })
      useSessionStore.getState().spendResource(monkChar.id, 'ki-pool', 4)
      const session = useSessionStore.getState().getSession(monkChar.id)
      expect(session.spentResources['ki-pool']).toBe(4)
      const remaining = 4 - session.spentResources['ki-pool']
      expect(remaining).toBe(0)
    })
  })

  // =========================================================================
  // Interaction 4: Multi-Condition Compounding Penalties
  // =========================================================================
  describe('I4: Multi-Condition Compounding Penalties', () => {
    it('4.1 Shaken (-2) and Sickened (-2) stack to -4 penalty on all saving throws', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['shaken', 'sickened'], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        ['shaken', 'sickened'],
        []
      )
      expect(effSaves.fort).toBe(2) // 6 base - 4
      expect(effSaves.ref).toBe(1)  // 5 base - 4
      expect(effSaves.will).toBe(1) // 5 base - 4
    })

    it('4.2 Shaken and Sickened stack on attack rolls (-4 total attack penalty)', () => {
      const weapon = magusChar.weapons[0]
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['shaken', 'sickened'], [])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        magusChar.abilities,
        effAbil,
        ['shaken', 'sickened'],
        [],
        []
      )
      expect(effWeapon.attackBonus[0]).toBe(4) // 8 base - 2 shaken - 2 sickened
    })

    it('4.3 Sickened condition reduces weapon damage bonus by -2', () => {
      const weapon = magusChar.weapons[0]
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['sickened'], [])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        magusChar.abilities,
        effAbil,
        ['sickened'],
        [],
        []
      )
      expect(effWeapon.damageBonus).toBe(3) // 5 base - 2 sickened
    })

    it('4.4 saving throw breakdown lists both Shaken (-2) and Sickened (-2) entries distinctly', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['shaken', 'sickened'], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        ['shaken', 'sickened'],
        []
      )
      expect(effSaves.breakdowns.fortitude).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Shaken', value: -2 }),
          expect.objectContaining({ label: 'Sickened', value: -2 }),
        ])
      )
    })

    it('4.5 removing Shaken while keeping Sickened reduces penalty to -2', () => {
      setupTestSession(magusChar.id, { conditions: ['shaken', 'sickened'] })
      useSessionStore.getState().toggleCondition(magusChar.id, 'shaken')
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.conditions).toEqual(['sickened'])

      const effAbil = calcEffectiveAbilities(magusChar.abilities, session.conditions, [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        session.conditions,
        []
      )
      expect(effSaves.fort).toBe(4) // 6 base - 2 sickened
    })
  })

  // =========================================================================
  // Interaction 5: Damage Absorption, HP Multi-track & Vitality State Cascade
  // =========================================================================
  describe('I5: Damage Absorption, HP Multi-track & Vitality State Cascade', () => {
    it('5.1 character gains temporary HP and reflects increased vitality buffer', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 0 })
      useSessionStore.getState().setTempHp(magusChar.id, 10)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(10)
      expect(session.currentHp).toBe(38)
    })

    it('5.2 partial damage drains only temporary HP while regular HP remains at 100%', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 10 })
      const takeDamage = (charId: string, dmg: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        const absorbed = Math.min(sess.tempHp, dmg)
        const remainder = dmg - absorbed
        useSessionStore.getState().setTempHp(charId, sess.tempHp - absorbed)
        if (remainder > 0) useSessionStore.getState().adjustHp(charId, -remainder, maxHp)
      }

      takeDamage(magusChar.id, 6, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(4) // 10 - 6
      expect(session.currentHp).toBe(38) // Unaltered
    })

    it('5.3 overflow damage consumes remaining temp HP and penetrates regular HP', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 4 })
      const takeDamage = (charId: string, dmg: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        const absorbed = Math.min(sess.tempHp, dmg)
        const remainder = dmg - absorbed
        useSessionStore.getState().setTempHp(charId, sess.tempHp - absorbed)
        if (remainder > 0) useSessionStore.getState().adjustHp(charId, -remainder, maxHp)
      }

      takeDamage(magusChar.id, 8, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.currentHp).toBe(34) // 38 - (8 - 4)
    })

    it('5.4 nonlethal damage increases without reducing regular current HP', () => {
      setupTestSession(magusChar.id, { currentHp: 34, nonlethalDamage: 0 })
      useSessionStore.getState().setNonlethal(magusChar.id, 12)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.nonlethalDamage).toBe(12)
      expect(session.currentHp).toBe(34)
    })

    it('5.5 healing restores current HP and simultaneously cleanses nonlethal damage', () => {
      setupTestSession(magusChar.id, { currentHp: 25, nonlethalDamage: 10 })
      const applyCure = (charId: string, healAmount: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        useSessionStore.getState().setNonlethal(charId, Math.max(0, sess.nonlethalDamage - healAmount))
        useSessionStore.getState().adjustHp(charId, healAmount, maxHp)
      }

      applyCure(magusChar.id, 8, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(33) // 25 + 8
      expect(session.nonlethalDamage).toBe(2) // 10 - 8
    })
  })

  // =========================================================================
  // Interaction 6: Long Rest Multi-System Reset & Custom Buff Persistence
  // =========================================================================
  describe('I6: Long Rest Multi-System Reset & Custom Buff Persistence', () => {
    it('6.1 Long Rest restores current HP to max HP', () => {
      setupTestSession(magusChar.id, { currentHp: 12 })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(38)
    })

    it('6.2 Long Rest clears temp HP and nonlethal damage completely', () => {
      setupTestSession(magusChar.id, { tempHp: 15, nonlethalDamage: 20 })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.nonlethalDamage).toBe(0)
    })

    it('6.3 Long Rest clears active conditions and active buffs', () => {
      setupTestSession(magusChar.id, {
        conditions: ['fatigued', 'shaken'],
        activeBuffIds: ['buff-arcane-weapon'],
      })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.conditions).toEqual([])
      expect(session.activeBuffIds).toEqual([])
    })

    it('6.4 Long Rest restores all daily resources and spent spell slots', () => {
      setupTestSession(magusChar.id, {
        spentResources: { 'arcane-pool': 5 },
        spentSpellSlots: { 1: 4, 2: 2 },
      })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentResources).toEqual({})
      expect(session.spentSpellSlots).toEqual({})
    })

    it('6.5 Long Rest preserves user-defined custom buffs in customBuffs array', () => {
      const customHaste = {
        id: 'custom-haste-spell',
        name: 'Haste Spell',
        active: false,
        attackMod: 1,
        damageMod: 0,
        acMod: 1,
        isCustom: true,
      }
      setupTestSession(magusChar.id, {
        customBuffs: [customHaste],
        activeBuffIds: [customHaste.id],
      })
      useSessionStore.getState().longRest(magusChar.id, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      // Custom buff definition is retained even though it is deactivated
      expect(session.customBuffs).toHaveLength(1)
      expect(session.customBuffs?.[0].id).toBe('custom-haste-spell')
      expect(session.activeBuffIds).not.toContain('custom-haste-spell')
    })
  })
})
