// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClassMechanicsPanel } from './ClassMechanicsPanel'
import { useSessionStore } from '../../store/useSessionStore'
import { useCharacterStore } from '../../store/useCharacterStore'
import type { SessionState } from '../../types/session'
import {
  noorieChar,
  shotrixChar,
  knamChar,
  mazikeenChar,
  monkChar as agelmundChar,
  rogueChar as marianoChar,
} from '../../../tests/e2e/fixtures'

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

describe('ClassMechanicsPanel Component', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [noorieChar, shotrixChar, knamChar, mazikeenChar, agelmundChar, marianoChar],
      activeCharacterId: 'noorie',
    })
    useSessionStore.setState({
      sessions: {
        noorie: mockSession('noorie', 32),
        'shotrix-blackburn': mockSession('shotrix-blackburn', 28),
        knam: mockSession('knam', 44),
        'mazikeen-noctis': mockSession('mazikeen-noctis', 24),
        agelmund: mockSession('agelmund', 36),
        'mariano-cardamomo': mockSession('mariano-cardamomo', 47),
      },
    })
  })

  // 1. Unified Turn Button
  it('renders unified "Fine Turno PG" button and advances the round counter', () => {
    render(
      <ClassMechanicsPanel
        char={noorieChar}
        effectiveAbilities={{ scores: noorieChar.abilities, mods: { str: 2, dex: 2, con: 1, int: 0, wis: 4, cha: 0 } }}
      />
    )

    const turnButton = screen.getByRole('button', { name: /fine turno pg/i })
    expect(turnButton).toBeInTheDocument()

    expect(screen.getByText(/round/i)).toHaveTextContent('Round 1 di combattimento')
    fireEvent.click(turnButton)
    expect(screen.getByText(/round/i)).toHaveTextContent('Round 2 di combattimento')
  })

  // 2. Noorie (Druid)
  it('renders Noorie Wild Shape Beast Shape I selector and activates Wolf form', () => {
    render(
      <ClassMechanicsPanel
        char={noorieChar}
        effectiveAbilities={{ scores: noorieChar.abilities, mods: { str: 2, dex: 2, con: 1, int: 0, wis: 4, cha: 0 } }}
      />
    )

    expect(screen.getByText(/wild shape \(beast shape i\)/i)).toBeInTheDocument()
    const activateBtn = screen.getByRole('button', { name: /attiva wild shape/i })
    expect(activateBtn).toBeInTheDocument()

    fireEvent.click(activateBtn)

    // Form is now active
    expect(screen.getByText(/forma: wolf/i)).toBeInTheDocument()
    expect(screen.getByText(/componenti verbali e somatiche bloccate/i)).toBeInTheDocument()

    const revertBtn = screen.getByRole('button', { name: /ritorna a forma umanoide/i })
    expect(revertBtn).toBeInTheDocument()
    fireEvent.click(revertBtn)

    expect(screen.queryByText(/forma: wolf/i)).not.toBeInTheDocument()
  })

  // 3. Shotrix (Magus)
  it('renders Shotrix Spellstrike quick-arms and Spell Combat options', () => {
    render(
      <ClassMechanicsPanel
        char={shotrixChar}
        effectiveAbilities={{ scores: shotrixChar.abilities, mods: { str: 0, dex: 4, con: 1, int: 3, wis: 0, cha: -1 } }}
      />
    )

    expect(screen.getByText(/magus combat engine/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /shocking grasp/i })).toBeInTheDocument()

    // Arm Shocking Grasp
    fireEvent.click(screen.getByRole('button', { name: /shocking grasp/i }))
    expect(screen.getAllByText(/shocking grasp/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/4d6/i)).toBeInTheDocument()
    expect(screen.getByText(/\+3 txc vs bersaglio in metallo/i)).toBeInTheDocument()

    // Arcane Pool button
    const arcaneBtn = screen.getByRole('button', { name: /potenzia arma/i })
    fireEvent.click(arcaneBtn)
    expect(screen.getAllByText(/arma arcana \+1/i).length).toBeGreaterThan(0)
  })

  // 4. Knam (Bloodrager)
  it('renders Knam Bloodrage activation and handles lethal warning & fatigue', () => {
    render(
      <ClassMechanicsPanel
        char={knamChar}
        effectiveAbilities={{ scores: knamChar.abilities, mods: { str: 4, dex: 2, con: 3, int: 0, wis: 1, cha: 1 } }}
      />
    )

    const rageBtn = screen.getByRole('button', { name: /entra in ira di sangue/i })
    expect(rageBtn).toBeInTheDocument()

    fireEvent.click(rageBtn)

    // Bloodrage active
    expect(screen.getByText(/morso \(ring of rat fangs\): sbloccato/i)).toBeInTheDocument()
    expect(screen.getByText(/portata 3m \(aberrante\)/i)).toBeInTheDocument()

    const exitBtn = screen.getByRole('button', { name: /termina ira di sangue/i })
    fireEvent.click(exitBtn)

    // Now fatigued
    expect(screen.getByText(/affaticato/i)).toBeInTheDocument()
  })

  // 5. Mazikeen (Witch)
  it('renders Mazikeen Hex Weave, DC 17, and Cackle button', () => {
    render(
      <ClassMechanicsPanel
        char={mazikeenChar}
        effectiveAbilities={{ scores: mazikeenChar.abilities, mods: { str: -1, dex: 2, con: 1, int: 5, wis: 1, cha: 0 } }}
      />
    )

    expect(screen.getByText(/cd fatture: 17/i)).toBeInTheDocument()

    // Apply Evil Eye
    const targetInput = screen.getByPlaceholderText(/nome bersaglio/i)
    fireEvent.change(targetInput, { target: { value: 'Goblin Boss' } })

    const applyBtn = screen.getByRole('button', { name: /applica fattura/i })
    fireEvent.click(applyBtn)

    expect(screen.getByText(/goblin boss/i)).toBeInTheDocument()
    expect(screen.getByText(/-2 ac/i)).toBeInTheDocument()

    // Use Cackle
    const cackleBtn = screen.getByRole('button', { name: /cackle/i })
    fireEvent.click(cackleBtn)
    expect(screen.getByText(/cackle già usata questo round/i)).toBeInTheDocument()
  })

  // 6. Agelmund (Monk)
  it('renders Agelmund Ki Pool actions, Stunning Fist DC 14, and Wholeness of Body', () => {
    render(
      <ClassMechanicsPanel
        char={agelmundChar}
        effectiveAbilities={{ scores: agelmundChar.abilities, mods: { str: 3, dex: 3, con: 2, int: 0, wis: 2, cha: -1 } }}
      />
    )

    expect(screen.getByText(/cd stunning fist: 14/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /extra flurry attack/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ki defense/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /wholeness of body/i })).toBeInTheDocument()

    // Activate Ki Defense
    fireEvent.click(screen.getByRole('button', { name: /ki defense/i }))
    expect(screen.getByText(/ki defense \+4 ca/i)).toBeInTheDocument()
  })

  // 7. Mariano (Rogue)
  it('renders Mariano Debilitating Injury badges and Underhanded button', () => {
    render(
      <ClassMechanicsPanel
        char={marianoChar}
        effectiveAbilities={{ scores: marianoChar.abilities, mods: { str: -1, dex: 5, con: 2, int: 2, wis: 0, cha: 1 } }}
      />
    )

    expect(screen.getByText(/\+3 favored class crit confirm daggers/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bewildered/i })).toBeInTheDocument()

    // Apply Debilitating Injury
    const applyInjuryBtn = screen.getByRole('button', { name: /applica promemoria/i })
    fireEvent.click(applyInjuryBtn)

    expect(screen.getByText(/bewildered su bersaglio \(1 r\)/i)).toBeInTheDocument()

    // Underhanded
    const underhandedBtn = screen.getByRole('button', { name: /18 flat sneak damage/i })
    fireEvent.click(underhandedBtn)
    expect(underhandedBtn).toBeDisabled()
  })
})
