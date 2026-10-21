import type { InspectorItem } from '../types/inspector'
import type { ConditionType } from '../types/combat'
import type { Spell } from '../types/resources'
import type { Feat, ClassAbility } from '../types/features'
import { CONDITION_INFO } from './conditions'

export function conditionInspectorItem(condition: ConditionType, onRemove?: () => void): InspectorItem {
  const info = CONDITION_INFO[condition]
  return {
    type: 'condition',
    id: condition,
    title: info.name,
    subtitle: info.summary,
    description: info.summary,
    tags: ['Condition'],
    notes: info.penalties,
    actions: onRemove
      ? [{ label: 'Remove condition', onClick: onRemove, variant: 'danger' }]
      : undefined,
  }
}

export function spellInspectorItem(
  spell: Spell,
  options: { dc?: number; attackBonus?: number; tags?: string[]; actions?: InspectorItem['actions'] } = {}
): InspectorItem {
  const meta: InspectorItem['meta'] = [
    { label: 'Level', value: spell.level },
    { label: 'School', value: `${spell.school}${spell.subschool ? ` (${spell.subschool})` : ''}` },
    { label: 'Casting Time', value: spell.castingTime },
    { label: 'Range', value: spell.range },
    { label: 'Duration', value: spell.duration },
    { label: 'Saving Throw', value: spell.savingThrow ?? 'None' },
    { label: 'Spell Resistance', value: spell.spellResistance ? 'Yes' : 'No' },
    { label: 'Components', value: spell.components },
  ]
  if (options.dc !== undefined) meta.push({ label: 'Spell DC', value: options.dc })
  if (options.attackBonus !== undefined) meta.push({ label: 'Attack', value: options.attackBonus })

  return {
    type: 'spell',
    id: spell.id,
    title: spell.name,
    subtitle: `Level ${spell.level} · ${spell.school}`,
    description: spell.description,
    tags: [`Lv ${spell.level}`, spell.school, ...(spell.spellResistance ? ['SR: Yes'] : []), ...(options.tags ?? [])],
    meta,
    actions: options.actions,
  }
}

export function featInspectorItem(feat: Feat): InspectorItem {
  return {
    type: 'feat',
    id: feat.id,
    title: feat.name,
    subtitle: feat.shortDesc,
    description: feat.fullDesc || feat.shortDesc,
    tags: ['Feat'],
    meta:
      feat.bonusValue !== undefined && feat.bonusMax !== undefined
        ? [{ label: feat.bonusLabel ?? 'Uses', value: `${feat.bonusValue} / ${feat.bonusMax}` }]
        : undefined,
  }
}

export function classAbilityInspectorItem(ability: ClassAbility): InspectorItem {
  return {
    type: 'ability',
    id: ability.id,
    title: ability.name,
    subtitle: ability.isSignature ? 'Signature class ability' : 'Class ability',
    description: ability.description,
    tags: ['Class Ability', ...(ability.isSignature ? ['Signature'] : [])],
  }
}
