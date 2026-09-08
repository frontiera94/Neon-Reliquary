import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMap, fetchMap, pushMap, uploadBackground } from './map-api'
import type { PublicMapState } from '../types/map'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function ok(body: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function fail(status: number, body: unknown = {}) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  })
}

const fakeMapState: PublicMapState = {
  id: 'abc123',
  createdAt: 0,
  updatedAt: 0,
  background: null,
  grid: { size: 50 },
  tokens: [],
  shapes: [],
  labels: [],
  fog: { cols: 20, rows: 15, cells: new Array(300).fill(0) },
  initiative: { order: [], currentIndex: 0, round: 1 },
}

describe('createMap', () => {
  beforeEach(() => mockFetch.mockReset())

  it('POSTs /api/maps and returns { id, secret, gmUrl, readOnlyUrl }', async () => {
    mockFetch.mockReturnValue(ok({ id: 'abc', secret: 'xyz', gmUrl: '/gm/map/abc', readOnlyUrl: '/map/abc' }))
    const result = await createMap()
    expect(result.id).toBe('abc')
    expect(result.secret).toBe('xyz')
    expect(result.gmUrl).toBe('/gm/map/abc')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/maps')
    expect(opts.method).toBe('POST')
  })

  it('throws with status on non-ok response', async () => {
    mockFetch.mockReturnValue(fail(500, { error: 'internal error' }))
    await expect(createMap()).rejects.toThrow('HTTP 500: internal error')
  })

  it('throws with status only when body has no error field', async () => {
    mockFetch.mockReturnValue(fail(503, {}))
    await expect(createMap()).rejects.toThrow('HTTP 503')
  })
})

describe('fetchMap', () => {
  beforeEach(() => mockFetch.mockReset())

  it('GETs /api/maps/:id and returns state', async () => {
    mockFetch.mockReturnValue(ok(fakeMapState))
    const result = await fetchMap('abc123')
    expect(result).toEqual(fakeMapState)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/maps/abc123')
    expect(opts.method).toBe('GET')
  })

  it('throws on 404', async () => {
    mockFetch.mockReturnValue(fail(404, { error: 'not found' }))
    await expect(fetchMap('missing')).rejects.toThrow('HTTP 404: not found')
  })
})

describe('pushMap', () => {
  beforeEach(() => mockFetch.mockReset())

  it('PUTs /api/maps/:id with x-gm-secret header', async () => {
    mockFetch.mockReturnValue(Promise.resolve({ ok: true }))
    await pushMap('mapid', 'mysecret', fakeMapState)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toBe('/api/maps/mapid')
    expect(opts.method).toBe('PUT')
    expect(opts.headers['x-gm-secret']).toBe('mysecret')
  })

  it('throws on 401', async () => {
    mockFetch.mockReturnValue(fail(401, { error: 'unauthorized' }))
    await expect(pushMap('mapid', 'badsecret', fakeMapState)).rejects.toThrow('HTTP 401')
  })
})

describe('uploadBackground', () => {
  beforeEach(() => mockFetch.mockReset())

  it('POSTs dataUrl as JSON and returns { url, width, height }', async () => {
    mockFetch.mockReturnValue(ok({ url: 'https://blob/img.png', width: 1920, height: 1080 }))
    const result = await uploadBackground('mapid', 'mysecret', 'data:image/png;base64,abc')
    expect(result.url).toBe('https://blob/img.png')
    expect(result.width).toBe(1920)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toBe('/api/maps/mapid/background')
    expect(opts.method).toBe('POST')
    expect(opts.headers['x-gm-secret']).toBe('mysecret')
    expect(JSON.parse(opts.body as string)).toEqual({ dataUrl: 'data:image/png;base64,abc' })
  })

  it('throws on error', async () => {
    mockFetch.mockReturnValue(fail(413, { error: 'too large' }))
    await expect(uploadBackground('mapid', 'sec', 'data:...')).rejects.toThrow('HTTP 413: too large')
  })
})
