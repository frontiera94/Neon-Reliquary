import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore, normalizePersistedSession } from './useSessionStore'

// Helper: reset to a clean slate before every test
function resetStore() {
  localStorage.clear()
  useSessionStore.setState({ sessions: {} })
}

const CHAR = 'char-1'
const MAX_HP = 30

// ─── initSession ─────────────────────────────────────────────────────────────

describe('initSession', () => {
  beforeEach(resetStore)

  it('creates a session with full HP', () => {
    useSessionStore.getState().initSession(CHAR, MAX_HP)
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.currentHp).toBe(MAX_HP)
    expect(sess.characterId).toBe(CHAR)
  })

  it('is a no-op if session already exists', () => {
    useSessionStore.getState().initSession(CHAR, MAX_HP)
    useSessionStore.getState().setHp(CHAR, 10)
    useSessionStore.getState().initSession(CHAR, MAX_HP) // should not reset
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(10)
  })

  it('initializes session with startingCoins when provided', () => {
    useSessionStore.getState().initSession(CHAR, MAX_HP, { gp: 50, sp: 20, cp: 10 })
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.coins).toEqual({ gp: 50, sp: 20, cp: 10 })
  })

  it('getSession returns defaultSession when session is not initialized', () => {
    const sess = useSessionStore.getState().getSession('uninitialized-char')
    expect(sess.characterId).toBe('uninitialized-char')
    expect(sess.currentHp).toBe(0)
    expect(sess.coins).toEqual({ gp: 0, sp: 0, cp: 0 })
    expect(sess.activeBuffIds).toEqual([])
  })
})

// ─── HP ──────────────────────────────────────────────────────────────────────

