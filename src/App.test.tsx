// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { useCharacterStore, type FullCharacter } from './store/useCharacterStore'
import { useSessionStore } from './store/useSessionStore'
import agelmundJson from './data/agelmund.json'

const agelmund = agelmundJson as unknown as FullCharacter

describe('App routing integration', () => {
  beforeEach(() => {
    useCharacterStore.setState({ characters: [agelmund], activeCharacterId: agelmund.id })
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().initSession(agelmund.id, agelmund.maxHp)
    window.history.pushState({}, '', '/')
  })

  it('renders LandingPage on / and CharacterSelectionPage on /characters', () => {
    render(<App />)
    expect(screen.getAllByText(/Reliquary/i).length).toBeGreaterThanOrEqual(1)

    window.history.pushState({}, '', '/characters')
    render(<App />)
    expect(screen.getAllByText(agelmund.name).length).toBeGreaterThanOrEqual(1)
  })

  it('renders MainLayout routes (/status, /skills, /combat, /spells, /features, /inventory, /companion, /notes, /map) and standalone /master-map', () => {
    for (const route of ['/status', '/skills', '/combat', '/spells', '/features', '/inventory', '/companion', '/notes', '/map', '/master-map']) {
      window.history.pushState({}, '', route)
      const { unmount } = render(<App />)
      expect(document.body.textContent?.length).toBeGreaterThan(0)
      unmount()
    }
  })

  it('redirects unknown paths to /', () => {
    window.history.pushState({}, '', '/non-existent-route-xyz')
    render(<App />)
    expect(window.location.pathname).toBe('/')
  })
})
