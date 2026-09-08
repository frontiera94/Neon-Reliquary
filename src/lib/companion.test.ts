import { describe, it, expect, beforeEach } from 'vitest'
import { useSessionStore } from '../store/useSessionStore'
import { useCharacterStore } from '../store/useCharacterStore'
import type { FullCharacter } from '../store/useCharacterStore'
import { COMPANION_PRESETS } from '../data/companion-presets'
import mazeData from '../data/mazikeen-noctis.json'
import noorieData from '../data/noorie.json'

describe('Companion system', () => {
  beforeEach(() => {
    useSessionStore.setState({ sessions: {} })
    useCharacterStore.setState({ characters: [], activeCharacterId: null })
  })

  it('loads Mazikeen with Salem the cat familiar', () => {
    const maze = mazeData as unknown as FullCharacter
    expect(maze.companions).toBeDefined()
    expect(maze.companions?.length).toBeGreaterThan(0)

    const salem = maze.companions?.[0]
    expect(salem?.name).toContain('Salem')
    expect(salem?.species).toBe('Cat')
    expect(salem?.type).toBe('familiar')
    expect(salem?.maxHp).toBe(19)
    expect(salem?.armorClass.total).toBe(17)
    expect(salem?.attacks.some((a) => a.name === 'Bite')).toBe(true)
    expect(salem?.attacks.some((a) => a.name.includes('Touch'))).toBe(true)
    expect(salem?.masterLink?.deliverTouchSpells).toBe(true)
  })

  it('loads Noorie with Ignis the Ash Wolf companion', () => {
    const noorie = noorieData as unknown as FullCharacter
    expect(noorie.companions).toBeDefined()
    expect(noorie.companions?.length).toBeGreaterThan(0)

    const wolf = noorie.companions?.[0]
    expect(wolf?.name).toContain('Ignis')
    expect(wolf?.species).toBe('Wolf')
    expect(wolf?.type).toBe('animal_companion')
    expect(wolf?.maxHp).toBe(26)
    expect(wolf?.speed).toBe('50 ft.')
    expect(wolf?.tricks).toContain('Attack (all creatures)')
    expect(wolf?.tricks).toContain('Guard')
    expect(wolf?.specialQualities.some((q) => q.name.includes('Trip'))).toBe(true)
  })

  it('handles companion HP adjustment and clamping', () => {
    const { adjustCompanionHp } = useSessionStore.getState()
    const charId = 'mazikeen-noctis'
    const compId = 'salem-familiar'
    const maxHp = 19

    // Damage Salem by 5
    adjustCompanionHp(charId, compId, -5, maxHp)
    expect(useSessionStore.getState().getSession(charId).companionHp?.[compId]).toBe(14)

    // Heal Salem by 10 (should clamp to maxHp 19)
    adjustCompanionHp(charId, compId, 10, maxHp)
    expect(useSessionStore.getState().getSession(charId).companionHp?.[compId]).toBe(19)

    // Huge damage
    adjustCompanionHp(charId, compId, -30, maxHp)
    expect(useSessionStore.getState().getSession(charId).companionHp?.[compId]).toBe(-11)
  })

  it('manages companion conditions and temp HP', () => {
    const { toggleCompanionCondition, setCompanionTempHp } = useSessionStore.getState()
    const charId = 'noorie'
    const compId = 'ash-wolf-companion'

    setCompanionTempHp(charId, compId, 5)
    expect(useSessionStore.getState().getSession(charId).companionTempHp?.[compId]).toBe(5)

    toggleCompanionCondition(charId, compId, 'sickened')
    expect(useSessionStore.getState().getSession(charId).companionConditions?.[compId]).toContain('sickened')

    toggleCompanionCondition(charId, compId, 'sickened')
    expect(useSessionStore.getState().getSession(charId).companionConditions?.[compId]).not.toContain('sickened')
  })

  it('resets companion HP and clears conditions on longRest', () => {
    const { adjustCompanionHp, toggleCompanionCondition, setCompanionTempHp, longRest } =
      useSessionStore.getState()
    const charId = 'mazikeen-noctis'
    const compId = 'salem-familiar'

    adjustCompanionHp(charId, compId, -8, 19)
    setCompanionTempHp(charId, compId, 4)
    toggleCompanionCondition(charId, compId, 'fatigued')

    longRest(charId, 38)

    const session = useSessionStore.getState().getSession(charId)
    expect(session.companionHp?.[compId]).toBeUndefined() // cleared back to default maxHp
    expect(session.companionConditions?.[compId]).toBeUndefined()
    expect(session.companionTempHp?.[compId]).toBeUndefined()
  })

  it('allows adding and removing companions in useCharacterStore', () => {
    const { loadCharacter, addCompanion, removeCompanion } = useCharacterStore.getState()
    const dummyChar: FullCharacter = {
      id: 'test-hero',
      name: 'Hero',
      class: 'Fighter',
      level: 1,
      race: 'Human',
      alignment: 'NG',
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      maxHp: 10,
      baseAttackBonus: [1],
      initiativeBonus: 0,
      speed: 30,
      armorClass: { total: 10, touch: 10, flatFooted: 10, armorBonus: 0, shieldBonus: 0, dexBonus: 0, naturalArmor: 0, deflection: 0, misc: 0, spellFailureChance: 0 },
      savingThrows: { fort: 2, ref: 0, will: 0, fortBase: 2, refBase: 0, willBase: 0 },
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

    loadCharacter(dummyChar)
    expect(useCharacterStore.getState().characters.find((c) => c.id === 'test-hero')?.companions).toBeUndefined()

    const preset = COMPANION_PRESETS[0]
    addCompanion('test-hero', preset)

    const updated = useCharacterStore.getState().characters.find((c) => c.id === 'test-hero')
    expect(updated?.companions?.length).toBe(1)
    expect(updated?.companions?.[0].id).toBe(preset.id)

    removeCompanion('test-hero', preset.id)
    const removed = useCharacterStore.getState().characters.find((c) => c.id === 'test-hero')
    expect(removed?.companions?.length).toBe(0)
  })
})
