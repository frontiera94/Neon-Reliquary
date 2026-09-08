// Global test setup for Vitest
// Provides mock Storage and window for Zustand persist middleware in Node environment

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

const memoryLocalStorage = new MemoryStorage()
const memorySessionStorage = new MemoryStorage()

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryLocalStorage,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  value: memorySessionStorage,
  writable: true,
  configurable: true,
})

// Zustand's default persist middleware uses `createJSONStorage(() => window.localStorage)`.
// Defining `window` on `globalThis` enables Zustand to find localStorage without warning.
if (typeof (globalThis as unknown as { window: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: {
      localStorage: memoryLocalStorage,
      sessionStorage: memorySessionStorage,
    },
    writable: true,
    configurable: true,
  })
}
