// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TopBar } from './TopBar'
import { useCharacterStore } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import type { FullCharacter } from '../../store/useCharacterStore'

const mockChar1: FullCharacter = {
  id: 'char-1',
  name: 'Mazikeen Noctis',
  class: 'Magus (Kensai)',
  level: 4,
  race: 'Tiefling',
  alignment: 'True Neutral',
  maxHp: 38,
  initiativeBonus: 7,
  speed: 30,
  abilities: { str: 10, dex: 18, con: 14, int: 18, wis: 12, cha: 8 },
  armorClass: {
    total: 18,
    touch: 14,
    flatFooted: 14,
    armorBonus: 0,
    shieldBonus: 0,
    dexBonus: 4,
    naturalArmor: 0,
    deflection: 0,
    misc: 4,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: {
    fort: 6,
    ref: 5,
    will: 5,
    fortBase: 4,
    refBase: 1,
    willBase: 4,
  },
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

const mockChar2: FullCharacter = {
  id: 'char-2',
  name: 'Noorie',
  class: 'Hunter',
  level: 4,
  race: 'Human',
  alignment: 'Neutral Good',
  maxHp: 34,
  initiativeBonus: 3,
  speed: 30,
  abilities: { str: 14, dex: 16, con: 14, int: 10, wis: 16, cha: 10 },
  armorClass: {
    total: 17,
    touch: 13,
    flatFooted: 14,
    armorBonus: 4,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: {
    fort: 6,
    ref: 7,
    will: 4,
    fortBase: 4,
    refBase: 4,
    willBase: 1,
  },
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

describe('TopBar component', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [mockChar1, mockChar2],
      activeCharacterId: 'char-1',
    })
    useSessionStore.setState({
      sessions: {
        'char-1': {
          characterId: 'char-1',
          currentHp: 28,
          tempHp: 0,
          nonlethalDamage: 0,
          conditions: ['shaken'],
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
  })

  it('renders app title and active character details', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    )

    expect(screen.getByText('NEON RELIQUARY')).toBeInTheDocument()
    expect(screen.getByText('Mazikeen Noctis')).toBeInTheDocument()
    expect(screen.getByText(/Level 4 Magus \(Kensai\)/i)).toBeInTheDocument()
  })

  it('displays current and max HP and active condition badge', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    )

    expect(screen.getByText('28 / 38 HP')).toBeInTheDocument()
    expect(screen.getByText('shaken')).toBeInTheDocument()
  })

  it('cycles character when next character button is clicked', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    )

    const nextBtn = screen.getByRole('button', { name: /Next character/i })
    fireEvent.click(nextBtn)

    expect(useCharacterStore.getState().activeCharacterId).toBe('char-2')
  })

  it('opens and closes settings panel when gear icon is clicked', () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    )

    const settingsIcon = screen.getByText('settings')
    fireEvent.click(settingsIcon)

    // SettingsPanel opens and displays title
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument()

    // Close button in settings panel
    const closeIcon = screen.getByText('close')
    fireEvent.click(closeIcon)
  })
})
