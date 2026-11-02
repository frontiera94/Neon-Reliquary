import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'en' | 'it'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language: Language) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({ language: state.language === 'en' ? 'it' : 'en' })),
    }),
    {
      name: 'neon-reliquary-language',
    }
  )
)