describe('HP management', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('setHp sets HP directly', () => {
    useSessionStore.getState().setHp(CHAR, 15)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(15)
  })

  it('adjustHp increases HP up to maxHp', () => {
    useSessionStore.getState().setHp(CHAR, 20)
    useSessionStore.getState().adjustHp(CHAR, 20, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(MAX_HP)
  })

  it('adjustHp decreases HP', () => {
    useSessionStore.getState().adjustHp(CHAR, -10, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(20)
  })

  it('adjustHp does not clamp below 0 (store allows negative for dying states)', () => {
    useSessionStore.getState().adjustHp(CHAR, -100, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(-70)
  })

  it('setTempHp sets temp HP', () => {
    useSessionStore.getState().setTempHp(CHAR, 8)
    expect(useSessionStore.getState().getSession(CHAR).tempHp).toBe(8)
  })

  it('setNonlethal sets nonlethal damage', () => {
    useSessionStore.getState().setNonlethal(CHAR, 5)
    expect(useSessionStore.getState().getSession(CHAR).nonlethalDamage).toBe(5)
  })
})

// ─── Resources ───────────────────────────────────────────────────────────────

describe('resource tracking', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('spendResource increments spent count', () => {
    useSessionStore.getState().spendResource(CHAR, 'rage', 3)
    expect(useSessionStore.getState().getSession(CHAR).spentResources['rage']).toBe(1)
  })

  it('spendResource does not exceed max', () => {
    useSessionStore.getState().spendResource(CHAR, 'rage', 2)
    useSessionStore.getState().spendResource(CHAR, 'rage', 2)
    useSessionStore.getState().spendResource(CHAR, 'rage', 2) // should be ignored
    expect(useSessionStore.getState().getSession(CHAR).spentResources['rage']).toBe(2)
  })

  it('recoverResource decrements spent count', () => {
    useSessionStore.getState().spendResource(CHAR, 'rage', 3)
    useSessionStore.getState().spendResource(CHAR, 'rage', 3)
    useSessionStore.getState().recoverResource(CHAR, 'rage')
    expect(useSessionStore.getState().getSession(CHAR).spentResources['rage']).toBe(1)
  })

  it('recoverResource does not go below 0', () => {
    useSessionStore.getState().recoverResource(CHAR, 'rage')
    expect(useSessionStore.getState().getSession(CHAR).spentResources['rage'] ?? 0).toBe(0)
  })

  it('setResourceSpent sets an arbitrary value', () => {
    useSessionStore.getState().setResourceSpent(CHAR, 'ki', 5)
    expect(useSessionStore.getState().getSession(CHAR).spentResources['ki']).toBe(5)
  })
})

// ─── Buffs ───────────────────────────────────────────────────────────────────

describe('buff toggling', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('toggleBuff adds a buff id when inactive', () => {
    useSessionStore.getState().toggleBuff(CHAR, 'haste')
    expect(useSessionStore.getState().getSession(CHAR).activeBuffIds).toContain('haste')
  })

  it('toggleBuff removes a buff id when active', () => {
    useSessionStore.getState().toggleBuff(CHAR, 'haste')
    useSessionStore.getState().toggleBuff(CHAR, 'haste')
    expect(useSessionStore.getState().getSession(CHAR).activeBuffIds).not.toContain('haste')
  })

  it('multiple buffs can be active simultaneously', () => {
    useSessionStore.getState().toggleBuff(CHAR, 'haste')
    useSessionStore.getState().toggleBuff(CHAR, 'prayer')
    const ids = useSessionStore.getState().getSession(CHAR).activeBuffIds
    expect(ids).toContain('haste')
    expect(ids).toContain('prayer')
  })

  it('addCustomBuff stores custom buff and auto-activates it', () => {
    useSessionStore.getState().addCustomBuff(CHAR, {
      id: 'custom-1',
      name: 'Heroism',
      active: true,
      attackMod: 2,
      damageMod: 0,
      acMod: 0,
      isCustom: true,
    })
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.customBuffs?.some((b) => b.id === 'custom-1')).toBe(true)
    expect(sess.activeBuffIds).toContain('custom-1')
  })

  it('removeCustomBuff deletes custom buff and deactivates it', () => {
    useSessionStore.getState().addCustomBuff(CHAR, {
      id: 'custom-1',
      name: 'Heroism',
      active: true,
      attackMod: 2,
      damageMod: 0,
      acMod: 0,
      isCustom: true,
    })
    useSessionStore.getState().removeCustomBuff(CHAR, 'custom-1')
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.customBuffs?.some((b) => b.id === 'custom-1')).toBe(false)
    expect(sess.activeBuffIds).not.toContain('custom-1')
  })

  it('addCustomBuff updates an existing custom buff when IDs match', () => {
    useSessionStore.getState().addCustomBuff(CHAR, {
      id: 'custom-1',
      name: 'Heroism',
      active: true,
      attackMod: 2,
      damageMod: 0,
      acMod: 0,
      isCustom: true,
    })
    useSessionStore.getState().addCustomBuff(CHAR, {
      id: 'custom-1',
      name: 'Greater Heroism',
      active: true,
      attackMod: 4,
      damageMod: 0,
      acMod: 0,
      isCustom: true,
    })
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.customBuffs).toHaveLength(1)
    expect(sess.customBuffs?.[0].name).toBe('Greater Heroism')
    expect(sess.customBuffs?.[0].attackMod).toBe(4)
  })
})

// ─── Conditions ──────────────────────────────────────────────────────────────

describe('condition toggling', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('toggleCondition adds a condition', () => {
    useSessionStore.getState().toggleCondition(CHAR, 'shaken')
    expect(useSessionStore.getState().getSession(CHAR).conditions).toContain('shaken')
  })

  it('toggleCondition removes an active condition', () => {
    useSessionStore.getState().toggleCondition(CHAR, 'shaken')
    useSessionStore.getState().toggleCondition(CHAR, 'shaken')
    expect(useSessionStore.getState().getSession(CHAR).conditions).not.toContain('shaken')
  })
})

// ─── Spell slots ─────────────────────────────────────────────────────────────

