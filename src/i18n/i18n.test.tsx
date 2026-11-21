// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useLocaleStore } from '../store/useLocaleStore'
import { useCharacterStore, type FullCharacter } from '../store/useCharacterStore'
import { useSessionStore } from '../store/useSessionStore'
import {
  translate,
  translateSkillName,
  translateAbilityShort,
  translateSaveName,
  translateSchool,
  translateManeuverName,
  translateSize,
  translateNaturalAttack,
  translateTrick,
  translateCompanionType,
  translateAlignment,
  translateDamageType,
  translateSpellRange,
  translateSpellDuration,
  translateSpellSave,
  translateCastingTime,
  getConditionInfo,
  translateClassName,
  translateRaceName,
  translateBuffName,
  translateResourceName,
  translateClassAbility,
  translateFeat,
} from './index'
import { en } from './en'
import { it as itDict } from './it'
import { LanguageFlagSwitcher } from '../components/layout/LanguageFlagButton'
import { Sidebar } from '../components/layout/Sidebar'
import { SettingsPanel } from '../components/layout/SettingsPanel'
import { CompanionPage } from '../pages/CompanionPage'

const mockChar: FullCharacter = {
  id: 'test-druid-companion',
  name: 'Noorie Test',
  class: 'Druid',
  level: 4,
  race: 'Human',
  alignment: 'TN',
  maxHp: 28,
  initiativeBonus: 2,
  speed: 30,
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 16, cha: 10 },
  armorClass: {
    total: 15,
    touch: 12,
    flatFooted: 13,
    armorBonus: 3,
    shieldBonus: 0,
    dexBonus: 2,
    naturalArmor: 0,
    deflection: 0,
    misc: 0,
    spellFailureChance: 0,
  },
  baseAttackBonus: [3],
  savingThrows: { fort: 5, ref: 3, will: 7, fortBase: 4, refBase: 1, willBase: 4 },
  skills: [],
  weapons: [],
  buffs: [],
  dailyResources: [],
  feats: [],
  classAbilities: [],
  spellSlots: [],
  spells: [],
  inventory: [],
}

describe('i18n & Italian Flag Switcher', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' })
    useCharacterStore.setState({
      characters: [mockChar],
      activeCharacterId: 'test-druid-companion',
    })
    useSessionStore.getState().initSession('test-druid-companion', 28)
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
    expect(translate('it', 'combat.attackN', { n: 1 })).toBe('1° Attacco')
    expect(translate('it', 'bento.hitPoints')).toBe('Punti Ferita')
    expect(translate('it', 'companion.manifestDesc', { name: 'Noorie' })).toContain('Noorie')
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

  it('translates combat maneuvers, sizes, natural attacks, tricks, and companion types', () => {
    // Maneuvers
    expect(translateManeuverName('Trip', 'it')).toBe('Sgambettare')
    expect(translateManeuverName('Disarm', 'it')).toBe('Disarmare')
    expect(translateManeuverName('Grapple', 'it')).toBe('Lottare')
    expect(translateManeuverName('Bull Rush', 'it')).toBe('Spingere')
    expect(translateManeuverName('Dirty Trick', 'it')).toBe('Manovra Sporca')
    expect(translateManeuverName('Trip', 'en')).toBe('Trip')

    // Sizes
    expect(translateSize('Small', 'it')).toBe('Piccola')
    expect(translateSize('Medium', 'it')).toBe('Media')
    expect(translateSize('Large', 'it')).toBe('Grande')
    expect(translateSize('Medium', 'en')).toBe('Medium')

    // Natural Attacks
    expect(translateNaturalAttack('Bite', 'it')).toBe('Morso')
    expect(translateNaturalAttack('Claw', 'it')).toBe('Artiglio')
    expect(translateNaturalAttack('Gore', 'it')).toBe('Incornata')
    expect(translateNaturalAttack('Slam', 'it')).toBe('Schianto')

    // Animal Tricks
    expect(translateTrick('Attack', 'it')).toBe('Attaccare')
    expect(translateTrick('Defend', 'it')).toBe('Difendere')
    expect(translateTrick('Heel', 'it')).toBe('Al Piede')
    expect(translateTrick('Fetch', 'it')).toBe('Riportare')

    // Companion Types
    expect(translateCompanionType('animal_companion', 'it')).toBe('Compagno Animale')
    expect(translateCompanionType('familiar', 'it')).toBe('Famiglio')
    expect(translateCompanionType('eidolon', 'it')).toBe('Eidolon')

    // Alignments
    expect(translateAlignment('Lawful Good', 'it')).toBe('Legale Buono')
    expect(translateAlignment('Chaotic Neutral', 'it')).toBe('Caotico Neutrale')

    // Damage Types
    expect(translateDamageType('slashing', 'it')).toBe('Tagliente')
    expect(translateDamageType('fire', 'it')).toBe('Fuoco')

    // Spell ranges and parameters
    expect(translateSpellRange('Touch', 'it')).toBe('Contatto')
    expect(translateSpellRange('Personal', 'it')).toBe('Personale')
    expect(translateSpellDuration('Instantaneous', 'it')).toBe('Istantanea')
    expect(translateSpellSave('None', 'it')).toBe('Nessuno')
    expect(translateCastingTime('1 standard action', 'it')).toBe('1 azione standard')
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

  it('renders CompanionPage in Italian when locale is set to it', () => {
    useLocaleStore.getState().setLocale('it')
    render(
      <MemoryRouter>
        <CompanionPage />
      </MemoryRouter>
    )

    // With no active companion, displays Italian empty manifest state
    expect(screen.getByText('Evoca un Compagno')).toBeInTheDocument()
    expect(screen.getByText(/non ha al momento un compagno attivo/i)).toBeInTheDocument()
  })

  it('has complete key parity between en and it dictionaries', () => {
    function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      const keys: string[] = []
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === 'object') {
          keys.push(...collectKeys(v as Record<string, unknown>, path))
        } else {
          keys.push(path)
        }
      }
      return keys
    }

    const enKeys = collectKeys(en as unknown as Record<string, unknown>)
    const itKeys = new Set(collectKeys(itDict as unknown as Record<string, unknown>))
    const missing = enKeys.filter((k) => !itKeys.has(k))
    expect(missing).toEqual([])
  })

  it('translates PF1e classes, races, buffs, resources, class abilities, and feats into Italian', () => {
    expect(translateClassName('Monk', 'it')).toBe('Monaco')
    expect(translateClassName('Witch', 'it')).toBe('Strega')
    expect(translateRaceName('Human', 'it')).toBe('Umano')
    expect(translateRaceName('Half-Elf', 'it')).toBe('Mezzelfo')
    expect(translateBuffName('Mage Armor', 'it')).toBe('Armatura Magica')
    expect(translateResourceName('Ki Pool', 'it')).toBe('Riserva Ki')

    const ability = translateClassAbility(
      { name: 'Evasion', description: 'If Agelmund succeeds on a Reflex saving throw...' },
      'it'
    )
    expect(ability.name).toBe('Eludere')
    expect(ability.description).toContain('Riflessi')

    const feat = translateFeat(
      { name: 'Power Attack', shortDesc: '...', fullDesc: '...' },
      'it'
    )
    expect(feat.name).toBe('Attacco Poderoso')
    expect(feat.shortDesc).toContain('tiro per colpire')
  })
})
