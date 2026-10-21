// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SkillsPage } from './SkillsPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import type { DiceRoll } from '../types/dice'
import type { FullCharacter } from '../store/useCharacterStore'
import type { Skill } from '../types/skills'

const sampleSkills: Skill[] = [
  { id: 'acrobatics', name: 'Acrobatics', ability: 'dex', ranks: 3, classSkill: true, miscBonus: 0, trained: true, armorCheckPenalty: false },
  { id: 'climb', name: 'Climb', ability: 'str', ranks: 0, classSkill: false, miscBonus: 0, trained: false, armorCheckPenalty: false },
  { id: 'diplomacy', name: 'Diplomacy', ability: 'cha', ranks: 2, classSkill: true, miscBonus: 0, trained: true, armorCheckPenalty: false },
  { id: 'perception', name: 'Perception', ability: 'wis', ranks: 4, classSkill: true, miscBonus: 0, trained: true, armorCheckPenalty: false },
  { id: 'stealth', name: 'Stealth', ability: 'dex', ranks: 1, classSkill: true, miscBonus: 0, trained: true, armorCheckPenalty: false },
  { id: 'swim', name: 'Swim', ability: 'str', ranks: 0, classSkill: false, miscBonus: 0, trained: false, armorCheckPenalty: false },
]

const testChar: FullCharacter = {
  id: 'skills-test-char',
  name: 'Skills Tester',
  class: 'Rogue',
  level: 4,
  race: 'Human',
  alignment: 'Neutral Good',
  maxHp: 30,
  initiativeBonus: 3,
  speed: 30,
  abilities: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 12 },
  armorClass: {
    total: 15,
    touch: 13,
    flatFooted: 12,
    armorBonus: 2,
    shieldBonus: 0,
    dexBonus: 3,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: { fort: 2, ref: 7, will: 1, fortBase: 1, refBase: 4, willBase: 1 },
  skills: sampleSkills,
  feats: [],
  weapons: [],
  buffs: [],
  dailyResources: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

describe('SkillsPage', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [testChar],
      activeCharacterId: 'skills-test-char',
    })
    useSessionStore.setState({
      sessions: {
        'skills-test-char': {
          characterId: 'skills-test-char',
          currentHp: 30,
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

  it('renders "No character selected" if activeCharacter is null', () => {
    useCharacterStore.setState({ activeCharacterId: null })
    render(<SkillsPage />)
    expect(screen.getByText('No character selected')).toBeInTheDocument()
  })

  it('renders skills in vertical alphabetical order across columns', () => {
    const { container } = render(<SkillsPage />)

    // Find the columns inside the skills grid
    const columns = container.querySelectorAll('.grid > div.flex-col')
    expect(columns).toHaveLength(2)

    // Left column: first half (Acrobatics, Climb, Diplomacy)
    const leftSkills = Array.from(columns[0].querySelectorAll('p.font-headline')).map((el) => el.textContent)
    expect(leftSkills).toEqual(['Acrobatics', 'Climb', 'Diplomacy'])

    // Right column: second half (Perception, Stealth, Swim)
    const rightSkills = Array.from(columns[1].querySelectorAll('p.font-headline')).map((el) => el.textContent)
    expect(rightSkills).toEqual(['Perception', 'Stealth', 'Swim'])
  })

  it('filters skills by search query', () => {
    render(<SkillsPage />)
    const input = screen.getByPlaceholderText('Search skills...')
    fireEvent.change(input, { target: { value: 'clim' } })

    expect(screen.getByText('Climb')).toBeInTheDocument()
    expect(screen.queryByText('Acrobatics')).not.toBeInTheDocument()
    expect(screen.queryByText('Perception')).not.toBeInTheDocument()
  })

  it('filters by Trained Only', () => {
    render(<SkillsPage />)
    const trainedBtn = screen.getByRole('button', { name: /trained only/i })
    fireEvent.click(trainedBtn)

    // Trained skills should remain
    expect(screen.getByText('Acrobatics')).toBeInTheDocument()
    expect(screen.getByText('Diplomacy')).toBeInTheDocument()
    expect(screen.getByText('Perception')).toBeInTheDocument()
    expect(screen.getByText('Stealth')).toBeInTheDocument()

    // Untrained skills (ranks 0, trained: false) should be hidden
    expect(screen.queryByText('Climb')).not.toBeInTheDocument()
    expect(screen.queryByText('Swim')).not.toBeInTheDocument()
  })

  it('shows empty state when no skills match', () => {
    render(<SkillsPage />)
    const input = screen.getByPlaceholderText('Search skills...')
    fireEvent.change(input, { target: { value: 'nonexistent skill' } })

    expect(screen.getByText('No skills found')).toBeInTheDocument()
  })

  it('opens roll modal when skill button is clicked', () => {
    let rollCalledWith: DiceRoll | null = null
    useDiceStore.setState({
      openRoll: (args) => {
        rollCalledWith = args
      },
    })

    render(<SkillsPage />)
    const acrobaticsBtn = screen.getByRole('button', { name: /roll acrobatics/i })
    fireEvent.click(acrobaticsBtn)

    expect(rollCalledWith).not.toBeNull()
    expect((rollCalledWith as unknown as DiceRoll)?.label).toBe('Acrobatics Check')
  })
})