describe('spell slot management', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('spendSpellSlot increments spent count', () => {
    useSessionStore.getState().spendSpellSlot(CHAR, 1, 4)
    expect(useSessionStore.getState().getSession(CHAR).spentSpellSlots[1]).toBe(1)
  })

  it('spendSpellSlot does not exceed max', () => {
    useSessionStore.getState().spendSpellSlot(CHAR, 1, 2)
    useSessionStore.getState().spendSpellSlot(CHAR, 1, 2)
    useSessionStore.getState().spendSpellSlot(CHAR, 1, 2) // ignored
    expect(useSessionStore.getState().getSession(CHAR).spentSpellSlots[1]).toBe(2)
  })

  it('recoverSpellSlot decrements spent count', () => {
    useSessionStore.getState().spendSpellSlot(CHAR, 2, 3)
    useSessionStore.getState().spendSpellSlot(CHAR, 2, 3)
    useSessionStore.getState().recoverSpellSlot(CHAR, 2)
    expect(useSessionStore.getState().getSession(CHAR).spentSpellSlots[2]).toBe(1)
  })

  it('recoverSpellSlot does not go below 0', () => {
    useSessionStore.getState().recoverSpellSlot(CHAR, 3)
    expect(useSessionStore.getState().getSession(CHAR).spentSpellSlots[3] ?? 0).toBe(0)
  })

  it('toggleSpellPrepared adds spell without consuming a spell slot', () => {
    useSessionStore.getState().toggleSpellPrepared(CHAR, 'magic-missile', 1, 4)
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.preparedSpellIds).toContain('magic-missile')
    expect(sess.spentSpellSlots[1] ?? 0).toBe(0)
  })

  it('toggleSpellPrepared removes spell without altering spent slots', () => {
    useSessionStore.getState().toggleSpellPrepared(CHAR, 'magic-missile', 1, 4)
    useSessionStore.getState().toggleSpellPrepared(CHAR, 'magic-missile', 1, 4)
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.preparedSpellIds).not.toContain('magic-missile')
    expect(sess.spentSpellSlots[1] ?? 0).toBe(0)
  })

  it('prepareSpell and unprepareSpell support multiple prepared instances', () => {
    useSessionStore.getState().prepareSpell(CHAR, 'magic-missile')
    useSessionStore.getState().prepareSpell(CHAR, 'magic-missile')
    let sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.preparedSpellIds.filter((x) => x === 'magic-missile')).toHaveLength(2)

    useSessionStore.getState().unprepareSpell(CHAR, 'magic-missile')
    sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.preparedSpellIds.filter((x) => x === 'magic-missile')).toHaveLength(1)
  })

  it('toggleItemEquipped toggles items in equippedItemIds', () => {
    useSessionStore.getState().toggleItemEquipped(CHAR, 'item-cloak')
    expect(useSessionStore.getState().getSession(CHAR).equippedItemIds).toContain('item-cloak')
    useSessionStore.getState().toggleItemEquipped(CHAR, 'item-cloak')
    expect(useSessionStore.getState().getSession(CHAR).equippedItemIds).not.toContain('item-cloak')
  })

  it('initSession populates initialEquippedIds on legacy sessions where equippedItemIds is undefined', () => {
    useSessionStore.setState((s) => ({
      sessions: {
        ...s.sessions,
        [CHAR]: {
          ...s.sessions[CHAR]!,
          equippedItemIds: undefined,
        },
      },
    }))
    useSessionStore.getState().initSession(CHAR, MAX_HP, undefined, ['ring-1', 'armor-1'])
    expect(useSessionStore.getState().getSession(CHAR).equippedItemIds).toEqual(['ring-1', 'armor-1'])
  })
})

// ─── Ammo ────────────────────────────────────────────────────────────────────

describe('ammo tracking', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('setAmmo stores ammo count by weaponId', () => {
    useSessionStore.getState().setAmmo(CHAR, 'bow', 20)
    expect(useSessionStore.getState().getSession(CHAR).ammo['bow']).toBe(20)
  })

  it('setAmmo can be updated', () => {
    useSessionStore.getState().setAmmo(CHAR, 'bow', 20)
    useSessionStore.getState().setAmmo(CHAR, 'bow', 17)
    expect(useSessionStore.getState().getSession(CHAR).ammo['bow']).toBe(17)
  })
})

// ─── Inventory tracking ──────────────────────────────────────────────────────

describe('inventory tracking', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('setItemQuantity sets quantity clamped at 0', () => {
    useSessionStore.getState().setItemQuantity(CHAR, 'potion-heal', 3)
    expect(useSessionStore.getState().getSession(CHAR).itemQuantities['potion-heal']).toBe(3)

    useSessionStore.getState().setItemQuantity(CHAR, 'potion-heal', -5)
    expect(useSessionStore.getState().getSession(CHAR).itemQuantities['potion-heal']).toBe(0)
  })

  it('adjustItemQuantity adjusts quantity with delta and clamps to 0', () => {
    useSessionStore.getState().setItemQuantity(CHAR, 'torch', 5)
    useSessionStore.getState().adjustItemQuantity(CHAR, 'torch', 2)
    expect(useSessionStore.getState().getSession(CHAR).itemQuantities['torch']).toBe(7)

    useSessionStore.getState().adjustItemQuantity(CHAR, 'torch', -10)
    expect(useSessionStore.getState().getSession(CHAR).itemQuantities['torch']).toBe(0)
  })
})

