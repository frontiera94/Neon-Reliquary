// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CombatPage } from './CombatPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { SessionState } from '../types/session'
import {
  noorieChar,
  shotrixChar,
  knamChar,
  mazikeenChar,
  monkChar as agelmundChar,
  rogueChar as marianoChar,
} from '../../tests/e2e/fixtures'

const mockSession = (characterId: string, currentHp: number): SessionState => ({
  characterId,
  currentHp,
  tempHp: 0,
  nonlethalDamage: 0,
  spentResources: {},
  spentSpellSlots: {},
  spentPreparedSpells: {},
  preparedSpells: {},
  preparedSpellIds: [],
  activeBuffIds: [],
  conditions: [],
  ammo: {},
  activeSummon: null,
  companionHp: {},
  companionTempHp: {},
  companionConditions: {},
  itemQuantities: {},
  coins: { cp: 0, sp: 0, gp: 0, pp: 0 },
  currentRound: 1,
})

describe('Option A: Native Class Mechanics Integration', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [noorieChar, shotrixChar, knamChar, mazikeenChar, agelmundChar, marianoChar],
      activeCharacterId: 'knam',
    })
    useSessionStore.setState({
      sessions: {
        knam: mockSession('knam', 44),
        noorie: mockSession('noorie', 32),
        'shotrix-blackburn': mockSession('shotrix-blackburn', 28),
        'mazikeen-noctis': mockSession('mazikeen-noctis', 24),
        agelmund: mockSession('agelmund', 36),
        'mariano-cardamomo': mockSession('mariano-cardamomo', 47),
      },
    })
  })

  // 1. Top Panel removal for non-Witch, retention for Witch
  it('does NOT render the top ClassMechanicsPanel for Knam, but DOES render Hex Weave for Mazikeen', () => {
    // 1a. Knam
    const { unmount } = render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // The top panel heading "Class Mechanics Panel" or "Bloodrage & Aberrant Lineage" should NOT be at the top
    expect(screen.queryByText(/bloodrage & aberrant lineage/i)).not.toBeInTheDocument()
    unmount()

    // 1b. Mazikeen
    useCharacterStore.setState({ activeCharacterId: 'mazikeen-noctis' })
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/hex weave & cackle/i)).toBeInTheDocument()
    expect(screen.getByText(/cd fatture: 17/i)).toBeInTheDocument()
  })

  // 2. Knam (Bloodrager) native integration in Buffs & Effects
  it('Knam toggles Bloodrage in Buffs & Effects with HP shift, Aberrant reach, Bite unlock, and fatigue lifecycle', () => {
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // Before Bloodrage: 44 HP, Bite (Ring of Rat Fangs) is not displayed
    expect(screen.queryByText(/ring of rat fangs/i)).not.toBeInTheDocument()

    // Find and click Bloodrage in Buffs & Effects
    const bloodrageBtn = screen.getByText(/bloodrage/i).closest('button')
    expect(bloodrageBtn).not.toBeNull()
    fireEvent.click(bloodrageBtn!)

    // Bloodrage is now active: HP shifted (+8 for Lv 4 = 52)
    const activeSession = useSessionStore.getState().getSession('knam')
    expect(activeSession.currentHp).toBe(52)
    expect(screen.getByText(/portata 3m \(aberrante\)/i)).toBeInTheDocument()
    expect(screen.getAllByText(/ring of rat fangs/i).length).toBeGreaterThanOrEqual(1)

    // Exit Bloodrage
    fireEvent.click(bloodrageBtn!)

    // Now fatigued, HP returned to 44
    const exitedSession = useSessionStore.getState().getSession('knam')
    expect(exitedSession.currentHp).toBe(44)
    expect(exitedSession.conditions).toContain('fatigued')
    expect(screen.getByText(/affaticato: impossibile rientrare in ira/i)).toBeInTheDocument()

    // 1-click remove fatigue
    const clearFatigueBtn = screen.getByRole('button', { name: /rimuovi affaticato/i })
    fireEvent.click(clearFatigueBtn)
    expect(useSessionStore.getState().getSession('knam').conditions).not.toContain('fatigued')
  })

  // 3. Agelmund (Monk) native integration in Buffs, WeaponCard, and DailyResources
  it('Agelmund uses Ki Defense toggle, Wholeness of Body healing, and Stunning Fist on Unarmed Strike', () => {
    useCharacterStore.setState({ activeCharacterId: 'agelmund' })
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // Buffs & Effects includes Ki Defense and Ki Extra Flurry
    const kiDefBtn = screen.getByText(/^ki defense$/i).closest('button')
    expect(kiDefBtn).not.toBeNull()
    fireEvent.click(kiDefBtn!)

    // Ki Defense activated: spends 1 Ki from ki-pool
    const monkSess = useSessionStore.getState().getSession('agelmund')
    expect(monkSess.spentResources['ki-pool']).toBe(1)
    expect(monkSess.classMechanics?.monk?.kiDefenseRounds).toBe(1)

    // Wholeness of Body button in DailyResourcePips next to ki-pool
    const wholenessBtn = screen.getByRole('button', { name: /wholeness \(2 ki\)/i })
    expect(wholenessBtn).toBeInTheDocument()
    fireEvent.click(wholenessBtn)

    // Ki-pool spent increased by 2
    expect(useSessionStore.getState().getSession('agelmund').spentResources['ki-pool']).toBe(3)

    // Stunning Fist buttons on Unarmed Strike card
    const stunBtn = screen.getByRole('button', { name: /stunned \(cd 14\)/i })
    expect(stunBtn).toBeInTheDocument()
    fireEvent.click(stunBtn)
    expect(useSessionStore.getState().getSession('agelmund').classMechanics?.monk?.stunningFistDeclared).toBe('stunned')

    // Jabbing Style +1d6 button
    expect(screen.getByRole('button', { name: /\+1d6 jabbing style/i })).toBeInTheDocument()
  })

  // 4. Shotrix (Magus) native integration on WeaponCard and Spell Combat
  it('Shotrix quick-arms Spellstrike on weapon card and uses Defensive Sacrifice in Buffs', () => {
    useCharacterStore.setState({ activeCharacterId: 'shotrix-blackburn' })
    useSessionStore.setState({
      sessions: {
        'shotrix-blackburn': {
          ...mockSession('shotrix-blackburn', 28),
          preparedSpells: { 'spell-shocking-grasp': 2 },
          preparedSpellIds: ['spell-shocking-grasp', 'spell-shocking-grasp'],
        },
      },
    })

    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // Quick-arm Shocking Grasp on Rapier card
    const quickArmButtons = screen.getAllByRole('button', { name: /shocking grasp/i })
    expect(quickArmButtons.length).toBeGreaterThan(0)
    fireEvent.click(quickArmButtons[0])

    // Held charge badge is now visible on the weapon card
    expect(screen.getAllByText(/spellstrike: shocking grasp/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/\+3 vs metallo|\+3 vs metal/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: /tira & scarica|roll & discharge/i }).length).toBeGreaterThanOrEqual(1)

    // Spell Combat toggle in Buffs & Effects
    const spellCombatBtn = screen.getByText(/spell combat/i).closest('button')
    fireEvent.click(spellCombatBtn!)

    // Defensive sacrifice slider (-0 to -4) appears under Spell Combat
    expect(screen.getByText(/sacrificio difensivo:/i)).toBeInTheDocument()
    const sac2Btn = screen.getByRole('button', { name: /^-2$/ })
    fireEvent.click(sac2Btn)
    expect(useSessionStore.getState().getSession('shotrix-blackburn').classMechanics?.magus?.defensiveCastingSacrifice).toBe(2)
  })

  // 5. Noorie (Druid) native Wild Shape preset selector in Buffs & Effects
  it('Noorie activates Wild Shape Wolf form from Buffs & Effects and replaces humanoid attacks', () => {
    useCharacterStore.setState({ activeCharacterId: 'noorie' })
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // Wild Shape activator in Buffs & Effects
    const activateBtn = screen.getByRole('button', { name: /attiva/i })
    expect(activateBtn).toBeInTheDocument()
    fireEvent.click(activateBtn)

    // Form active chip in Buffs & Effects
    expect(screen.getByText(/wild shape: wolf \(medium\)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ritorna umanoide/i })).toBeInTheDocument()

    // Attacks list now shows Wolf natural attack (Bite)
    expect(screen.getByText(/^bite$/i)).toBeInTheDocument()

    // Revert to humanoid form
    fireEvent.click(screen.getByRole('button', { name: /ritorna umanoide/i }))
    expect(screen.queryByText(/^bite$/i)).not.toBeInTheDocument()
  })

  // 6. Mariano (Rogue) native Debilitating Injury and Underhanded in ContextualCombatFeatures
  it('Mariano uses Underhanded 18 flat sneak damage and Debilitating Injury reminder', () => {
    useCharacterStore.setState({ activeCharacterId: 'mariano-cardamomo' })
    render(
      <MemoryRouter>
        <CombatPage />
      </MemoryRouter>
    )

    // Expand combat features if collapsed or inspect rogue tactics
    expect(screen.getByText(/unchained rogue tactics/i)).toBeInTheDocument()

    // 1-click Underhanded (18 flat sneak damage)
    const underhandedBtn = screen.getByRole('button', { name: /18 flat sneak/i })
    expect(underhandedBtn).toBeInTheDocument()
    fireEvent.click(underhandedBtn)
    expect(underhandedBtn).toBeDisabled()

    // Restore Underhanded
    const restoreBtn = screen.getByRole('button', { name: /ripristina/i })
    fireEvent.click(restoreBtn)
    expect(underhandedBtn).not.toBeDisabled()

    // Debilitating Injury target reminder
    const applyInjuryBtn = screen.getByRole('button', { name: /applica/i })
    fireEvent.click(applyInjuryBtn)
    expect(screen.getByText(/bewildered su bersaglio/i)).toBeInTheDocument()
  })
})
