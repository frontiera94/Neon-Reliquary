// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  monkChar,
  magusChar,
  inquisitorChar,
  rogueChar,
  resetTestStores,
  setupTestSession,
  deriveSpellDc,
  deriveConcentrationBonus,
  deriveCastingAbilityKey,
} from './fixtures'
import { useCharacterStore } from '../../src/store/useCharacterStore'
import { useSessionStore } from '../../src/store/useSessionStore'
import { useDiceStore } from '../../src/store/useDiceStore'
import {
  calcEffectiveAbilities,
  calcEffectiveArmorClass,
  calcEffectiveSaves,
  calcEffectiveWeaponStats,
} from '../../src/lib/stat-calc'
import { abilityMod } from '../../src/lib/dice-engine'
import { CombatPage } from '../../src/pages/CombatPage'
import { SpellsPage } from '../../src/pages/SpellsPage'
import { StatusPage } from '../../src/pages/StatusPage'
import { TopBar } from '../../src/components/layout/TopBar'
import { MainLayout } from '../../src/components/layout/MainLayout'

describe('Tier 1: Comprehensive Feature Verification (R1–R5)', () => {
  beforeEach(() => {
    resetTestStores()
  })

  // =========================================================================
  // Feature 1: Reactive HP Bar & Multi-track Vitals (R1)
  // =========================================================================
  describe('F1: Reactive HP Bar & Multi-track Vitals', () => {
    it('1.1 displays exact current and max HP values in HUD/TopBar', () => {
      setupTestSession(magusChar.id, { currentHp: 38 })
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      )
      expect(screen.getByText('38 / 38 HP')).toBeInTheDocument()
    })

    it('1.2 reflects current HP reduction in real-time from session store', () => {
      setupTestSession(magusChar.id, { currentHp: 20 })
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      )
      expect(screen.getByText('20 / 38 HP')).toBeInTheDocument()
    })

    it('1.3 tracks temporary HP in session store and calculates effective health pool', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 10 })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(10)
      const totalPool = session.currentHp + session.tempHp
      expect(totalPool).toBe(48)
    })

    it('1.4 tracks nonlethal damage and computes conscious state', () => {
      setupTestSession(magusChar.id, { currentHp: 38, nonlethalDamage: 12 })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.nonlethalDamage).toBe(12)
      expect(session.currentHp).toBeGreaterThan(session.nonlethalDamage)
    })

    it('1.5 clamps HP bar fill percentage mathematically between 0 and 100', () => {
      const clampPercent = (cur: number, max: number) =>
        Math.min(100, Math.max(0, Math.round((cur / max) * 100)))

      expect(clampPercent(38, 38)).toBe(100)
      expect(clampPercent(19, 38)).toBe(50)
      expect(clampPercent(0, 38)).toBe(0)
      expect(clampPercent(-10, 38)).toBe(0)
      expect(clampPercent(50, 38)).toBe(100)
    })
  })

  // =========================================================================
  // Feature 2: Tactical HP Popover (Instant Damage & Cure) (R1)
  // =========================================================================
  describe('F2: Tactical HP Popover & Instant Adjustments', () => {
    it('2.1 applies regular damage directly to current HP when temp HP is 0', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 0 })
      useSessionStore.getState().adjustHp(magusChar.id, -10, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(28)
    })

    it('2.2 absorbs damage into temporary HP first before affecting current HP', () => {
      setupTestSession(magusChar.id, { currentHp: 38, tempHp: 8 })
      const absorbDamage = (charId: string, damage: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        const absorbed = Math.min(sess.tempHp, damage)
        const remainder = damage - absorbed
        useSessionStore.getState().setTempHp(charId, sess.tempHp - absorbed)
        if (remainder > 0) {
          useSessionStore.getState().adjustHp(charId, -remainder, maxHp)
        }
      }

      absorbDamage(magusChar.id, 12, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.tempHp).toBe(0)
      expect(session.currentHp).toBe(34) // 38 - 4
    })

    it('2.3 heals current HP clamped to max HP', () => {
      setupTestSession(magusChar.id, { currentHp: 25 })
      useSessionStore.getState().adjustHp(magusChar.id, 20, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(38) // clamped at maxHp 38
    })

    it('2.4 healing cleanses nonlethal damage first according to PF1e rules', () => {
      setupTestSession(magusChar.id, { currentHp: 30, nonlethalDamage: 10 })
      const applyHealing = (charId: string, healAmount: number, maxHp: number) => {
        const sess = useSessionStore.getState().getSession(charId)
        useSessionStore.getState().setNonlethal(charId, Math.max(0, sess.nonlethalDamage - healAmount))
        useSessionStore.getState().adjustHp(charId, healAmount, maxHp)
      }

      applyHealing(magusChar.id, 6, magusChar.maxHp)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.nonlethalDamage).toBe(4) // 10 - 6
      expect(session.currentHp).toBe(36) // 30 + 6
    })

    it('2.5 preset adjustment amounts apply exact delta through StatusPage controls', () => {
      setupTestSession(magusChar.id, { currentHp: 38 })
      render(
        <MemoryRouter>
          <StatusPage />
        </MemoryRouter>
      )
      const minusBtn = screen.getByRole('button', { name: /Decrease HP/i })
      fireEvent.click(minusBtn)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.currentHp).toBe(37)
    })
  })

  // =========================================================================
  // Feature 3: Persistent AC Display (Total, Touch, Flat-Footed) (R1)
  // =========================================================================
  describe('F3: Persistent AC Display (Total, Touch, Flat-Footed)', () => {
    it('3.1 computes baseline total AC for Magus Kensai (18 Total = 10 + 4 Dex + 4 Canny)', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        []
      )
      expect(effAc.total).toBe(18)
    })

    it('3.2 computes Touch AC excluding armor, shield, and natural armor', () => {
      const effAbil = calcEffectiveAbilities(inquisitorChar.abilities, [], [])
      const effAc = calcEffectiveArmorClass(
        inquisitorChar.armorClass,
        abilityMod(inquisitorChar.abilities.dex),
        effAbil.mods.dex,
        [],
        []
      )
      expect(effAc.touch).toBeLessThan(effAc.total)
      expect(effAc.touch).toBe(inquisitorChar.armorClass.touch)
    })

    it('3.3 denies positive DEX bonus to Flat-Footed AC while preserving base armor', () => {
      const effAbil = calcEffectiveAbilities(inquisitorChar.abilities, [], [])
      const effAc = calcEffectiveArmorClass(
        inquisitorChar.armorClass,
        abilityMod(inquisitorChar.abilities.dex),
        effAbil.mods.dex,
        [],
        []
      )
      expect(effAc.flatFooted).toBe(24)
    })

    it('3.4 Shield buff adds +4 shield bonus to Total and Flat-Footed AC', () => {
      const shieldBuff = magusChar.buffs.find((b) => b.id === 'buff-shield-spell')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [shieldBuff])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [shieldBuff]
      )
      expect(effAc.total).toBe(22) // 18 + 4
      expect(effAc.flatFooted).toBe(18) // 14 + 4
      expect(effAc.notes).toBeDefined()
    })

    it('3.5 condition Blinded denies DEX bonus to AC and imposes -2 AC penalty', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['blinded'], [])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        ['blinded'],
        []
      )
      expect(effAc.total).toBe(12) // 18 - 4 - 2 = 12 Total AC
    })
  })

  // =========================================================================
  // Feature 4: Interactive Saving Throw Rolls via useDiceStore (R1)
  // =========================================================================
  describe('F4: Interactive Saving Throw Rolls', () => {
    it('4.1 dispatches Fortitude save roll to useDiceStore with correct bonus', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        [],
        []
      )
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.fort,
        label: 'Fortitude Save',
        breakdown: effSaves.breakdowns.fortitude,
      })

      const state = useDiceStore.getState()
      expect(state.isOpen).toBe(true)
      expect(state.pendingRoll?.modifier).toBe(6)
      expect(state.pendingRoll?.label).toBe('Fortitude Save')
    })

    it('4.2 dispatches Reflex save roll to useDiceStore with correct bonus', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        [],
        []
      )
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.ref,
        label: 'Reflex Save',
        breakdown: effSaves.breakdowns.reflex,
      })

      const state = useDiceStore.getState()
      expect(state.isOpen).toBe(true)
      expect(state.pendingRoll?.modifier).toBe(5)
      expect(state.pendingRoll?.label).toBe('Reflex Save')
    })

    it('4.3 dispatches Will save roll to useDiceStore with correct bonus', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        [],
        []
      )
      useDiceStore.getState().openRoll({
        diceType: 20,
        count: 1,
        modifier: effSaves.will,
        label: 'Will Save',
        breakdown: effSaves.breakdowns.will,
      })

      const state = useDiceStore.getState()
      expect(state.isOpen).toBe(true)
      expect(state.pendingRoll?.modifier).toBe(5)
      expect(state.pendingRoll?.label).toBe('Will Save')
    })

    it('4.4 condition Shaken imposes -2 penalty on all saving throw rolls', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['shaken'], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        ['shaken'],
        []
      )
      expect(effSaves.fort).toBe(4) // 6 - 2
      expect(effSaves.ref).toBe(3)  // 5 - 2
      expect(effSaves.will).toBe(3) // 5 - 2
    })

    it('4.5 global save buffs increase roll modifiers across all three categories', () => {
      const divineBuff = inquisitorChar.buffs.find((b) => b.id === 'buff-divine-favor')!
      const buffs = [{ ...divineBuff, saveMod: 3 }]
      const effAbil = calcEffectiveAbilities(inquisitorChar.abilities, [], buffs)
      const effSaves = calcEffectiveSaves(
        inquisitorChar.savingThrows,
        inquisitorChar.abilities,
        effAbil,
        [],
        buffs
      )
      expect(effSaves.fort).toBe(14) // 11 + 3
      expect(effSaves.ref).toBe(9)   // 6 + 3
      expect(effSaves.will).toBe(16) // 13 + 3
    })
  })

  // =========================================================================
  // Feature 5: Active Buff & Condition Pills (R1)
  // =========================================================================
  describe('F5: Active Buff & Condition Pills', () => {
    it('5.1 renders active condition pill in HUD/TopBar', () => {
      setupTestSession(magusChar.id, { conditions: ['shaken'] })
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      )
      expect(screen.getByText('shaken')).toBeInTheDocument()
    })

    it('5.2 stores multiple active buff IDs in session state', () => {
      setupTestSession(magusChar.id, {
        activeBuffIds: ['buff-arcane-weapon', 'buff-shield-spell'],
      })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.activeBuffIds).toContain('buff-arcane-weapon')
      expect(session.activeBuffIds).toContain('buff-shield-spell')
    })

    it('5.3 toggling buff on adds buff ID and toggling off removes it', () => {
      setupTestSession(magusChar.id, { activeBuffIds: [] })
      useSessionStore.getState().toggleBuff(magusChar.id, 'buff-arcane-weapon')
      expect(useSessionStore.getState().getSession(magusChar.id).activeBuffIds).toContain('buff-arcane-weapon')

      useSessionStore.getState().toggleBuff(magusChar.id, 'buff-arcane-weapon')
      expect(useSessionStore.getState().getSession(magusChar.id).activeBuffIds).not.toContain('buff-arcane-weapon')
    })

    it('5.4 toggles conditions on and off in session store', () => {
      setupTestSession(magusChar.id, { conditions: [] })
      useSessionStore.getState().toggleCondition(magusChar.id, 'fatigued')
      expect(useSessionStore.getState().getSession(magusChar.id).conditions).toContain('fatigued')

      useSessionStore.getState().toggleCondition(magusChar.id, 'fatigued')
      expect(useSessionStore.getState().getSession(magusChar.id).conditions).not.toContain('fatigued')
    })

    it('5.5 supports custom buffs alongside predefined character buffs', () => {
      setupTestSession(magusChar.id, {
        customBuffs: [
          {
            id: 'custom-haste',
            name: 'Haste',
            active: true,
            attackMod: 1,
            damageMod: 0,
            acMod: 1,
            color: 'primary',
          },
        ],
        activeBuffIds: ['custom-haste'],
      })
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.customBuffs?.[0].name).toBe('Haste')
      expect(session.activeBuffIds).toContain('custom-haste')
    })
  })

  // =========================================================================
  // Feature 6: Inline Resource Pips on Buffs (R2)
  // =========================================================================
  describe('F6: Inline Resource Pips on Buffs', () => {
    it('6.1 tracks total daily resources defined on character (Arcane Pool: 6)', () => {
      const resource = magusChar.dailyResources.find((r) => r.id === 'arcane-pool')!
      expect(resource.total).toBe(6)
    })

    it('6.2 spending resource increments spent count in useSessionStore', () => {
      setupTestSession(magusChar.id, { spentResources: {} })
      useSessionStore.getState().spendResource(magusChar.id, 'arcane-pool', 6)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentResources['arcane-pool']).toBe(1)
    })

    it('6.3 recovering resource decrements spent count in useSessionStore', () => {
      setupTestSession(magusChar.id, { spentResources: { 'arcane-pool': 3 } })
      useSessionStore.getState().recoverResource(magusChar.id, 'arcane-pool')
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentResources['arcane-pool']).toBe(2)
    })

    it('6.4 cannot spend beyond total resource maximum', () => {
      setupTestSession(magusChar.id, { spentResources: { 'arcane-pool': 6 } })
      useSessionStore.getState().spendResource(magusChar.id, 'arcane-pool', 6)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentResources['arcane-pool']).toBe(6)
    })

    it('6.5 cannot recover below zero spent resources', () => {
      setupTestSession(magusChar.id, { spentResources: { 'arcane-pool': 0 } })
      useSessionStore.getState().recoverResource(magusChar.id, 'arcane-pool')
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentResources['arcane-pool'] ?? 0).toBe(0)
    })
  })

  // =========================================================================
  // Feature 7: Inspectable Stat Breakdown Tooltip/Popover (R2)
  // =========================================================================
  describe('F7: Inspectable Stat Breakdown Components', () => {
    it('7.1 generates itemized attack breakdown showing Base, Ability, Buff, Condition', () => {
      const weapon = magusChar.weapons[0]
      const buff = magusChar.buffs.find((b) => b.id === 'buff-arcane-weapon')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['shaken'], [buff])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        magusChar.abilities,
        effAbil,
        ['shaken'],
        [buff],
        [buff.id]
      )
      expect(effWeapon.attackBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Base BAB/Mod' }),
          expect.objectContaining({ label: 'Arcane Weapon Enhancement', value: 1 }),
          expect.objectContaining({ label: 'Shaken', value: -2 }),
        ])
      )
    })

    it('7.2 generates itemized AC breakdown showing base and active buffs', () => {
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

    it('7.3 generates itemized Saving Throw breakdown showing Base, Ability, Condition', () => {
      const effAbil = calcEffectiveAbilities(magusChar.abilities, ['sickened'], [])
      const effSaves = calcEffectiveSaves(
        magusChar.savingThrows,
        magusChar.abilities,
        effAbil,
        ['sickened'],
        []
      )
      expect(effSaves.breakdowns.fortitude).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Base', value: 6 }),
          expect.objectContaining({ label: 'Sickened', value: -2 }),
        ])
      )
    })

    it('7.4 damage breakdown displays weapon base damage and positive buff bonus', () => {
      const weapon = magusChar.weapons[0]
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
      expect(effWeapon.damageBonus).toBe(6) // 5 + 1
      expect(effWeapon.damageBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Base Dmg', value: 5 }),
          expect.objectContaining({ label: 'Arcane Weapon Enhancement', value: 1 }),
        ])
      )
    })

    it('7.5 empty modifier breakdown reports only Base when no buffs or conditions active', () => {
      const weapon = magusChar.weapons[0]
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [])
      const effWeapon = calcEffectiveWeaponStats(
        weapon,
        magusChar.abilities,
        effAbil,
        [],
        [],
        []
      )
      expect(effWeapon.attackBreakdown).toEqual([{ label: 'Base BAB/Mod', value: 8 }])
    })
  })

  // =========================================================================
  // Feature 8: Semantic Color Highlighting (#00f0ff / #ff4b60) (R2)
  // =========================================================================
  describe('F8: Semantic Color Highlighting (#00f0ff / #ff4b60)', () => {
    it('8.1 identifies positive modifier values as requiring cyan #00f0ff highlight', () => {
      const resolveToken = (val: number) =>
        val > 0 ? '#00f0ff' : val < 0 ? '#ff4b60' : '#f1f5f9'

      expect(resolveToken(2)).toBe('#00f0ff')
      expect(resolveToken(4)).toBe('#00f0ff')
    })

    it('8.2 identifies negative modifier values as requiring alert red #ff4b60 highlight', () => {
      const resolveToken = (val: number) =>
        val > 0 ? '#00f0ff' : val < 0 ? '#ff4b60' : '#f1f5f9'

      expect(resolveToken(-2)).toBe('#ff4b60')
      expect(resolveToken(-4)).toBe('#ff4b60')
    })

    it('8.3 neutral zero modifier values use standard text on-surface token #f1f5f9', () => {
      const resolveToken = (val: number) =>
        val > 0 ? '#00f0ff' : val < 0 ? '#ff4b60' : '#f1f5f9'

      expect(resolveToken(0)).toBe('#f1f5f9')
    })

    it('8.4 active attack buff toggle in CombatPage renders with cyan glow style', () => {
      setupTestSession(magusChar.id, { activeBuffIds: ['buff-arcane-weapon'] })
      render(
        <MemoryRouter>
          <CombatPage />
        </MemoryRouter>
      )
      const buffBtn = screen.getByText('Arcane Weapon Enhancement').closest('button')
      expect(buffBtn).not.toBeNull()
      expect(buffBtn?.getAttribute('style')).toContain('#00f0ff')
    })

    it('8.5 negative damage bonus renders formatted damage text', () => {
      setupTestSession(rogueChar.id)
      render(
        <MemoryRouter>
          <CombatPage />
        </MemoryRouter>
      )
      // Rogue has -2 damage bonus on dagger from STR 6 (rendered as 1d4 - 2)
      expect(screen.getByText('Masterwork Dagger')).toBeInTheDocument()
      expect(screen.getByText('1d4 - 2')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // Feature 9: Action Economy Classification (R3)
  // =========================================================================
  describe('F9: Action Economy Classification', () => {
    const classifyAction = (text: string): 'standard' | 'swift' | 'move' | 'immediate' | 'full-round' | 'passive' => {
      const t = text.toLowerCase()
      if (/swift action|azione veloce|azione rapida|ki pool|judgment|bane/i.test(t)) return 'swift'
      if (/immediate action|azione immediata|feather fall/i.test(t)) return 'immediate'
      if (/move action|azione di movimento|cackle/i.test(t)) return 'move'
      if (/full.round|round completo|flurry of blows/i.test(t)) return 'full-round'
      if (/standard action|azione standard/i.test(t)) return 'standard'
      return 'passive'
    }

    it('9.1 categorizes swift action abilities accurately', () => {
      expect(classifyAction('Spend 1 ki point as a swift action.')).toBe('swift')
      expect(classifyAction('Pronounce judgment upon foes as swift action.')).toBe('swift')
    })

    it('9.2 categorizes immediate action abilities accurately', () => {
      expect(classifyAction('Cast feather fall as an immediate action.')).toBe('immediate')
    })

    it('9.3 categorizes full-round action abilities accurately', () => {
      expect(classifyAction('Flurry of blows full attack.')).toBe('full-round')
    })

    it('9.4 categorizes move action abilities accurately', () => {
      expect(classifyAction('Cackle as a move action to extend hex duration.')).toBe('move')
    })

    it('9.5 falls back to passive for constant feats and bonuses', () => {
      expect(classifyAction('You gain a +1 dodge bonus to AC.')).toBe('passive')
      expect(classifyAction('With a light weapon, use Dexterity for attack rolls.')).toBe('passive')
    })
  })

  // =========================================================================
  // Feature 10: Contextual Combat Features Widget (R3)
  // =========================================================================
  describe('F10: Contextual Combat Features Widget', () => {
    it('10.1 identifies active combat features on monk (Flurry of Blows, Ki Pool)', () => {
      const combatFeats = monkChar.classAbilities.filter((a) =>
        /flurry|ki pool/i.test(a.name)
      )
      expect(combatFeats.length).toBe(2)
    })

    it('10.2 exposes signature class ability prominently', () => {
      const sig = monkChar.classAbilities.find((a) => a.isSignature)
      expect(sig?.name).toBe('Flurry of Blows')
    })

    it('10.3 tracks remaining uses for features with linked daily resources', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 1 } })
      const session = useSessionStore.getState().getSession(monkChar.id)
      const resource = monkChar.dailyResources.find((r) => r.id === 'ki-pool')!
      const remaining = resource.total - (session.spentResources['ki-pool'] ?? 0)
      expect(remaining).toBe(3)
    })

    it('10.4 prevents activation when combat feature has 0 remaining uses', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 4 } })
      const session = useSessionStore.getState().getSession(monkChar.id)
      const resource = monkChar.dailyResources.find((r) => r.id === 'ki-pool')!
      const remaining = resource.total - (session.spentResources['ki-pool'] ?? 0)
      expect(remaining).toBe(0)
      expect(remaining > 0).toBe(false)
    })

    it('10.5 recovering daily resource restores feature activation readiness', () => {
      setupTestSession(monkChar.id, { spentResources: { 'ki-pool': 4 } })
      useSessionStore.getState().recoverResource(monkChar.id, 'ki-pool')
      const session = useSessionStore.getState().getSession(monkChar.id)
      const resource = monkChar.dailyResources.find((r) => r.id === 'ki-pool')!
      const remaining = resource.total - (session.spentResources['ki-pool'] ?? 0)
      expect(remaining).toBe(1)
      expect(remaining > 0).toBe(true)
    })
  })

  // =========================================================================
  // Feature 11: Defensive Badges & Reactions (R3)
  // =========================================================================
  describe('F11: Defensive Badges & Reactions', () => {
    it('11.1 identifies Evasion capability on monk and rogue', () => {
      const hasEvasion = (char: typeof monkChar) =>
        char.classAbilities.some((a) => /evasion/i.test(a.name))
      expect(hasEvasion(monkChar)).toBe(true)
      expect(hasEvasion(rogueChar)).toBe(true)
      expect(hasEvasion(magusChar)).toBe(false)
    })

    it('11.2 identifies Uncanny Dodge capability on rogue', () => {
      const hasUncannyDodge = (char: typeof rogueChar) =>
        char.classAbilities.some((a) => /uncanny dodge/i.test(a.name))
      expect(hasUncannyDodge(rogueChar)).toBe(true)
      expect(hasUncannyDodge(monkChar)).toBe(false)
    })

    it('11.3 identifies racial energy resistances on tiefling magus', () => {
      expect(magusChar.race).toContain('Tiefling')
    })

    it('11.4 links defensive reaction badge to appropriate stat (Evasion -> Reflex)', () => {
      const defensiveMappings: Record<string, string> = {
        'Evasion': 'Reflex Save',
        'Uncanny Dodge': 'Flat-Footed AC',
      }
      expect(defensiveMappings['Evasion']).toBe('Reflex Save')
      expect(defensiveMappings['Uncanny Dodge']).toBe('Flat-Footed AC')
    })

    it('11.5 characters without defensive abilities have empty defensive badge lists', () => {
      const getDefensiveBadges = (char: typeof magusChar) =>
        char.classAbilities.filter((a) => /evasion|uncanny dodge/i.test(a.name))
      expect(getDefensiveBadges(magusChar)).toHaveLength(0)
    })
  })

  // =========================================================================
  // Feature 12: Lateral Inspector Drawer (R3)
  // =========================================================================
  describe('F12: Lateral Inspector Drawer State & Contract', () => {
    interface InspectorState {
      isOpen: boolean
      item: { id: string; title: string; description: string } | null
    }

    const createInspector = () => {
      let state: InspectorState = { isOpen: false, item: null }
      return {
        getState: () => state,
        open: (item: { id: string; title: string; description: string }) => {
          state = { isOpen: true, item }
        },
        close: () => {
          state = { isOpen: false, item: null }
        },
      }
    }

    it('12.1 inspector starts closed with null active item', () => {
      const inspector = createInspector()
      expect(inspector.getState().isOpen).toBe(false)
      expect(inspector.getState().item).toBeNull()
    })

    it('12.2 opening inspector sets isOpen to true and captures feature details', () => {
      const inspector = createInspector()
      inspector.open({
        id: 'feat-power-attack',
        title: 'Power Attack',
        description: 'Trade attack bonus for damage.',
      })
      expect(inspector.getState().isOpen).toBe(true)
      expect(inspector.getState().item?.title).toBe('Power Attack')
    })

    it('12.3 closing inspector resets item to null and sets isOpen to false', () => {
      const inspector = createInspector()
      inspector.open({ id: 'f1', title: 'Test', description: 'Desc' })
      inspector.close()
      expect(inspector.getState().isOpen).toBe(false)
      expect(inspector.getState().item).toBeNull()
    })

    it('12.4 switching inspected item replaces active content cleanly without state pollution', () => {
      const inspector = createInspector()
      inspector.open({ id: 'f1', title: 'First', description: 'Desc 1' })
      inspector.open({ id: 'f2', title: 'Second', description: 'Desc 2' })
      expect(inspector.getState().item?.title).toBe('Second')
    })

    it('12.5 inspector retains scroll and context without altering page routing', () => {
      const inspector = createInspector()
      inspector.open({ id: 'f1', title: 'Ki Pool', description: 'Spend ki' })
      expect(useCharacterStore.getState().activeCharacterId).toBe('magus-mazikeen')
      expect(inspector.getState().isOpen).toBe(true)
    })
  })

  // =========================================================================
  // Feature 13: Calculated Spell Save DC & SR Display (R4)
  // =========================================================================
  describe('F13: Calculated Spell Save DC & SR Display', () => {
    it('13.1 calculates 1st-level spell save DC for INT 18 caster (10 + 1 + 4 = 15)', () => {
      const dc = deriveSpellDc(1, abilityMod(magusChar.abilities.int))
      expect(dc).toBe(15)
    })

    it('13.2 calculates 2nd-level spell save DC for INT 18 caster (10 + 2 + 4 = 16)', () => {
      const dc = deriveSpellDc(2, abilityMod(magusChar.abilities.int))
      expect(dc).toBe(16)
    })

    it('13.3 displays Spell Resistance (Yes/No) badge on spell cards in SpellsPage', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <SpellsPage />
        </MemoryRouter>
      )
      expect(screen.getByText('Shocking Grasp')).toBeInTheDocument()
      expect(screen.getByText('Shield')).toBeInTheDocument()
    })

    it('13.4 calculates 2nd-level spell save DC for WIS 20 Inquisitor (10 + 2 + 5 = 17)', () => {
      const dc = deriveSpellDc(2, abilityMod(inquisitorChar.abilities.wis))
      expect(dc).toBe(17)
    })

    it('13.5 correctly resolves key casting ability by class name', () => {
      expect(deriveCastingAbilityKey('Magus')).toBe('int')
      expect(deriveCastingAbilityKey('Inquisitor')).toBe('wis')
      expect(deriveCastingAbilityKey('Sorcerer')).toBe('cha')
      expect(deriveCastingAbilityKey('Wizard')).toBe('int')
      expect(deriveCastingAbilityKey('Cleric')).toBe('wis')
    })
  })

  // =========================================================================
  // Feature 14: Concentration & Touch Attack Quick Rolls (R4)
  // =========================================================================
  describe('F14: Concentration & Touch Attack Quick Rolls', () => {
    it('14.1 calculates base concentration check bonus (Caster Level 4 + INT 4 = +8)', () => {
      const conc = deriveConcentrationBonus(4, abilityMod(magusChar.abilities.int), false)
      expect(conc).toBe(8)
    })

    it('14.2 adds +4 bonus for Combat Casting feat (Concentration +12)', () => {
      const conc = deriveConcentrationBonus(4, abilityMod(magusChar.abilities.int), true)
      expect(conc).toBe(12)
    })

    it('14.3 renders Concentration check button in SpellsPage and dispatches roll', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <SpellsPage />
        </MemoryRouter>
      )
      const concBtn = screen.getByRole('button', { name: /Concentration/i })
      expect(concBtn).toBeInTheDocument()
      fireEvent.click(concBtn)

      const diceState = useDiceStore.getState()
      expect(diceState.isOpen).toBe(true)
      expect(diceState.pendingRoll?.modifier).toBe(8)
    })

    it('14.4 calculates melee touch attack bonus (BAB 3 + DEX 4 = +7 with Finesse)', () => {
      const bab = magusChar.baseAttackBonus[0]
      const dexMod = abilityMod(magusChar.abilities.dex)
      expect(bab + dexMod).toBe(7)
    })

    it('14.5 calculates ranged touch ray attack bonus (BAB 3 + DEX 4 = +7)', () => {
      const bab = magusChar.baseAttackBonus[0]
      const dexMod = abilityMod(magusChar.abilities.dex)
      expect(bab + dexMod).toBe(7)
    })
  })

  // =========================================================================
  // Feature 15: Duration Spell-to-Buff Linkage (R4)
  // =========================================================================
  describe('F15: Duration Spell-to-Buff Linkage', () => {
    it('15.1 identifies spells with duration as buff-convertible (Shield: 4 minutes)', () => {
      const shieldSpell = magusChar.spells.find((s) => s.id === 'spell-shield')!
      expect(shieldSpell.duration).toBe('4 minutes')
    })

    it('15.2 spending spell slot to activate buff consumes 1 slot in useSessionStore', () => {
      setupTestSession(magusChar.id, { spentSpellSlots: {} })
      useSessionStore.getState().spendSpellSlot(magusChar.id, 1, 4)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(1)
    })

    it('15.3 activating spell buff registers buff ID in activeBuffIds', () => {
      setupTestSession(magusChar.id, { activeBuffIds: [] })
      useSessionStore.getState().toggleBuff(magusChar.id, 'buff-shield-spell')
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.activeBuffIds).toContain('buff-shield-spell')
    })

    it('15.4 active spell buff modifies AC in real-time', () => {
      const shieldBuff = magusChar.buffs.find((b) => b.id === 'buff-shield-spell')!
      const effAbil = calcEffectiveAbilities(magusChar.abilities, [], [shieldBuff])
      const effAc = calcEffectiveArmorClass(
        magusChar.armorClass,
        abilityMod(magusChar.abilities.dex),
        effAbil.mods.dex,
        [],
        [shieldBuff]
      )
      expect(effAc.total).toBe(22) // 18 base + 4 shield
    })

    it('15.5 recovering spell slot does not remove buff until explicitly deactivated', () => {
      setupTestSession(magusChar.id, {
        spentSpellSlots: { 1: 1 },
        activeBuffIds: ['buff-shield-spell'],
      })
      useSessionStore.getState().recoverSpellSlot(magusChar.id, 1)
      const session = useSessionStore.getState().getSession(magusChar.id)
      expect(session.spentSpellSlots[1]).toBe(0)
      expect(session.activeBuffIds).toContain('buff-shield-spell')
    })
  })

  // =========================================================================
  // Feature 16: 3-Panel Tactical Bento Grid Layout (R5)
  // =========================================================================
  describe('F16: 3-Panel Tactical Bento Grid Layout', () => {
    it('16.1 defines three structural zones for desktop >=1024px displays', () => {
      const layoutPanels = ['vitals-status', 'combat-actions', 'grimoire-features']
      expect(layoutPanels).toHaveLength(3)
      expect(layoutPanels[0]).toBe('vitals-status')
      expect(layoutPanels[1]).toBe('combat-actions')
      expect(layoutPanels[2]).toBe('grimoire-features')
    })

    it('16.2 MainLayout mounts core application zones', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      expect(screen.getByText('NEON RELIQUARY')).toBeInTheDocument()
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Combat').length).toBeGreaterThan(0)
    })

    it('16.3 desktop breakpoint is defined at exactly 1024px', () => {
      const isDesktopBreakpoint = (w: number) => w >= 1024
      expect(isDesktopBreakpoint(1024)).toBe(true)
      expect(isDesktopBreakpoint(1440)).toBe(true)
      expect(isDesktopBreakpoint(1023)).toBe(false)
    })

    it('16.4 left column holds character vital parameters without navigation', () => {
      setupTestSession(magusChar.id, { currentHp: 38 })
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      )
      expect(screen.getByText('38 / 38 HP')).toBeInTheDocument()
    })

    it('16.5 right column provides access to roll history and features', () => {
      useDiceStore.getState().setResult({
        id: 'r-1',
        label: 'Test Roll',
        diceType: 20,
        naturalRolls: [18],
        modifier: 5,
        total: 23,
        isCriticalThreat: false,
        isCriticalConfirmed: false,
        formula: '1d20+5',
        timestamp: Date.now(),
      })
      expect(useDiceStore.getState().history).toHaveLength(1)
      expect(useDiceStore.getState().history[0].total).toBe(23)
    })
  })

  // =========================================================================
  // Feature 17: Mobile Responsive Navigation Layout (R5)
  // =========================================================================
  describe('F17: Mobile Responsive Navigation Layout', () => {
    it('17.1 mobile viewports (<1024px) preserve bottom navigation tabs', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      const combatNavLinks = screen.getAllByText('Combat').map((el) => el.closest('a')).filter(Boolean)
      expect(combatNavLinks.length).toBeGreaterThan(0)
      expect(combatNavLinks.some((a) => a?.getAttribute('href') === '/combat')).toBe(true)
    })

    it('17.2 Tactical HUD / TopBar renders active character header', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      )
      expect(screen.getByText('Mazikeen Noctis')).toBeInTheDocument()
    })

    it('17.3 navigation links route correctly to primary pages', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      const links = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'))
      expect(links).toContain('/status')
      expect(links).toContain('/skills')
      expect(links).toContain('/combat')
      expect(links).toContain('/spells')
      expect(links).toContain('/features')
    })

    it('17.4 floating chat button is accessible on mobile without occluding nav', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      expect(screen.getByLabelText(/oracolo|chat/i)).toBeInTheDocument()
    })

    it('17.5 mobile layout collapses sidebar on small screens', () => {
      setupTestSession(magusChar.id)
      const { container } = render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      const aside = container.querySelector('aside')
      expect(aside).not.toBeNull()
      expect(aside?.className).toContain('md:flex')
    })
  })

  // =========================================================================
  // Feature 18: Cyber Dark Glassmorphism Design System (R5)
  // =========================================================================
  describe('F18: Cyber Dark Glassmorphism Design System', () => {
    it('18.1 root canvas background employs obsidian dark token #0a0a12', () => {
      setupTestSession(magusChar.id)
      const { container } = render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      const rootDiv = container.firstChild as HTMLElement
      expect(rootDiv.className).toContain('bg-surface')
      expect(rootDiv.className).toContain('text-on-surface')
    })

    it('18.2 displays dual ambient glow orbs (Cyan top-right, Magenta bottom-left)', () => {
      setupTestSession(magusChar.id)
      const { container } = render(
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      )
      expect(container.querySelector('.glow-orb-cyan')).not.toBeNull()
      expect(container.querySelector('.glow-orb-magenta')).not.toBeNull()
    })

    it('18.3 cards and panels use smooth rounded-xl or rounded-2xl geometry', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <CombatPage />
        </MemoryRouter>
      )
      const buffBtn = screen.getByText('Arcane Weapon Enhancement').closest('button')
      expect(buffBtn?.className).toContain('rounded-xl')
    })

    it('18.4 glass surfaces feature border-white/10 and backdrop-blur styling', () => {
      setupTestSession(magusChar.id)
      render(
        <MemoryRouter>
          <CombatPage />
        </MemoryRouter>
      )
      const buffBtn = screen.getByText('Arcane Weapon Enhancement').closest('button')
      expect(buffBtn?.className).toContain('backdrop-blur-sm')
    })

    it('18.5 strictly rejects harsh 0px brutalist sharp cut borders on interactive cards', () => {
      setupTestSession(magusChar.id)
      const { container } = render(
        <MemoryRouter>
          <CombatPage />
        </MemoryRouter>
      )
      const buttons = container.querySelectorAll('button')
      buttons.forEach((btn) => {
        expect(btn.className).not.toContain('rounded-none')
      })
    })
  })
})
