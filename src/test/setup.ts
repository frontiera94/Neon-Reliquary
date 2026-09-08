// Global test setup for Vitest
// Provides DOM extensions, mocks, and fallback Storage for Zustand persist middleware

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Automatically unmount React component trees after each test in JSDOM
afterEach(() => {
  cleanup()
})

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

// Fallback for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const memoryLocalStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryLocalStorage,
    writable: true,
    configurable: true,
  })
}

if (typeof globalThis.sessionStorage === 'undefined') {
  const memorySessionStorage = new MemoryStorage()
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: memorySessionStorage,
    writable: true,
    configurable: true,
  })
}

if (typeof (globalThis as unknown as { window: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: globalThis.localStorage,
      sessionStorage: globalThis.sessionStorage,
    },
    writable: true,
    configurable: true,
  })
}

// Browser API mocks for JSDOM
if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function (query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList
  }

  window.ResizeObserver = window.ResizeObserver || class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}
