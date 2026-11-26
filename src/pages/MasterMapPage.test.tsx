// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MasterMapPage } from './MasterMapPage'
import { useBattlemapStore } from '../store/useBattlemapStore'
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

describe('MasterMapPage (/master-map) — Library, Party Deploy, Enemies, Doors & Fog', () => {
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

  it('creates multiple maps in library, deploys party roster, spawns & edits enemies, calibrates vision, and controls fog', async () => {
    render(
      <MemoryRouter initialEntries={['/master-map']}>
        <MasterMapPage />
      </MemoryRouter>
    )

    // Create Map 1
    fireEvent.change(screen.getByTestId('new-map-name-input'), {
      target: { value: 'Tempio di Asmodeus' },
    })
    fireEvent.click(screen.getByTestId('create-map-btn'))

    await waitFor(() => {
      expect(useBattlemapStore.getState().masterMap?.name).toBe('Tempio di Asmodeus')
    })

    // Create Map 2 and verify library holds both maps
    fireEvent.change(screen.getByTestId('new-map-name-input'), {
      target: { value: 'Sotterranei Segreti' },
    })
    fireEvent.click(screen.getByTestId('create-map-btn'))

    await waitFor(() => {
      expect(useBattlemapStore.getState().library).toHaveLength(2)
      expect(useBattlemapStore.getState().masterMap?.name).toBe('Sotterranei Segreti')
    })

    // Broadcast Map 2 to players
    fireEvent.click(screen.getByTestId('master-broadcast-btn'))
    await waitFor(() => {
      expect(useBattlemapStore.getState().masterMap?.isActive).toBe(true)
    })

    // Deploy all 6 Party PCs onto the map
    fireEvent.click(screen.getByTestId('deploy-party-btn'))
    await waitFor(() => {
      const pcs = useBattlemapStore.getState().masterMap?.tokens.filter((t) => t.type === 'pc') ?? []
      expect(pcs.length).toBeGreaterThanOrEqual(6)
    })

    // Spawn a 2x2 Large Enemy with 30 HP
    fireEvent.change(screen.getByTestId('enemy-name-input'), {
      target: { value: 'Demone delle Ombre' },
    })
    fireEvent.change(screen.getByTestId('enemy-size-select'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('enemy-hp-input'), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('add-enemy-btn'))

    let enemyId = ''
    await waitFor(() => {
      const enemy = useBattlemapStore
        .getState()
        .masterMap?.tokens.find((t) => t.name === 'Demone delle Ombre')
      expect(enemy).toBeDefined()
      expect(enemy?.size).toBe(2)
      expect(enemy?.currentHp).toBe(30)
      enemyId = enemy!.id
    })

    // Master adjusts Enemy HP (-5) and toggles Stealth/Invisible ON
    fireEvent.click(screen.getByTestId(`enemy-hp-minus5-${enemyId}`))
    await waitFor(() => {
      const enemy = useBattlemapStore.getState().masterMap?.tokens.find((t) => t.id === enemyId)
      expect(enemy?.currentHp).toBe(25)
    })

    fireEvent.click(screen.getByTestId(`toggle-stealth-${enemyId}`))
    await waitFor(() => {
      const enemy = useBattlemapStore.getState().masterMap?.tokens.find((t) => t.id === enemyId)
      expect(enemy?.isHidden).toBe(true)
      expect(screen.getByTestId(`token-hidden-badge-${enemyId}`)).toBeInTheDocument()
    })

    // Master reveals a remote fog cell (15, 10), then resets fog
    fireEvent.click(screen.getByTestId('master-tool-fogReveal'))
    fireEvent.click(screen.getByTestId('map-cell-15-10'))
    await waitFor(() => {
      expect(useBattlemapStore.getState().masterMap?.fog.manualRevealedCells).toContain('15,10')
    })

    fireEvent.click(screen.getByTestId('reset-fog-btn'))
    await waitFor(() => {
      expect(useBattlemapStore.getState().masterMap?.fog.manualRevealedCells).toHaveLength(0)
    })

    // Calibrate vision range to 10 cells
    fireEvent.change(screen.getByTestId('vision-range-input'), { target: { value: '10' } })
    await waitFor(() => {
      expect(useBattlemapStore.getState().masterMap?.grid.visionRangeCells).toBe(10)
    })
  })
})
