import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GmCredentialsStore {
  credentials: Record<string, string>
  activeMapId: string | null
  saveCredential: (mapId: string, secret: string) => void
  getCredential: (mapId: string) => string | undefined
  clearCredential: (mapId: string) => void
  setActiveMapId: (mapId: string | null) => void
}

export const useGmCredentialsStore = create<GmCredentialsStore>()(
  persist(
    (set, get) => ({
      credentials: {},
      activeMapId: null,

      saveCredential: (mapId, secret) =>
        set((s) => ({
          credentials: { ...s.credentials, [mapId]: secret },
          activeMapId: mapId,
        })),

      getCredential: (mapId) => get().credentials[mapId],

      clearCredential: (mapId) =>
        set((s) => {
          const next = { ...s.credentials }
          delete next[mapId]
          return {
            credentials: next,
            activeMapId: s.activeMapId === mapId ? null : s.activeMapId,
          }
        }),

      setActiveMapId: (mapId) => set({ activeMapId: mapId }),
    }),
    {
      name: 'neon-gm-creds',
      partialize: (state) => ({
        credentials: state.credentials,
        activeMapId: state.activeMapId,
      }),
    }
  )
)
