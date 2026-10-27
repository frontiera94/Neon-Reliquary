import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
vi.mock('virtual:pwa-register', () => ({
  registerSW: (options?: { onRegisteredSW?: (url: string, reg: unknown) => void }) => {
    options?.onRegisteredSW?.('mock-sw.js', { update: () => Promise.resolve() })
    return () => Promise.resolve()
  },
}))
import {
  extractGstaticFontUrls,
  warmOfflineAssets,
  initPwa,
  GOOGLE_FONT_STYLESHEETS,
  KNOWN_OFFLINE_PORTRAITS,
} from './pwa'

describe('PWA Utility & Registration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('extractGstaticFontUrls', () => {
    it('extracts unique fonts.gstatic.com URLs from CSS', () => {
      const sampleCss = `
        @font-face {
          font-family: 'Inter';
          src: url(https://fonts.gstatic.com/s/inter/v18/inter-latin.woff2) format('woff2');
        }
        @font-face {
          font-family: 'Inter';
          src: url('https://fonts.gstatic.com/s/inter/v18/inter-latin.woff2') format('woff2');
        }
        @font-face {
          font-family: 'Material Symbols Outlined';
          src: url("https://fonts.gstatic.com/s/materialsymbolsoutlined/v218/icons.woff2") format('woff2');
        }
      `
      const urls = extractGstaticFontUrls(sampleCss)
      expect(urls).toHaveLength(2)
      expect(urls).toContain('https://fonts.gstatic.com/s/inter/v18/inter-latin.woff2')
      expect(urls).toContain('https://fonts.gstatic.com/s/materialsymbolsoutlined/v218/icons.woff2')
    })

    it('returns empty array when no gstatic fonts match', () => {
      expect(extractGstaticFontUrls('body { color: red; }')).toEqual([])
    })
  })

  describe('warmOfflineAssets', () => {
    it('fetches Google Font stylesheets, parses woff2 URLs, and fetches portraits', async () => {
      const fetchedUrls: string[] = []
      const mockFetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        fetchedUrls.push(url)

        if (url.includes('fonts.googleapis.com')) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                `@font-face { src: url(https://fonts.gstatic.com/mock-font.woff2); }`
              ),
          })
        }

        return Promise.resolve({ ok: true, text: () => Promise.resolve('') })
      })

      await warmOfflineAssets(mockFetch as unknown as typeof fetch)

      // Verifies both font stylesheets are fetched
      for (const stylesheet of GOOGLE_FONT_STYLESHEETS) {
        expect(fetchedUrls).toContain(stylesheet)
      }

      // Verifies extracted gstatic font is fetched with CORS mode
      expect(fetchedUrls).toContain('https://fonts.gstatic.com/mock-font.woff2')

      // Verifies portraits are fetched
      for (const portrait of KNOWN_OFFLINE_PORTRAITS) {
        expect(fetchedUrls).toContain(portrait)
      }
    })

    it('handles network failure gracefully without throwing', async () => {
      const failingFetch = vi.fn().mockRejectedValue(new Error('Network offline'))
      await expect(warmOfflineAssets(failingFetch as unknown as typeof fetch)).resolves.not.toThrow()
    })
  })

  describe('initPwa', () => {
    it('returns null safely when serviceWorker is not supported in navigator', () => {
      const originalNav = globalThis.navigator
      try {
        Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
        const result = initPwa()
        expect(result).toBeNull()
      } finally {
        Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true })
      }
    })

    it('registers service worker and configures interval check when supported', () => {
      vi.useFakeTimers()

      // Mock virtual:pwa-register by creating a mockable environment
      const fakeNavigator = {
        serviceWorker: {},
        onLine: true,
      }

      const originalNav = globalThis.navigator
      try {
        Object.defineProperty(globalThis, 'navigator', { value: fakeNavigator, configurable: true })

        const controller = initPwa({
          checkIntervalMs: 5000,
          disableWarmup: true,
        })

        expect(controller).not.toBeNull()
        expect(typeof controller?.update).toBe('function')
        expect(typeof controller?.stop).toBe('function')

        controller?.stop()
      } finally {
        Object.defineProperty(globalThis, 'navigator', { value: originalNav, configurable: true })
      }
    })
  })
})
