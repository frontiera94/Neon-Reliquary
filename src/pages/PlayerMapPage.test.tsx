// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlayerMapPage } from './PlayerMapPage'
import { Sidebar } from '../components/layout/Sidebar'
import { BottomNav } from '../components/layout/BottomNav'
import { useBattlemapStore } from '../store/useBattlemapStore'
import { useCharacterStore } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import { useLocaleStore } from '../store/useLocaleStore'
import { handleMapsRequest, resetMemoryMaps } from '../../api/maps'
import type { ApiResponse } from '../../api/sessions'

function installMapsFetchBridge() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!urlStr.includes('/api/maps')) {
      return new Response(JSON.stringify({ configured: false }), { status: 503 })
    }

    let statusCode = 200
    let payload: unknown = {}
    const res: ApiResponse = {
      setHeader: () => {},
      status: (c) => {
        statusCode = c
        return {
          json: (p) => {
            payload = p
          },
          end: () => {},
        }
      },
    }

    await handleMapsRequest(
      {
        method: init?.method ?? 'GET',
        url: urlStr,
        body: typeof init?.body === 'string' ? init.body : undefined,
      },
      res,
      { env: {} }
    )

    return new Response(JSON.stringify(payload), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

async function seedServerMap(body: Record<string, unknown>) {
  await fetch('/api/maps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'master', ...body }),
  })
}

describe('PlayerMapPage (/map) & Navigation Isolation', () => {
  beforeEach(() => {
    resetMemoryMaps()
    installMapsFetchBridge()
    useLocaleStore.setState({ locale: 'it' })
    useBattlemapStore.setState({
      activeMap: null,
      masterMap: null,
      library: [],
      imageCache: {},
      loading: false,
      error: null,
      lastFeedback: null,
    })
    useSessionStore.setState({ sessions: {} })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes /map in Sidebar and BottomNav while keeping /master-map hidden from player menus', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/map']}>
        <Sidebar />
        <BottomNav />
      </MemoryRouter>
    )

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/map')
    expect(hrefs).not.toContain('/master-map')
    unmount()
  })

  it('renders empty state when no map is active, then displays active map, live HP/conditions, other PC movement, rotation, wall block, and ping', async () => {
    const { rerender } = render(
      <MemoryRouter>
        <PlayerMapPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('player-no-active-map')).toBeInTheDocument()

    // Seed Shotrix as active character with damaged HP and a condition in useSessionStore
    useCharacterStore.getState().setActiveCharacter('shotrix-blackburn')
    useSessionStore.getState().initSession('shotrix-blackburn', 38)
    useSessionStore.getState().applyDamage('shotrix-blackburn', 10)
    useSessionStore.getState().toggleCondition('shotrix-blackburn', 'shaken')

    await seedServerMap({
      name: 'Catacombe Neon',
      setActive: true,
      grid: { cols: 10, rows: 8, visionRangeCells: 5 },
      walls: [
        { id: 'w_seal1', x1: 5, y1: 0, x2: 5, y2: 8, kind: 'wall' },
      ],
      tokens: [
        {
          id: 'pc_shotrix',
          type: 'pc',
          characterId: 'shotrix-blackburn',
          name: 'Shotrix Blackburn',
          label: 'SH',
          color: 'cyan',
          col: 2,
          row: 2,
          size: 1,
          facingDeg: 0,
          speedFeet: 30,
        },
        {
          id: 'pc_mazikeen',
          type: 'pc',
          characterId: 'mazikeen-noctis',
          name: 'Mazikeen Noctis',
          label: 'MA',
          color: 'magenta',
          col: 1,
          row: 4,
          size: 1,
          facingDeg: 90,
          speedFeet: 30,
        },
      ],
    })

    await useBattlemapStore.getState().pollActiveMap('player', true)
    rerender(
      <MemoryRouter>
        <PlayerMapPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Catacombe Neon')).toBeInTheDocument()

    // Live HP (28/38 HP) & condition badge (!1) rendered on Shotrix's token
    expect(screen.getByTestId('party-pill-pc_shotrix')).toHaveTextContent('28/')
    expect(screen.getByTestId('token-conditions-pc_shotrix')).toHaveTextContent('!1')

    // Player selects ANOTHER player's character (Mazikeen) and moves her to (3, 4) -> SUCCEEDS!
    fireEvent.click(screen.getByTestId('party-pill-pc_mazikeen'))
    fireEvent.click(screen.getByTestId('map-cell-3-4'))

    await waitFor(() => {
      const maze = useBattlemapStore.getState().activeMap?.tokens.find((t) => t.id === 'pc_mazikeen')
      expect(maze?.col).toBe(3)
      expect(maze?.row).toBe(4)
    })

    // Rotate Mazikeen's 90° vision cone to East (0°) via compass dial
    fireEvent.click(screen.getByTestId('compass-dir-E'))
    await waitFor(() => {
      const maze = useBattlemapStore.getState().activeMap?.tokens.find((t) => t.id === 'pc_mazikeen')
      expect(maze?.facingDeg).toBe(0)
    })

    // Attempt to move Mazikeen across sealed wall x=5 to (7, 4) -> BLOCKED with alert!
    fireEvent.click(screen.getByTestId('map-cell-7-4'))
    expect(await screen.findByTestId('map-feedback-alert')).toBeInTheDocument()
    expect(
      useBattlemapStore.getState().activeMap?.tokens.find((t) => t.id === 'pc_mazikeen')?.col
    ).toBe(3)

    // Activate Shared Ping mode and ping cell (2, 3)
    fireEvent.click(screen.getByTestId('toggle-ping-mode'))
    fireEvent.click(screen.getByTestId('map-cell-2-3'))

    await waitFor(() => {
      expect(screen.getByTestId('map-ping-2-3')).toBeInTheDocument()
    })
  })
})