// ─── Currency tracking ───────────────────────────────────────────────────────

describe('currency tracking', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('setCoins sets coin purse directly', () => {
    useSessionStore.getState().setCoins(CHAR, { gp: 100, sp: 50, cp: 20 })
    expect(useSessionStore.getState().getSession(CHAR).coins).toEqual({ gp: 100, sp: 50, cp: 20 })
  })

  it('adjustCoin adjusts denomination and clamps at 0', () => {
    useSessionStore.getState().setCoins(CHAR, { gp: 10, sp: 5, cp: 0 })
    useSessionStore.getState().adjustCoin(CHAR, 'gp', 15)
    expect(useSessionStore.getState().getSession(CHAR).coins.gp).toBe(25)

    useSessionStore.getState().adjustCoin(CHAR, 'sp', -20)
    expect(useSessionStore.getState().getSession(CHAR).coins.sp).toBe(0)
  })
})

// ─── Summon ──────────────────────────────────────────────────────────────────

describe('summon management', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  const summon = { spellId: 'summon-monster-iii', optionId: 'dire-wolf', currentHp: 25 }

  it('setSummon stores the active summon', () => {
    useSessionStore.getState().setSummon(CHAR, summon)
    expect(useSessionStore.getState().getSession(CHAR).activeSummon).toEqual(summon)
  })

  it('adjustSummonHp increases HP', () => {
    useSessionStore.getState().setSummon(CHAR, { ...summon, currentHp: 10 })
    useSessionStore.getState().adjustSummonHp(CHAR, 5)
    expect(useSessionStore.getState().getSession(CHAR).activeSummon?.currentHp).toBe(15)
  })

  it('adjustSummonHp clamps to 0 from below', () => {
    useSessionStore.getState().setSummon(CHAR, { ...summon, currentHp: 3 })
    useSessionStore.getState().adjustSummonHp(CHAR, -10)
    expect(useSessionStore.getState().getSession(CHAR).activeSummon?.currentHp).toBe(0)
  })

  it('clearSummon removes the summon', () => {
    useSessionStore.getState().setSummon(CHAR, summon)
    useSessionStore.getState().clearSummon(CHAR)
    expect(useSessionStore.getState().getSession(CHAR).activeSummon).toBeNull()
  })

  it('adjustSummonHp is a no-op when no summon is active', () => {
    // Should not throw
    useSessionStore.getState().adjustSummonHp(CHAR, -5)
    expect(useSessionStore.getState().getSession(CHAR).activeSummon).toBeNull()
  })
})

// ─── Long rest ───────────────────────────────────────────────────────────────

