// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StatusPage } from './StatusPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { WILD_SHAPE_PRESETS } from '../data/wild-shape-presets'
import type { FullCharacter } from '../store/useCharacterStore'
import type { BuffToggle } from '../types/combat'

const testChar: FullCharacter = {
  id: 'status-test-char',
  name: 'Status Tester',
  class: 'Druid',
  level: 4,
  race: 'Elf',
  alignment: 'Neutral Good',
  maxHp: 32,
  initiativeBonus: 3,
  speed: 30,
  abilities: { str: 12, dex: 16, con: 14, int: 10, wis: 16, cha: 10 },
  armorClass: {
    total: 16,
    touch: 13,
    flatFooted: 13,
    armorBonus: 3,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: { fort: 6, ref: 4, will: 7, fortBase: 4, refBase: 1, willBase: 4 },
  skills: [],
  feats: [{ id: 'natural-spell', index: 0, name: 'Natural Spell', shortDesc: 'Cast while wild shaped', fullDesc: 'Cast while wild shaped' }],
  weapons: [],
  buffs: [],
  dailyResources: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

describe('StatusPage', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [testChar],
      activeCharacterId: 'status-test-char',
    })
    useSessionStore.setState({
      sessions: {
        'status-test-char': {
          characterId: 'status-test-char',
          currentHp: 32,
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
  })

  it('renders "No character selected" if activeCharacterId is null', () => {
    useCharacterStore.setState({ activeCharacterId: null })
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    )
    expect(screen.getByText('No character selected')).toBeInTheDocument()
  })

  it('renders hit points and base defense values', () => {
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Vitality Core')).toBeInTheDocument()
    expect(screen.getByText('32')).toBeInTheDocument()
    expect(screen.getByText('/ 32')).toBeInTheDocument()
    expect(screen.getByText('Armor Class')).toBeInTheDocument()
  })

  it('applies damage when Damage button is clicked', () => {
    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    )
    const damageBtn = screen.getByRole('button', { name: /decrease hp/i })
    fireEvent.click(damageBtn)

    const session = useSessionStore.getState().getSession('status-test-char')
    expect(session.currentHp).toBe(31)
  })

  it('applies healing when Heal button is clicked', () => {
    useSessionStore.setState({
      sessions: {
        'status-test-char': {
          ...useSessionStore.getState().getSession('status-test-char'),
          currentHp: 20,
        },
      },
    })

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    )
    const healBtn = screen.getByRole('button', { name: /increase hp/i })
    fireEvent.click(healBtn)

    const session = useSessionStore.getState().getSession('status-test-char')
    expect(session.currentHp).toBe(21)
  })

  it('recalculates dynamic max HP when Constitution modifier changes', () => {
    // Add a buff granting +4 Con (modifier increases from +2 to +4, delta +2)
    // Level 4 druid -> +2 * 4 = +8 Max HP -> 32 + 8 = 40 Max HP
    const conBuff: BuffToggle = {
      id: 'buff-bear-endurance',
      name: "Bear's Endurance",
      description: '+4 Con',
      active: true,
      attackMod: 0,
      damageMod: 0,
      acMod: 0,
      abilityMods: { con: 4 },
      color: 'primary',
    }

    useCharacterStore.setState({
      characters: [{
        ...testChar,
        buffs: [conBuff],
      }],
      activeCharacterId: 'status-test-char',
    })

    useSessionStore.setState({
      sessions: {
        'status-test-char': {
          ...useSessionStore.getState().getSession('status-test-char'),
          activeBuffIds: ['buff-bear-endurance'],
        },
      },
    })

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    )

    expect(screen.getByText('/ 40')).toBeInTheDocument()
  })

  it('reflects Wild Shape modifications on abilities and armor class', () => {
    useSessionStore.setState({
      sessions: {
        'status-test-char': {
          ...useSessionStore.getState().getSession('status-test-char'),
          classMechanics: {
            druid: {
              active: true,
              formId: 'wolf',
              activeForm: WILD_SHAPE_PRESETS.wolf,
            },
          },
        },
      },
    })

    render(
      <MemoryRouter>
        <StatusPage />
      </MemoryRouter>
    )

    // In beast shape, armor is melded: base 10 + dex 3 + natural armor 2 = 15 AC
    expect(screen.getByText('15')).toBeInTheDocument()
  })
})
