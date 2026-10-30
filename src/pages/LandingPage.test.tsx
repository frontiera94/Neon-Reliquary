// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LandingPage } from './LandingPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import type { FullCharacter } from '../store/useCharacterStore'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const testChar: FullCharacter = {
  id: 'test-char-1',
  name: 'Mazikeen Noctis',
  class: 'Witch',
  level: 4,
  race: 'Tiefling',
  alignment: 'Lawful Evil',
  maxHp: 38,
  initiativeBonus: 6,
  speed: 30,
  abilities: { str: 10, dex: 19, con: 16, int: 20, wis: 16, cha: 11 },
  armorClass: {
    total: 15,
    touch: 14,
    flatFooted: 11,
    armorBonus: 1,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [2],
  savingThrows: { fort: 4, ref: 5, will: 7, fortBase: 1, refBase: 1, willBase: 4 },
  skills: [],
  weapons: [],
  buffs: [],
  dailyResources: [],
  feats: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

describe('LandingPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCharacterStore.setState({
      characters: [testChar],
      activeCharacterId: null,
    })
    useSessionStore.setState({
      sessions: {},
    })
  })

  it('renders title, tagline, system ready status, and enter button', () => {
    render(<LandingPage />)

    expect(screen.getByText('NEON')).toBeInTheDocument()
    expect(screen.getByText('RELIQUARY')).toBeInTheDocument()
    expect(screen.getByText('// Pathfinder 1E Tactical Archive')).toBeInTheDocument()
    expect(screen.getByText('reliquary:online')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enter the Reliquary/i })).toBeInTheDocument()
    expect(screen.getByText(/RELICS INDEXED/i)).toBeInTheDocument()
  })

  it('navigates to /characters when clicking ENTER THE RELIQUARY button', () => {
    render(<LandingPage />)

    const enterBtn = screen.getByRole('button', { name: /Enter the Reliquary/i })
    fireEvent.click(enterBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/characters')
  })

  it('navigates to /characters when pressing Enter key', () => {
    render(<LandingPage />)

    fireEvent.keyDown(window, { key: 'Enter' })

    expect(mockNavigate).toHaveBeenCalledWith('/characters')
  })

  it('does not trigger Enter shortcut if focused on an input element', () => {
    render(
      <div>
        <input data-testid="search-input" />
        <LandingPage />
      </div>
    )

    const input = screen.getByTestId('search-input')
    input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not display Resume Session button when activeCharacter is null', () => {
    useCharacterStore.setState({
      activeCharacterId: null,
    })

    render(<LandingPage />)

    expect(screen.queryByRole('button', { name: /Resume session/i })).not.toBeInTheDocument()
  })

  it('displays Resume Session button and navigates to /status when clicked', () => {
    useCharacterStore.setState({
      characters: [testChar],
      activeCharacterId: 'test-char-1',
    })
    useSessionStore.setState({
      sessions: {
        'test-char-1': {
          characterId: 'test-char-1',
          currentHp: 25,
          tempHp: 0,
          nonlethalDamage: 0,
          conditions: [],
          spentResources: {},
          preparedSpellIds: [],
          spentSpellSlots: {},
          activeBuffIds: [],
          customBuffs: [],
          ammo: {},
          activeSummon: null,
          itemQuantities: {},
          coins: { gp: 0, sp: 0, cp: 0 },
        },
      },
    })

    render(<LandingPage />)

    const resumeBtn = screen.getByRole('button', { name: /Resume session with Mazikeen Noctis/i })
    expect(resumeBtn).toBeInTheDocument()
    expect(screen.getByText(/25\/38 HP • Lv 4/i)).toBeInTheDocument()

    fireEvent.click(resumeBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/status')
  })
})
