import { useCallback } from 'react'
import { useLocaleStore, type Locale } from '../store/useLocaleStore'
import { en } from './en'
import { it } from './it'

export type { Locale } from '../store/useLocaleStore'
export type Translations = typeof en

const DICTIONARIES: Record<Locale, Translations> = {
  en,
  it: it as unknown as Translations,
}

function resolvePath(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return path
    }
  }
  return typeof cur === 'string' ? cur : path
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{{${k}}}`
  )
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = DICTIONARIES[locale] ?? en
  let value = resolvePath(dict as unknown as Record<string, unknown>, key)
  if (value === key && locale !== 'en') {
    value = resolvePath(en as unknown as Record<string, unknown>, key)
  }
  return interpolate(value, params)
}

export function getTranslations(locale?: Locale): Translations {
  const active = locale ?? useLocaleStore.getState().locale
  return DICTIONARIES[active] ?? en
}

export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)
  const toggleLocale = useLocaleStore((s) => s.toggleLocale)

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale]
  )

  return {
    locale,
    setLocale,
    toggleLocale,
    t,
    dict: DICTIONARIES[locale] ?? en,
  }
}

export * from './pf1e'
