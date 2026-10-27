// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterSelectionPage } from './CharacterSelectionPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import mazeData from '../data/mazikeen-noctis.json'
import type { FullCharacter } from '../store/useCharacterStore'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('CharacterSelectionPage (Redesigned Master-Detail)', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    useCharacterStore.setState({
      characters: [],
      activeCharacterId: null,
    })
    useSessionStore.setState({
      sessions: {},
    })
  })

  it('renders all characters in the roster and defaults to first character', async () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    // Check title heading
    expect(screen.getByRole('heading', { name: /choose your relic/i })).toBeInTheDocument()

    // Mazikeen is the first loaded character
    expect(screen.getAllByText('Mazikeen Noctis').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Shotrix Blackburn/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Knam/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Agelmund/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Mariano Cardamomo/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Noorie/i).length).toBeGreaterThanOrEqual(1)
  })

  it('displays character identity lore, race, alignment, and companion in Spotlight', async () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    // Default is Mazikeen Noctis
    expect(screen.getByText('Hexcrafter & Occult Controller')).toBeInTheDocument()
    expect(screen.getByText(/Le ombre sussurrano verità/i)).toBeInTheDocument()
    expect(screen.getByText(/Lawful Evil/i)).toBeInTheDocument()
    expect(screen.getAllByText('Tiefling').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Salem (a.k.a. Blackjack)')).toBeInTheDocument()
  })

  it('switches the spotlighted character when selecting from the roster', async () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    // Select Knam from roster button
    const knamBtn = screen.getByRole('button', { name: 'Select Knam' })
    fireEvent.click(knamBtn)

    // Spotlight should update to Knam's archetype and quote
    expect(screen.getByText('Primal Bloodrager & Juggernaut')).toBeInTheDocument()
    expect(screen.getByText(/La rabbia nel mio sangue spezza qualsiasi catena/i)).toBeInTheDocument()
    expect(screen.getByText('Chaotic Evil')).toBeInTheDocument()
  })

  it('manifests character and navigates to /status when CTA is clicked', async () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    const manifestBtn = screen.getByRole('button', { name: /Manifest Character — Mazikeen Noctis/i })
    fireEvent.click(manifestBtn)

    expect(useCharacterStore.getState().activeCharacterId).toBe('mazikeen-noctis')
    expect(mockNavigate).toHaveBeenCalledWith('/status')
  })

  it('shows "Resume Session" when the active character is already manifested', async () => {
    useCharacterStore.setState({
      activeCharacterId: 'mazikeen-noctis',
      characters: [mazeData as unknown as FullCharacter],
    })

    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /Resume Session — Mazikeen Noctis/i })).toBeInTheDocument()
  })

  it('cycles characters with ArrowDown / ArrowRight and manifests with Enter', async () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    // Initial spotlight is Mazikeen
    expect(screen.getByText('Hexcrafter & Occult Controller')).toBeInTheDocument()

    // Press ArrowDown -> should select Shotrix Blackburn
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(screen.getByText('Arcane Blade & Spellstriker')).toBeInTheDocument()

    // Press Enter -> should manifest Shotrix
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(useCharacterStore.getState().activeCharacterId).toBe('shotrix-blackburn')
    expect(mockNavigate).toHaveBeenCalledWith('/status')
  })
})