describe('longRest', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('restores HP to max', () => {
    useSessionStore.getState().setHp(CHAR, 5)
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(MAX_HP)
  })

  it('clears temp HP', () => {
    useSessionStore.getState().setTempHp(CHAR, 10)
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).tempHp).toBe(0)
  })

  it('clears nonlethal damage', () => {
    useSessionStore.getState().setNonlethal(CHAR, 7)
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).nonlethalDamage).toBe(0)
  })

  it('clears spent resources', () => {
    useSessionStore.getState().spendResource(CHAR, 'rage', 5)
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).spentResources).toEqual({})
  })

  it('clears spell slots', () => {
    useSessionStore.getState().spendSpellSlot(CHAR, 1, 4)
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).spentSpellSlots).toEqual({})
  })

  it('clears active buffs', () => {
    useSessionStore.getState().toggleBuff(CHAR, 'haste')
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).activeBuffIds).toEqual([])
  })

  it('clears conditions', () => {
    useSessionStore.getState().toggleCondition(CHAR, 'shaken')
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).conditions).toEqual([])
  })

  it('preserves prepared spell loadout across longRest and resets spentPreparedSpells', () => {
    useSessionStore.getState().toggleSpellPrepared(CHAR, 'magic-missile', 1, 4)
    useSessionStore.getState().spendPreparedSpell(CHAR, 'magic-missile', 1)
    expect(useSessionStore.getState().getSession(CHAR).spentPreparedSpells?.['magic-missile']).toBe(1)
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).preparedSpells?.['magic-missile']).toBe(1)
    expect(useSessionStore.getState().getSession(CHAR).spentPreparedSpells).toEqual({})
  })

  it('clears prepared spells when clearPreparedSpells is called', () => {
    useSessionStore.getState().toggleSpellPrepared(CHAR, 'magic-missile', 1, 4)
    useSessionStore.getState().clearPreparedSpells(CHAR)
    expect(useSessionStore.getState().getSession(CHAR).preparedSpells).toEqual({})
    expect(useSessionStore.getState().getSession(CHAR).preparedSpellIds).toEqual([])
  })

  it('clears active summon', () => {
    useSessionStore.getState().setSummon(CHAR, { spellId: 'x', optionId: 'y', currentHp: 20 })
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).activeSummon).toBeNull()
  })

  it('resets companion HP, temp HP and conditions on longRest', () => {
    useSessionStore.getState().adjustCompanionHp(CHAR, 'wolf', -10, 26)
    useSessionStore.getState().setCompanionTempHp(CHAR, 'wolf', 5)
    useSessionStore.getState().toggleCompanionCondition(CHAR, 'wolf', 'shaken')
    useSessionStore.getState().longRest(CHAR, MAX_HP)
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.companionHp?.wolf).toBeUndefined() // defaults to maxHp
    expect(sess.companionTempHp?.wolf).toBeUndefined()
    expect(sess.companionConditions?.wolf).toBeUndefined()
  })

  it('preserves inventory items and coins across longRest', () => {
    useSessionStore.getState().setItemQuantity(CHAR, 'potion', 5)
    useSessionStore.getState().setCoins(CHAR, { gp: 100, sp: 20, cp: 5 })

    useSessionStore.getState().longRest(CHAR, MAX_HP)

    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.itemQuantities['potion']).toBe(5)
    expect(sess.coins).toEqual({ gp: 100, sp: 20, cp: 5 })
  })
})

// ─── Companion management ───────────────────────────────────────────────────

describe('companion management', () => {
  const COMP_ID = 'wolf-1'
  const COMP_MAX_HP = 26

  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('adjustCompanionHp decreases and increases companion HP clamped to max', () => {
    useSessionStore.getState().adjustCompanionHp(CHAR, COMP_ID, -6, COMP_MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).companionHp?.[COMP_ID]).toBe(20)

    useSessionStore.getState().adjustCompanionHp(CHAR, COMP_ID, 10, COMP_MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).companionHp?.[COMP_ID]).toBe(COMP_MAX_HP)
  })

  it('setCompanionTempHp updates companion temp HP', () => {
    useSessionStore.getState().setCompanionTempHp(CHAR, COMP_ID, 8)
    expect(useSessionStore.getState().getSession(CHAR).companionTempHp?.[COMP_ID]).toBe(8)
  })

  it('toggleCompanionCondition toggles conditions on and off', () => {
    useSessionStore.getState().toggleCompanionCondition(CHAR, COMP_ID, 'shaken')
    expect(useSessionStore.getState().getSession(CHAR).companionConditions?.[COMP_ID]).toContain('shaken')

    useSessionStore.getState().toggleCompanionCondition(CHAR, COMP_ID, 'shaken')
    expect(useSessionStore.getState().getSession(CHAR).companionConditions?.[COMP_ID]).not.toContain('shaken')
  })

  it('setActiveCompanion sets active companion id', () => {
    useSessionStore.getState().setActiveCompanion(CHAR, COMP_ID)
    expect(useSessionStore.getState().getSession(CHAR).activeCompanionId).toBe(COMP_ID)
  })
})

// ─── Atomic Damage, Healing, Normalization & No-op Preservation ──────────────

