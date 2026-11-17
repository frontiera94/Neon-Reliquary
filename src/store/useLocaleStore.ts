import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useLanguageStore } from './useLanguageStore'

export type Locale = 'en' | 'it'

export interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set): LocaleState => ({
      locale: 'en',
      setLocale: (locale: Locale) => {
        set({ locale })
        try {
          const lang = useLanguageStore.getState()
          if (lang && lang.language !== locale) {
            lang.setLanguage(locale)
          }
        } catch {
          // ignore
        }
      },
      toggleLocale: () => {
        set((state) => {
          const next: Locale = state.locale === 'en' ? 'it' : 'en'
          try {
            const lang = useLanguageStore.getState()
            if (lang && lang.language !== next) {
              lang.setLanguage(next)
            }
          } catch {
            // ignore
          }
          return { locale: next }
        })
      },
    }),
    {
      name: 'neon-reliquary-locale',
    }
  )
)
