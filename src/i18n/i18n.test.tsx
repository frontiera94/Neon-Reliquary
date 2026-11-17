// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useLocaleStore } from '../store/useLocaleStore'
import {
  translate,
  translateSkillName,
  translateAbilityShort,
  translateSaveName,
  translateSchool,
  getConditionInfo,
} from './index'
import { LanguageFlagSwitcher } from '../components/layout/LanguageFlagButton'
import { Sidebar } from '../components/layout/Sidebar'
import { SettingsPanel } from '../components/layout/SettingsPanel'

describe('i18n & Italian Flag Switcher', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' })
  })

  it('defaults to en and switches to it', () => {
    expect(useLocaleStore.getState().locale).toBe('en')
    useLocaleStore.getState().setLocale('it')
    expect(useLocaleStore.getState().locale).toBe('it')
    useLocaleStore.getState().toggleLocale()
    expect(useLocaleStore.getState().locale).toBe('en')
  })

  it('translates UI keys and interpolates parameters', () => {
    expect(translate('en', 'nav.combat')).toBe('Combat')
    expect(translate('it', 'nav.combat')).toBe('Combattimento')
    expect(translate('it', 'settings.savedAt', { time: '21:50' })).toBe('Salvato alle 21:50')
  })

  it('translates Pathfinder 1E skills, abilities, saves, schools, and conditions', () => {
    expect(translateSkillName('Perception', 'it')).toBe('Percezione')
    expect(translateSkillName('Knowledge (Arcana)', 'it')).toBe('Conoscenze (Arcane)')
    expect(translateSkillName('Sleight of Hand', 'it')).toBe('Rapidità di Mano')
    expect(translateAbilityShort('str', 'it')).toBe('FOR')
    expect(translateAbilityShort('wis', 'it')).toBe('SAG')
    expect(translateSaveName('fort', 'it')).toBe('Tempra')
    expect(translateSaveName('will', 'it', true)).toBe('Vol')
    expect(translateSchool('Evocation', 'it')).toBe('Invocazione')
    expect(getConditionInfo('shaken', 'it').name).toBe('Scosso')
    expect(getConditionInfo('blinded', 'it').name).toBe('Accecato')
  })

  it('switches Sidebar and SettingsPanel to Italian when clicking the Italiano flag', () => {
    render(
      <MemoryRouter>
        <LanguageFlagSwitcher variant="pill" />
        <Sidebar />
        <SettingsPanel isOpen={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('Combat')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Italiano' })[0])

    expect(useLocaleStore.getState().locale).toBe('it')
    expect(screen.getByText('Combattimento')).toBeInTheDocument()
    expect(screen.getByText('Impostazioni')).toBeInTheDocument()
    expect(screen.getByText('Tiro Personalizzato')).toBeInTheDocument()
  })
})
