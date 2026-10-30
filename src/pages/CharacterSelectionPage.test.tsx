// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CharacterSelectionPage } from './CharacterSelectionPage'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'

describe('CharacterSelectionPage', () => {
  beforeEach(() => {
    useCharacterStore.setState({
      characters: [],
      activeCharacterId: null,
    })
    useSessionStore.setState({
      sessions: {},
    })
  })

  it('renders the character selection page with title and hero prompt', () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    expect(screen.getByText('NEON RELIQUARY')).toBeInTheDocument()
    expect(screen.getByText(/CHOOSE YOUR/i)).toBeInTheDocument()
    expect(screen.getByText('RELIC')).toBeInTheDocument()
  })

  it('renders the roster strip and allows switching active selection on tap', () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    // The component loads default characters in useEffect (Mazikeen, Shotrix, etc.)
    const mazikeenThumb = screen.getByRole('button', { name: /Select Mazikeen Noctis/i })
    expect(mazikeenThumb).toBeInTheDocument()

    const shotrixThumb = screen.getByRole('button', { name: /Select Shotrix Blackburn/i })
    expect(shotrixThumb).toBeInTheDocument()

    // Click Shotrix thumbnail in the avatar roster strip
    fireEvent.click(shotrixThumb)

    // CTA updates with chosen character name
    expect(screen.getByText(/Manifest Character — Shotrix Blackburn/i)).toBeInTheDocument()
  })

  it('clicking Manifest Character sets active character and initializes session', () => {
    render(
      <MemoryRouter>
        <CharacterSelectionPage />
      </MemoryRouter>
    )

    const cta = screen.getByRole('button', { name: /Manifest Character/i })
    fireEvent.click(cta)

    const activeId = useCharacterStore.getState().activeCharacterId
    expect(activeId).toBeTruthy()
    expect(useSessionStore.getState().sessions[activeId!]).toBeDefined()
  })
})
