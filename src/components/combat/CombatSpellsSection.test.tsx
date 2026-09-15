// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CombatSpellsSection } from './CombatSpellsSection'
import type { Spell, SpellSlot } from '../../types/resources'
import type { AbilityScore } from '../../types/character'

const mockAbilities: AbilityScore = {
  str: 10, // mod 0
  dex: 18, // mod +4
  con: 14, // mod +2
  int: 18, // mod +4
  wis: 12, // mod +1
  cha: 8,  // mod -1
}

const mockSpellSlots: SpellSlot[] = [
  { level: 1, total: 3 },
  { level: 2, total: 2 },
]

const mockSpells: Spell[] = [
  {
    id: 'spell-ray-of-frost',
    name: 'Ray of Frost',
    level: 0,
    school: 'Evocation',
    castingTime: '1 standard action',
    range: 'Close (25 ft.)',
    duration: 'Instantaneous',
    spellResistance: true,
    components: 'V, S',
    description: 'Ray deals 1d3 cold damage.',
    attackType: 'rangedTouch',
    damageDice: '1d3',
  },
  {
    id: 'spell-detect-magic',
    name: 'Detect Magic',
    level: 0,
    school: 'Divination',
    castingTime: '1 standard action',
    range: '60 ft.',
    duration: 'Concentration, up to 1 min./level',
    spellResistance: false,
    components: 'V, S',
    description: 'Detects all spells and magic items within range.',
  },
  {
    id: 'spell-shocking-grasp',
    name: 'Shocking Grasp',
    level: 1,
    school: 'Evocation',
    castingTime: '1 standard action',
    range: 'Touch',
    duration: 'Instantaneous',
    savingThrow: 'None',
    spellResistance: true,
    components: 'V, S',
    description: 'Touch attack deals 1d6/level electricity damage.',
    attackType: 'meleeTouch',
    damageDice: '4d6',
  },
  {
    id: 'spell-shield',
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 standard action',
    range: 'Personal',
    duration: '1 min./level',
    spellResistance: false,
    components: 'V, S',
    description: 'Invisible disc gives +4 shield bonus to AC.',
  },
  {
    id: 'spell-magic-missile',
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 standard action',
    range: 'Medium (100 ft. + 10 ft./level)',
    duration: 'Instantaneous',
    spellResistance: true,
    components: 'V, S',
    description: 'Unerring missiles of magical force.',
    damageDice: '2d4',
    damageBonus: 2,
  },
]

