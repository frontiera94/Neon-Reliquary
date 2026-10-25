import { registerSW } from 'virtual:pwa-register'

export const GOOGLE_FONT_STYLESHEETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Space+Grotesk:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
]

export const KNOWN_OFFLINE_PORTRAITS = [
  'https://placehold.co/400x600/1f1f25/00daf3?text=Agelmund',
  'https://placehold.co/400x600/1f1f25/00daf3?text=Knam',
  'https://placehold.co/400x600/1f1f25/00daf3?text=Mariano',
  'https://placehold.co/400x600/1f1f25/d946ef?text=Maze',
  'https://placehold.co/400x600/1f1f25/00daf3?text=Noorie',
  'https://placehold.co/400x600/1f1f25/00daf3?text=Shotrix',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1564865878688-9a244444042a?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1549608276-5786777e6587?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1531386151447-fd76ad50012f?auto=format&fit=crop&w=400&q=80',
]

export interface InitPwaOptions {
  checkIntervalMs?: number
  fetchImpl?: typeof fetch
  disableWarmup?: boolean
}

export interface PwaController {
  update: (reloadPage?: boolean) => Promise<void>
  stop: () => void
}

/**
 * Extracts url(...) references pointing to fonts.gstatic.com from CSS text.
 */
export function extractGstaticFontUrls(cssText: string): string[] {
  const matches = cssText.match(/https:\/\/fonts\.gstatic\.com\/[^\s"')]+/g)
  if (!matches) return []
  return Array.from(new Set(matches))
}

/**
 * Pre-populates runtime caches for external Google Fonts and portraits
 * so the app is 100% resilient offline even immediately after first install.
 */
export async function warmOfflineAssets(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (typeof window === 'undefined') return
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) return

  try {
    const fontPromises = GOOGLE_FONT_STYLESHEETS.map(async (url) => {
      try {
        const res = await fetchImpl(url)
        if (res.ok) {
          const css = await res.text()
          const fontUrls = extractGstaticFontUrls(css)
          await Promise.all(
            fontUrls.map((fontUrl) =>
              fetchImpl(fontUrl, { mode: 'cors' }).catch(() => {
                /* ignore */
              })
            )
          )
        }
      } catch {
        /* ignore */
      }
    })

    const portraitPromises = KNOWN_OFFLINE_PORTRAITS.map((url) =>
      fetchImpl(url, { mode: 'no-cors' }).catch(() => {
        /* ignore */
      })
    )

    await Promise.all([...fontPromises, ...portraitPromises])
  } catch {
    /* ignore all warmup errors */
  }
}

/**
 * Initializes Service Worker registration with silent automatic updates
 * and hourly update checks during active tabletop sessions.
 */
export function initPwa(options?: InitPwaOptions): PwaController | null {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  const checkIntervalMs = options?.checkIntervalMs ?? 60 * 60 * 1000 // 1 hour default
  let intervalTimer: ReturnType<typeof setInterval> | null = null

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return

      // Periodically check for updates if online
      if (checkIntervalMs > 0) {
        intervalTimer = setInterval(() => {
          if (navigator.onLine) {
            void registration.update()
          }
        }, checkIntervalMs)
      }

      // Warm up offline assets in background once SW is registered
      if (!options?.disableWarmup) {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(() => {
            void warmOfflineAssets(options?.fetchImpl)
          })
        } else {
          setTimeout(() => {
            void warmOfflineAssets(options?.fetchImpl)
          }, 2000)
        }
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration failed:', error)
    },
  })

  return {
    update: async (reloadPage = true) => {
      await updateSW(reloadPage)
    },
    stop: () => {
      if (intervalTimer !== null) {
        clearInterval(intervalTimer)
        intervalTimer = null
      }
    },
  }
}
