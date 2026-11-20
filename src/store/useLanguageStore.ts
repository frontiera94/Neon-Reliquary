import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useLocaleStore } from './useLocaleStore'

export type Language = 'en' | 'it'

export interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set): LanguageStore => ({
      language: 'en',
      setLanguage: (language: Language) => {
        set({ language })
        try {
          const loc = useLocaleStore.getState()
          if (loc && loc.locale !== language) {
            loc.setLocale(language)
          }
        } catch {
          // ignore
        }
      },
      toggleLanguage: () => {
        set((state) => {
          const next: Language = state.language === 'en' ? 'it' : 'en'
          try {
            const loc = useLocaleStore.getState()
            if (loc && loc.locale !== next) {
              loc.setLocale(next)
            }
          } catch {
            // ignore
          }
          return { language: next }
        })
      },
    }),
    {
      name: 'neon-reliquary-language',
    }
  )
)
