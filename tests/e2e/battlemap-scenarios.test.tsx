// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MasterMapPage } from '../../src/pages/MasterMapPage'
import { PlayerMapPage } from '../../src/pages/PlayerMapPage'
import { useBattlemapStore } from '../../src/store/useBattlemapStore'
import { useCharacterStore } from '../../src/store/useCharacterStore'
import { useLocaleStore } from '../../src/store/useLocaleStore'
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

describe('E2E Scenario — Full Live Table Session between Master (/master-map) and Party (/map)', () => {
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
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('runs a full dungeon exploration & scene switch across Master and Player views', async () => {
    // 1. Master prepares Map 1 (Sala Ingresso with closed door + 1 visible enemy + 1 stealth enemy) and Map 2 (Sala del Boss)
    const create1 = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'master',
        name: 'Sala Ingresso',
        setActive: true,
        grid: { cols: 12, rows: 8, visionRangeCells: 6 },
        walls: [
          { id: 'w_top', x1: 5, y1: 0, x2: 5, y2: 3, kind: 'wall' },
          { id: 'd_mid', x1: 5, y1: 3, x2: 5, y2: 4, kind: 'door', open: false },
          { id: 'w_bot', x1: 5, y1: 4, x2: 5, y2: 8, kind: 'wall' },
        ],
        tokens: [
          {
            id: 'pc_shotrix',
            type: 'pc',
            characterId: 'shotrix-blackburn',
            name: 'Shotrix',
            label: 'SH',
            color: 'cyan',
            col: 1,
            row: 3,
            size: 1,
            facingDeg: 0,
            speedFeet: 30,
          },
          {
            id: 'pc_agelmund',
            type: 'pc',
            characterId: 'agelmund',
            name: 'Agelmund',
            label: 'AG',
            color: 'amber',
            col: 1,
            row: 5,
            size: 1,
            facingDeg: 0,
            speedFeet: 40,
          },
          {
            id: 'en_boss_guard',
            type: 'enemy',
            name: 'Capitano Infernale',
            label: 'CI',
            color: 'crimson',
            col: 7,
            row: 3,
            size: 1,
            facingDeg: 180,
            currentHp: 20,
            maxHp: 20,
            isHidden: false,
          },
          {
            id: 'en_imp',
            type: 'enemy',
            name: 'Imp Invisibile',
            label: 'IM',
            color: 'violet',
            col: 6,
            row: 3,
            size: 1,
            facingDeg: 180,
            currentHp: 12,
            maxHp: 12,
            isHidden: true,
          },
        ],
      }),
    })
    const { map: map1 } = (await create1.json()) as { map: { id: string } }

    const create2 = await fetch('/api/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'master',
        name: 'Santuario Finale',
        setActive: false,
        grid: { cols: 14, rows: 10, visionRangeCells: 8 },
        tokens: [
          {
            id: 'pc_shotrix',
            type: 'pc',
            characterId: 'shotrix-blackburn',
            name: 'Shotrix',
            label: 'SH',
            color: 'cyan',
            col: 2,
            row: 2,
            size: 1,
            facingDeg: 90,
          },
        ],
      }),
    })
    const { map: map2 } = (await create2.json()) as { map: { id: string } }

    // 2. Player (logged in as Shotrix) opens /map
    useCharacterStore.getState().setActiveCharacter('shotrix-blackburn')
    const playerView = render(
      <MemoryRouter>
        <PlayerMapPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Sala Ingresso')).toBeInTheDocument()
    // Door is closed -> neither enemy is visible to players!
    expect(screen.queryByTestId('map-token-en_boss_guard')).not.toBeInTheDocument()
    expect(screen.queryByTestId('map-token-en_imp')).not.toBeInTheDocument()

    // Player moves BOTH Shotrix (to 4,3 right in front of closed door) AND teammate Agelmund (to 4,4)
    fireEvent.click(screen.getByTestId('map-cell-4-3'))
    await waitFor(() => {
      expect(
        useBattlemapStore.getState().activeMap?.tokens.find((t) => t.id === 'pc_shotrix')?.col
      ).toBe(4)
    })

    fireEvent.click(screen.getByTestId('party-pill-pc_agelmund'))
    fireEvent.click(screen.getByTestId('map-cell-4-4'))
    await waitFor(() => {
      expect(
        useBattlemapStore.getState().activeMap?.tokens.find((t) => t.id === 'pc_agelmund')?.col
      ).toBe(4)
    })

    // Player tries to walk Agelmund through the closed door to (6, 3) -> blocked!
    fireEvent.click(screen.getByTestId('map-cell-6-3'))
    expect(await screen.findByTestId('map-feedback-alert')).toBeInTheDocument()

    playerView.unmount()

    // 3. Master opens /master-map (auto-loads active map1), opens Door #1, and damages Capitano Infernale (-5 twice -> 10/20 HP = Ferito)
    const masterView = render(
      <MemoryRouter>
        <MasterMapPage />
      </MemoryRouter>
    )

    expect(await screen.findByTestId('door-list-toggle-d_mid')).toBeInTheDocument()
    expect(useBattlemapStore.getState().masterMap?.id).toBe(map1.id)
    fireEvent.click(screen.getByTestId('door-list-toggle-d_mid'))

    await waitFor(() => {
      const door = useBattlemapStore.getState().masterMap?.walls.find((w) => w.id === 'd_mid')
      expect(door?.open).toBe(true)
    })

    fireEvent.click(screen.getByTestId('enemy-hp-minus5-en_boss_guard'))
    await waitFor(() => {
      const g = useBattlemapStore.getState().masterMap?.tokens.find((t) => t.id === 'en_boss_guard')
      expect(g?.currentHp).toBe(15)
    })
    fireEvent.click(screen.getByTestId('enemy-hp-minus5-en_boss_guard'))
    await waitFor(() => {
      const g = useBattlemapStore.getState().masterMap?.tokens.find((t) => t.id === 'en_boss_guard')
      expect(g?.currentHp).toBe(10)
    })

    masterView.unmount()

    // 4. Player view refreshes: Capitano Infernale is now visible inside Shotrix's cone with "Ferito" status (no exact HP!), while Imp Invisibile remains hidden!
    const playerView2 = render(
      <MemoryRouter>
        <PlayerMapPage />
      </MemoryRouter>
    )
    await act(async () => {
      await useBattlemapStore.getState().pollActiveMap('player', true)
    })

    const visibleGuard = await screen.findByTestId('map-token-en_boss_guard')
    expect(visibleGuard).toHaveTextContent('Capitano Infernale · Ferito')
    expect(visibleGuard.textContent).not.toContain('10/20')
    expect(screen.queryByTestId('map-token-en_imp')).not.toBeInTheDocument()

    // And now Shotrix can step through the open doorway to (6, 3)!
    fireEvent.click(screen.getByTestId('party-pill-pc_shotrix'))
    fireEvent.click(screen.getByTestId('map-cell-6-3'))
    await waitFor(() => {
      expect(
        useBattlemapStore.getState().activeMap?.tokens.find((t) => t.id === 'pc_shotrix')?.col
      ).toBe(6)
    })

    // 5. Master broadcasts Map 2 ("Santuario Finale") -> Player automatically transitions to Map 2!
    await act(async () => {
      await useBattlemapStore.getState().setActiveMap(map2.id)
      await useBattlemapStore.getState().pollActiveMap('player', true)
    })

    expect(await screen.findByText('Santuario Finale')).toBeInTheDocument()
    playerView2.unmount()
  })
})
