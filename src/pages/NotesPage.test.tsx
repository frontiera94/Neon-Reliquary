// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { NotesPage } from './NotesPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useLanguageStore } from '../store/useLanguageStore'
import type { FullCharacter } from '../store/useCharacterStore'

function makeCharacter(id: string, name: string): FullCharacter {
  return {
    id,
    name,
    class: 'Investigator',
    level: 5,
    race: 'Human',
    alignment: 'Neutral',
    maxHp: 35,
    initiativeBonus: 4,
    speed: 30,
    abilities: { str: 10, dex: 16, con: 12, int: 18, wis: 12, cha: 10 },
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
    savingThrows: { fort: 2, ref: 7, will: 5, fortBase: 1, refBase: 4, willBase: 4 },
    skills: [],
    feats: [],
    weapons: [],
    buffs: [],
    dailyResources: [],
    classAbilities: [],
    spellSlots: [],
    spells: [],
    inventory: [],
  }
}

const charA = makeCharacter('char-a', 'Kaelen')
const charB = makeCharacter('char-b', 'Noorie')

describe('NotesPage', () => {
  beforeEach(() => {
    useLanguageStore.getState().setLanguage('en')
    useCharacterStore.setState({
      characters: [charA, charB],
      activeCharacterId: charA.id,
    })
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().initSession(charA.id, charA.maxHp)
    useSessionStore.getState().initSession(charB.id, charB.maxHp)
  })

  it('renders empty state and creates a new note', () => {
    render(<NotesPage />)

    expect(screen.getByText('No notes yet')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /create first note/i }))

    const titleInput = screen.getByLabelText('Note title...') as HTMLInputElement
    const contentInput = screen.getByLabelText('Write your notes here...') as HTMLTextAreaElement

    fireEvent.change(titleInput, { target: { value: 'Sandpoint Clues' } })
    fireEvent.change(contentInput, { target: { value: 'Check the old glassworks.' } })

    const notes = useSessionStore.getState().getSession(charA.id).notes ?? []
    expect(notes).toHaveLength(1)
    expect(notes[0].title).toBe('Sandpoint Clues')
    expect(notes[0].content).toBe('Check the old glassworks.')
  })

  it('filters notes by search query on title and content', () => {
    useSessionStore.getState().addNote(charA.id, { title: 'Tavern NPC', content: 'Ameiko Kaijitsu' })
    useSessionStore.getState().addNote(charA.id, { title: 'Dungeon Map', content: 'Secret door behind altar' })

    render(<NotesPage />)

    const searchInput = screen.getByLabelText('Search notes...')
    fireEvent.change(searchInput, { target: { value: 'altar' } })

    expect(screen.getByText('Dungeon Map')).toBeInTheDocument()
    expect(screen.queryByText('Tavern NPC')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByText('Tavern NPC')).toBeInTheDocument()
    expect(screen.getByText('Dungeon Map')).toBeInTheDocument()
  })

  it('pins and unpins notes so pinned notes appear first', () => {
    const id1 = useSessionStore.getState().addNote(charA.id, { title: 'First Note', content: 'Alpha' })
    useSessionStore.getState().addNote(charA.id, { title: 'Second Note', content: 'Beta' })

    render(<NotesPage />)

    // Select First Note and pin it
    fireEvent.click(screen.getByText('First Note'))
    fireEvent.click(screen.getByRole('button', { name: /pin to top/i }))

    const note = useSessionStore.getState().getSession(charA.id).notes?.find((n) => n.id === id1)
    expect(note?.pinned).toBe(true)

    // Pinned button should now show Unpin aria-label
    expect(screen.getByRole('button', { name: /unpin/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('requires confirmation before deleting a note', () => {
    useSessionStore.getState().addNote(charA.id, { title: 'Temporary Clue', content: 'Burn after reading' })

    render(<NotesPage />)

    fireEvent.click(screen.getByRole('button', { name: /delete note/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Delete note?')).toBeInTheDocument()

    // Cancel keeps the note
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useSessionStore.getState().getSession(charA.id).notes).toHaveLength(1)

    // Confirm deletes the note
    fireEvent.click(screen.getByRole('button', { name: /delete note/i }))
    const dialog2 = screen.getByRole('dialog')
    fireEvent.click(within(dialog2).getByRole('button', { name: 'Delete' }))

    expect(useSessionStore.getState().getSession(charA.id).notes).toHaveLength(0)
    expect(screen.getByText('No notes yet')).toBeInTheDocument()
  })

  it('scopes notes per character', () => {
    useSessionStore.getState().addNote(charA.id, { title: 'Kaelen Secret', content: 'Only for Kaelen' })
    useSessionStore.getState().addNote(charB.id, { title: 'Noorie Spellbook', content: 'Only for Noorie' })

    const { rerender } = render(<NotesPage />)
    expect(screen.getByText('Kaelen Secret')).toBeInTheDocument()
    expect(screen.queryByText('Noorie Spellbook')).not.toBeInTheDocument()

    act(() => {
      useCharacterStore.setState({ activeCharacterId: charB.id })
    })
    rerender(<NotesPage />)
    expect(screen.getByText('Noorie Spellbook')).toBeInTheDocument()
    expect(screen.queryByText('Kaelen Secret')).not.toBeInTheDocument()
  })
})
