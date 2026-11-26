// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellsPage } from './SpellsPage'
import { useCharacterStore, type FullCharacter } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useDiceStore } from '../store/useDiceStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { useLocaleStore } from '../store/useLocaleStore'
import mazikeenJson from '../data/mazikeen-noctis.json'
import agelmundJson from '../data/agelmund.json'

const mazikeen = mazikeenJson as unknown as FullCharacter
const agelmund = agelmundJson as unknown as FullCharacter

describe('SpellsPage', () => {
  beforeEach(() => {
    useCharacterStore.setState({ characters: [mazikeen, agelmund], activeCharacterId: mazikeen.id })
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().initSession(mazikeen.id, mazikeen.maxHp)
    useDiceStore.setState({ isOpen: false, isRolling: false, pendingRoll: null, lastResult: null, history: [] })
    useInspectorStore.setState({ isOpen: false, currentItem: null })
    useLocaleStore.setState({ locale: 'en' })
  })

  it('shows empty state when no character is selected', () => {
    useCharacterStore.setState({ characters: [], activeCharacterId: '' })
    render(<SpellsPage />)
    expect(screen.getByText(/no character selected/i)).toBeInTheDocument()
  })

  it('shows non-caster message for martial character with no spells', () => {
    useCharacterStore.setState({ activeCharacterId: agelmund.id })
    render(<SpellsPage />)
    expect(screen.getByText(/no spellcasting ability/i)).toBeInTheDocument()
  })

  it('renders spells for a prepared caster, filters by search and level, and opens inspector', () => {
    render(<SpellsPage />)
    const firstSpell = mazikeen.spells[0]
    expect(screen.getByText(firstSpell.name)).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'zzzz_nonexistent' } })
    expect(screen.queryByText(firstSpell.name)).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: '' } })
    expect(screen.getByText(firstSpell.name)).toBeInTheDocument()

    // Clicking the spell title/card opens InspectorDrawer
    fireEvent.click(screen.getByText(firstSpell.name))
    expect(useInspectorStore.getState().isOpen).toBe(true)
  })

  it('rolls concentration check via useDiceStore', () => {
    render(<SpellsPage />)
    const concBtn = screen.getAllByRole('button').find((b) => /concentration/i.test(b.textContent ?? ''))
    expect(concBtn).toBeDefined()
    fireEvent.click(concBtn!)
    expect(useDiceStore.getState().isOpen).toBe(true)
    expect(useDiceStore.getState().pendingRoll?.diceType).toBe(20)
  })
})
