// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useLanguageStore } from './useLanguageStore'

describe('useLanguageStore', () => {
  beforeEach(() => {
    useLanguageStore.setState({ language: 'en' })
    localStorage.clear()
  })

  it('defaults to English (en)', () => {
    expect(useLanguageStore.getState().language).toBe('en')
  })

  it('sets language directly to Italian and back to English', () => {
    useLanguageStore.getState().setLanguage('it')
    expect(useLanguageStore.getState().language).toBe('it')

    useLanguageStore.getState().setLanguage('en')
    expect(useLanguageStore.getState().language).toBe('en')
  })

  it('toggles language between en and it', () => {
    expect(useLanguageStore.getState().language).toBe('en')

    useLanguageStore.getState().toggleLanguage()
    expect(useLanguageStore.getState().language).toBe('it')

    useLanguageStore.getState().toggleLanguage()
    expect(useLanguageStore.getState().language).toBe('en')
  })
})