describe('CombatSpellsSection', () => {
  const mockOpenRoll = vi.fn()
  const mockOnSpendSlot = vi.fn()
  const mockOnRecoverSlot = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderComponent(propsOverrides: Partial<Parameters<typeof CombatSpellsSection>[0]> = {}) {
    return render(
      <CombatSpellsSection
        spells={mockSpells}
        spellSlots={mockSpellSlots}
        preparedSpellIds={['spell-shocking-grasp', 'spell-shield']}
        spentSpellSlots={{ 1: 0, 2: 0 }}
        charClass="Magus"
        charLevel={4}
        abilities={mockAbilities}
        baseAttackBonus={[3]}
        spellFailureChance={0}
        feats={[]}
        openRoll={mockOpenRoll}
        onSpendSlot={mockOnSpendSlot}
        onRecoverSlot={mockOnRecoverSlot}
        {...propsOverrides}
      />
    )
  }

  it('renders prepared spells and cantrips while hiding unprepared spells', () => {
    renderComponent()

    // Header title
    expect(screen.getByText(/Combat Spells & Invocations/i)).toBeInTheDocument()

    // Cantrips (level 0) are always available even if not explicitly in preparedSpellIds
    expect(screen.getByText('Ray of Frost')).toBeInTheDocument()
    expect(screen.getByText('Detect Magic')).toBeInTheDocument()

    // Level 1 prepared spells
    expect(screen.getByText('Shocking Grasp')).toBeInTheDocument()
    expect(screen.getByText('Shield')).toBeInTheDocument()

    // Magic Missile is NOT in preparedSpellIds, so it should not be displayed
    expect(screen.queryByText('Magic Missile')).not.toBeInTheDocument()
  })

  it('displays cantrips clearly as at-will without consuming slots', () => {
    renderComponent()

    // Ray of Frost is a cantrip -> has At-will badge
    const atWillBadges = screen.getAllByText(/at-will/i)
    expect(atWillBadges.length).toBeGreaterThan(0)

    // Click Cast on Ray of Frost
    const castRayBtn = screen.getByRole('button', { name: /cast ray of frost/i })
    fireEvent.click(castRayBtn)

    // onSpendSlot MUST NOT be called for level 0 cantrips
    expect(mockOnSpendSlot).not.toHaveBeenCalled()

    // Touch attack roll should be triggered
    expect(mockOpenRoll).toHaveBeenCalledTimes(1)
  })

  it('consumes a spell slot when casting a level > 0 spell', () => {
    renderComponent()

    // Cast Shocking Grasp (Level 1)
    const castShockingBtn = screen.getByRole('button', { name: /cast shocking grasp/i })
    fireEvent.click(castShockingBtn)

    // onSpendSlot should be called with level 1 and max 3
    expect(mockOnSpendSlot).toHaveBeenCalledWith(1, 3)

    // And since it is an attack spell, openRoll should also be called for the melee touch attack
    expect(mockOpenRoll).toHaveBeenCalled()
  })

  it('disables the Cast button when all slots for that level are spent', () => {
    renderComponent({
      spentSpellSlots: { 1: 3 }, // all 3 slots spent
    })

    // Cast button for Shocking Grasp should now say "No Slots" and be disabled
    const castBtn = screen.getByRole('button', { name: /cast shocking grasp/i })
    expect(castBtn).toBeDisabled()
    expect(castBtn).toHaveTextContent(/no slots/i)

    fireEvent.click(castBtn)
    expect(mockOnSpendSlot).not.toHaveBeenCalled()
  })

  it('allows restoring a spent slot (+1 slot) from the spell card', () => {
    renderComponent({
      spentSpellSlots: { 1: 1 }, // 1 slot spent
    })

    // Card should have a +1 Slot restore button for the spell
    const cardRestoreBtn = screen.getByRole('button', { name: /ripristina slot per shocking grasp/i })
    expect(cardRestoreBtn).toBeInTheDocument()

    fireEvent.click(cardRestoreBtn)
    expect(mockOnRecoverSlot).toHaveBeenCalledWith(1)
  })

  it('allows restoring a spent slot (+1) from the level filter bar', () => {
    renderComponent({
      spentSpellSlots: { 1: 2 }, // 2 slots spent
    })

    // Level bar should have a +1 button for level 1
    const levelBarRestoreBtn = screen.getByRole('button', { name: /ripristina slot livello 1 dalla barra/i })
    expect(levelBarRestoreBtn).toBeInTheDocument()

    // Click the level bar restore button
    fireEvent.click(levelBarRestoreBtn)
    expect(mockOnRecoverSlot).toHaveBeenCalledWith(1)
  })

  it('triggers concentration check roll with correct CL + Casting Mod formula', () => {
    renderComponent({
      charClass: 'Magus', // uses INT
      charLevel: 4,
      abilities: { ...mockAbilities, int: 18 }, // INT 18 -> mod +4
    })

    // Caster Level 4 + INT Mod 4 = +8
    const concBtn = screen.getByRole('button', { name: /concentration \(\+8\)/i })
    expect(concBtn).toBeInTheDocument()

    fireEvent.click(concBtn)

    expect(mockOpenRoll).toHaveBeenCalledWith({
      diceType: 20,
      count: 1,
      modifier: 8,
      label: 'Concentration Check',
      breakdown: [
        { label: 'Caster Level', value: 4 },
        { label: 'INT Mod', value: 4 },
      ],
    })
  })

  it('provides defensive concentration button when character has Combat Casting feat', () => {
    renderComponent({
      charClass: 'Magus',
      charLevel: 4,
      abilities: { ...mockAbilities, int: 18 },
      feats: [{ id: 'feat-cc', name: 'Combat Casting' }],
    })

    // Normal Concentration (+8) and Defensive (+12)
    const defBtn = screen.getByRole('button', { name: /defensive \(\+12\)/i })
    expect(defBtn).toBeInTheDocument()

    fireEvent.click(defBtn)

    expect(mockOpenRoll).toHaveBeenCalledWith({
      diceType: 20,
      count: 1,
      modifier: 12,
      label: 'Concentration (Defensive)',
      breakdown: [
        { label: 'Caster Level', value: 4 },
        { label: 'INT Mod', value: 4 },
        { label: 'Combat Casting', value: 4 },
      ],
    })
  })

  it('triggers touch attack roll with BAB + STR for meleeTouch and BAB + DEX for rangedTouch', () => {
    renderComponent({
      baseAttackBonus: [3],
      abilities: { ...mockAbilities, str: 10, dex: 18 }, // STR mod 0, DEX mod +4
    })

    // Shocking Grasp (Melee Touch): BAB 3 + STR 0 = 3
    const meleeTouchBtn = screen.getByRole('button', { name: /touch \(\+3\)/i })
    fireEvent.click(meleeTouchBtn)

    expect(mockOpenRoll).toHaveBeenCalledWith(
      expect.objectContaining({
        diceType: 20,
        modifier: 3,
        label: expect.stringContaining('Melee Touch'),
      })
    )

    // Ray of Frost (Ranged Touch): BAB 3 + DEX 4 = 7
    const rangedTouchBtn = screen.getByRole('button', { name: /r\.touch \(\+7\)/i })
    fireEvent.click(rangedTouchBtn)

    expect(mockOpenRoll).toHaveBeenCalledWith(
      expect.objectContaining({
        diceType: 20,
        modifier: 7,
        label: expect.stringContaining('Ranged Touch'),
      })
    )
  })

  it('displays Arcane Spell Failure (ASF) alert badges and banners when character has ASF > 0', () => {
    renderComponent({
      spellFailureChance: 15,
    })

    // Header badge
    expect(screen.getAllByText(/ASF 15%/i).length).toBeGreaterThanOrEqual(1)

    // Alert banner
    expect(screen.getByText(/Arcane Spell Failure: 15%/i)).toBeInTheDocument()

    // Somatic spells show ASF indicator
    const asfBadges = screen.getAllByTitle(/somatic component/i)
    expect(asfBadges.length).toBeGreaterThan(0)
  })

  it('does not display ASF warnings when spellFailureChance is 0', () => {
    renderComponent({
      spellFailureChance: 0,
    })

    expect(screen.queryByText(/ASF/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Arcane Spell Failure:/i)).not.toBeInTheDocument()
  })

  it('filters spells by level when clicking level filter buttons', () => {
    renderComponent()

    // Click "Cantrips" filter
    const cantripFilterBtn = screen.getByRole('button', { name: /^cantrips$/i })
    fireEvent.click(cantripFilterBtn)

    expect(screen.getByText('Ray of Frost')).toBeInTheDocument()
    expect(screen.getByText('Detect Magic')).toBeInTheDocument()
    expect(screen.queryByText('Shocking Grasp')).not.toBeInTheDocument()
    expect(screen.queryByText('Shield')).not.toBeInTheDocument()

    // Click "Lvl 1" filter
    const lvl1FilterBtn = screen.getByRole('button', { name: /^lvl 1/i })
    fireEvent.click(lvl1FilterBtn)

    expect(screen.queryByText('Ray of Frost')).not.toBeInTheDocument()
    expect(screen.getByText('Shocking Grasp')).toBeInTheDocument()
    expect(screen.getByText('Shield')).toBeInTheDocument()

    // Click "All Levels"
    const allBtn = screen.getByRole('button', { name: /all levels/i })
    fireEvent.click(allBtn)

    expect(screen.getByText('Ray of Frost')).toBeInTheDocument()
    expect(screen.getByText('Shocking Grasp')).toBeInTheDocument()
  })

  it('filters spells dynamically with the search input', () => {
    renderComponent()

    const searchInput = screen.getByPlaceholderText(/search combat spells/i)
    expect(searchInput).toBeInTheDocument()

    // Type "frost" -> only Ray of Frost should remain
    fireEvent.change(searchInput, { target: { value: 'frost' } })
    expect(screen.getByText('Ray of Frost')).toBeInTheDocument()
    expect(screen.queryByText('Shocking Grasp')).not.toBeInTheDocument()
    expect(screen.queryByText('Detect Magic')).not.toBeInTheDocument()

    // Clear search using clear button
    const clearBtn = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearBtn)
    expect(screen.getByText('Ray of Frost')).toBeInTheDocument()
    expect(screen.getByText('Shocking Grasp')).toBeInTheDocument()

    // Search by school e.g. "Abjuration" -> Shield
    fireEvent.change(searchInput, { target: { value: 'abjuration' } })
    expect(screen.getByText('Shield')).toBeInTheDocument()
    expect(screen.queryByText('Ray of Frost')).not.toBeInTheDocument()
  })

  it('allows sorting spells by Attack / Dmg and Alphabetical', () => {
    renderComponent()

    // Sort Attack / Dmg first
    const atkSortBtn = screen.getByRole('button', { name: /attack \/ dmg/i })
    fireEvent.click(atkSortBtn)

    // Spells with attackType or damageDice (Ray of Frost, Shocking Grasp) come before Shield & Detect Magic
    const headings = screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent)
    const shockIdx = headings.indexOf('Shocking Grasp')
    const rayIdx = headings.indexOf('Ray of Frost')
    const shieldIdx = headings.indexOf('Shield')
    const detectIdx = headings.indexOf('Detect Magic')

    expect(shockIdx).toBeLessThan(shieldIdx)
    expect(rayIdx).toBeLessThan(detectIdx)

    // Sort A-Z
    const azSortBtn = screen.getByRole('button', { name: /a-z/i })
    fireEvent.click(azSortBtn)

    const azHeadings = screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent)
    expect(azHeadings).toEqual(['Detect Magic', 'Ray of Frost', 'Shield', 'Shocking Grasp'])
  })

  it('pins favorite spells to the top and allows unpinning', () => {
    renderComponent()

    // Pin Shocking Grasp
    const pinShockingBtn = screen.getByRole('button', { name: /pin shocking grasp/i })
    fireEvent.click(pinShockingBtn)

    // Shocking Grasp is now pinned, its button aria-label changes to Unpin
    expect(screen.getByRole('button', { name: /unpin shocking grasp/i })).toBeInTheDocument()

    // When pinned, it should appear before unpinned spells even if they are lower level
    const headings = screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent)
    expect(headings[0]).toBe('Shocking Grasp')

    // Unpin it
    const unpinShockingBtn = screen.getByRole('button', { name: /unpin shocking grasp/i })
    fireEvent.click(unpinShockingBtn)
    expect(screen.getByRole('button', { name: /pin shocking grasp/i })).toBeInTheDocument()
  })
})