describe('applyDamage & applyHealing', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('applyDamage absorbs tempHp first and reduces currentHp with remainder', () => {
    useSessionStore.getState().setTempHp(CHAR, 8)
    useSessionStore.getState().applyDamage(CHAR, 12, 14)
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.tempHp).toBe(0)
    expect(sess.currentHp).toBe(26)
  })

  it('applyDamage clamps currentHp at negative CON score', () => {
    useSessionStore.getState().applyDamage(CHAR, 100, 14)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(-14)
  })

  it('applyDamage is a no-op when damage <= 0', () => {
    const before = useSessionStore.getState()
    useSessionStore.getState().applyDamage(CHAR, 0, 14)
    useSessionStore.getState().applyDamage(CHAR, -5, 14)
    expect(useSessionStore.getState()).toBe(before)
  })

  it('applyHealing clears nonlethalDamage first and caps currentHp at maxHp', () => {
    useSessionStore.getState().setHp(CHAR, 20)
    useSessionStore.getState().setNonlethal(CHAR, 6)
    useSessionStore.getState().applyHealing(CHAR, 10, MAX_HP)
    const sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.nonlethalDamage).toBe(0)
    expect(sess.currentHp).toBe(24)
  })

  it('applyHealing caps currentHp at maxHp', () => {
    useSessionStore.getState().setHp(CHAR, 25)
    useSessionStore.getState().applyHealing(CHAR, 20, MAX_HP)
    expect(useSessionStore.getState().getSession(CHAR).currentHp).toBe(MAX_HP)
  })

  it('applyHealing is a no-op when healing <= 0', () => {
    const before = useSessionStore.getState()
    useSessionStore.getState().applyHealing(CHAR, 0, MAX_HP)
    expect(useSessionStore.getState()).toBe(before)
  })
})

describe('normalizePersistedSession, toggleSpellBuff & no-op state preservation', () => {
  beforeEach(() => {
    resetStore()
    useSessionStore.getState().initSession(CHAR, MAX_HP)
  })

  it('normalizePersistedSession backfills missing arrays and strips legacy spells-* keys', () => {
    const legacy = {
      characterId: CHAR,
      currentHp: 18,
      spentResources: { rage: 2, 'spells-1': 3, 'spells-2': 1 },
      preparedSpellIds: ['shield', 'shield'],
    } as unknown as ReturnType<typeof useSessionStore.getState>['sessions'][string]

    const normalized = normalizePersistedSession(legacy)
    expect(normalized.spentResources).toEqual({ rage: 2 })
    expect(normalized.preparedSpells).toEqual({ shield: 2 })
    expect(normalized.preparedSpellIds).toEqual(['shield', 'shield'])
    expect(normalized.activeBuffIds).toEqual([])
    expect(normalized.conditions).toEqual([])
    expect(normalized.activeSummon).toBeNull()
  })

  it('toggleSpellBuff creates custom spell buff on first call and toggles active state', () => {
    const spell = {
      id: 'shield-of-faith',
      name: 'Shield of Faith',
      level: 1,
      school: 'Abjuration',
      castingTime: '1 standard action',
      range: 'Touch',
      duration: '1 min./level',
      description: 'Grants +2 deflection bonus to AC.',
      spellResistance: true,
      components: 'V, S, DF',
    }
    useSessionStore.getState().toggleSpellBuff(CHAR, spell)
    let sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.activeBuffIds).toContain('spell-buff-shield-of-faith')
    expect(sess.customBuffs?.some((b) => b.id === 'spell-buff-shield-of-faith' && b.spellId === 'shield-of-faith')).toBe(true)

    useSessionStore.getState().toggleSpellBuff(CHAR, spell)
    sess = useSessionStore.getState().getSession(CHAR)
    expect(sess.activeBuffIds).not.toContain('spell-buff-shield-of-faith')
  })

  it('preserves store state reference on no-op resource spend or recovery', () => {
    useSessionStore.getState().spendResource(CHAR, 'rage', 1)
    const afterFirstSpend = useSessionStore.getState()
    useSessionStore.getState().spendResource(CHAR, 'rage', 1)
    expect(useSessionStore.getState()).toBe(afterFirstSpend)

    useSessionStore.getState().recoverResource(CHAR, 'rage')
    const afterRecoverToZero = useSessionStore.getState()
    useSessionStore.getState().recoverResource(CHAR, 'rage')
    expect(useSessionStore.getState()).toBe(afterRecoverToZero)

    const beforeNoSlotPrepare = useSessionStore.getState()
    useSessionStore.getState().toggleSpellPrepared(CHAR, 'fireball', 3, 0)
    expect(useSessionStore.getState()).toBe(beforeNoSlotPrepare)
  })
})
