// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  conditionInspectorItem,
  spellInspectorItem,
  featInspectorItem,
  classAbilityInspectorItem,
} from './inspector-items'
import { useLocaleStore } from '../store/useLocaleStore'
import type { Spell } from '../types/resources'

const sampleSpell: Spell = {
  id: 'sp-sg',
  name: 'Shocking Grasp',
  level: 1,
  school: 'Evocation',
  subschool: 'Electricity',
  castingTime: '1 standard action',
  range: 'Touch',
  duration: 'Instantaneous',
  savingThrow: undefined,
  spellResistance: true,
  components: 'V, S',
  description: 'Your successful melee touch attack deals 1d6 points of electricity damage per caster level.',
}

describe('inspector-items', () => {
  beforeEach(() => {
    useLocaleStore.setState({ locale: 'en' })
  })

  it('builds condition inspector items in EN and IT with optional remove action', () => {
    const enItem = conditionInspectorItem('fatigued', () => {})
    expect(enItem.type).toBe('condition')
    expect(enItem.actions).toHaveLength(1)

    useLocaleStore.setState({ locale: 'it' })
    const itItem = conditionInspectorItem('fatigued')
    expect(itItem.actions).toBeUndefined()
    expect(itItem.tags?.[0]).toBeTruthy()
  })

  it('builds spell inspector item with DC, attack bonus, SR tag and optional fields', () => {
    const item = spellInspectorItem(sampleSpell, { dc: 15, attackBonus: 7, tags: ['Touch'] })
    expect(item.type).toBe('spell')
    expect(item.tags).toContain('SR: Yes')
    expect(item.tags).toContain('Touch')
    expect(item.meta?.some((m) => m.value === 15)).toBe(true)
    expect(item.meta?.some((m) => m.value === 7)).toBe(true)

    useLocaleStore.setState({ locale: 'it' })
    const itItem = spellInspectorItem({ ...sampleSpell, subschool: undefined, spellResistance: false })
    expect(itItem.tags).not.toContain('RI: Sì')
  })

  it('builds feat and classAbility inspector items', () => {
    const feat = featInspectorItem({
      index: 0,
      id: 'f1',
      name: 'Power Attack',
      shortDesc: 'Trade attack for damage',
      fullDesc: '',
      bonusValue: 2,
      bonusMax: 5,
    })
    expect(feat.description).toBe('Trade attack for damage')
    expect(feat.meta).toHaveLength(1)

    const ability = classAbilityInspectorItem({
      id: 'a1',
      name: 'Arcane Pool',
      description: 'Enhance weapon',
      isSignature: true,
    })
    expect(ability.tags).toContain('Signature')
  })
})
