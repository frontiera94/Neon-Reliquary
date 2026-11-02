import { describe, it, expect } from 'vitest'
import { translate, translations } from './i18n'

describe('i18n translation system', () => {
  it('translates navigation keys in English and Italian', () => {
    expect(translate('nav.status', 'en')).toBe('Status')
    expect(translate('nav.status', 'it')).toBe('Stato')

    expect(translate('nav.combat', 'en')).toBe('Combat')
    expect(translate('nav.combat', 'it')).toBe('Combattimento')

    expect(translate('nav.spells', 'en')).toBe('Spells')
    expect(translate('nav.spells', 'it')).toBe('Incantesimi')

    expect(translate('nav.skills', 'en')).toBe('Skills')
    expect(translate('nav.skills', 'it')).toBe('Abilità')

    expect(translate('nav.features', 'en')).toBe('Features')
    expect(translate('nav.features', 'it')).toBe('Capacità')

    expect(translate('nav.inventory', 'en')).toBe('Inventory')
    expect(translate('nav.inventory', 'it')).toBe('Inventario')

    expect(translate('nav.companion', 'en')).toBe('Companion')
    expect(translate('nav.companion', 'it')).toBe('Compagno')
  })

  it('interpolates parameters correctly', () => {
    expect(translate('sheets.changeStatusAria', 'it', { name: 'Knam' })).toBe('Cambia stato scheda Knam')
    expect(translate('sheets.changeStatusAria', 'en', { name: 'Knam' })).toBe('Change sheet status for Knam')

    expect(translate('sheets.byPlayer', 'it', { name: 'Andrea' })).toBe('di Andrea')
    expect(translate('sheets.byPlayer', 'en', { name: 'Andrea' })).toBe('by Andrea')
  })

  it('falls back to English when a key is missing in another language', () => {
    // Non-existent key falls back to the key string
    expect(translate('non.existent.key', 'it')).toBe('non.existent.key')
  })

  it('translates combat action buttons without altering rules data', () => {
    expect(translate('combat.rollAndDischarge', 'en')).toBe('Roll & Discharge')
    expect(translate('combat.rollAndDischarge', 'it')).toBe('Tira & Scarica')
    expect(translate('combat.vsMetal', 'en')).toBe('+3 vs Metal')
    expect(translate('combat.vsMetal', 'it')).toBe('+3 vs Metallo')
  })

  it('has identical keys in English and Italian dictionaries', () => {
    const enSections = Object.keys(translations.en) as Array<keyof typeof translations.en>
    const itSections = Object.keys(translations.it) as Array<keyof typeof translations.it>

    expect(enSections.sort()).toEqual(itSections.sort())

    for (const section of enSections) {
      const enKeys = Object.keys(translations.en[section]).sort()
      const itKeys = Object.keys(translations.it[section]).sort()
      expect(enKeys).toEqual(itKeys)
    }
  })
})
