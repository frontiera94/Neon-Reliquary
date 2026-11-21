import type { InspectorItem } from '../types/inspector'
import type { ConditionType } from '../types/combat'
import type { Spell } from '../types/resources'
import type { Feat, ClassAbility } from '../types/features'
import { useLocaleStore } from '../store/useLocaleStore'
import {
  getConditionInfo,
  translate,
  translateSchool,
  translateFeat,
  translateClassAbility,
} from '../i18n'

export function conditionInspectorItem(condition: ConditionType, onRemove?: () => void): InspectorItem {
  const locale = useLocaleStore.getState().locale
  const info = getConditionInfo(condition, locale)
  return {
    type: 'condition',
    id: condition,
    title: info.name,
    subtitle: info.summary,
    description: info.summary,
    tags: [translate(locale, 'hud.conditionTag')],
    notes: info.penalties,
    actions: onRemove
      ? [{ label: translate(locale, 'hud.removeCondition'), onClick: onRemove, variant: 'danger' }]
      : undefined,
  }
}

export function spellInspectorItem(
  spell: Spell,
  options: { dc?: number; attackBonus?: number; tags?: string[]; actions?: InspectorItem['actions'] } = {}
): InspectorItem {
  const locale = useLocaleStore.getState().locale
  const schoolName = translateSchool(spell.school, locale)
  const meta: InspectorItem['meta'] = [
    { label: translate(locale, 'common.level'), value: spell.level },
    { label: translate(locale, 'spells.school'), value: `${schoolName}${spell.subschool ? ` (${spell.subschool})` : ''}` },
    { label: translate(locale, 'spells.castingTime'), value: spell.castingTime },
    { label: translate(locale, 'spells.range'), value: spell.range },
    { label: translate(locale, 'spells.duration'), value: spell.duration },
    { label: translate(locale, 'spells.savingThrow'), value: spell.savingThrow ?? translate(locale, 'common.none') },
    { label: translate(locale, 'spells.spellResistance'), value: spell.spellResistance ? translate(locale, 'common.yes') : translate(locale, 'common.no') },
    { label: translate(locale, 'spells.components'), value: spell.components },
  ]
  if (options.dc !== undefined) meta.push({ label: translate(locale, 'spells.saveDc'), value: options.dc })
  if (options.attackBonus !== undefined) meta.push({ label: translate(locale, 'combat.attack'), value: options.attackBonus })

  const srTag = locale === 'it' ? 'RI: Sì' : 'SR: Yes'
  return {
    type: 'spell',
    id: spell.id,
    title: spell.name,
    subtitle: `${translate(locale, 'common.level')} ${spell.level} · ${schoolName}`,
    description: spell.description,
    tags: [`${translate(locale, 'common.lvl')} ${spell.level}`, schoolName, ...(spell.spellResistance ? [srTag] : []), ...(options.tags ?? [])],
    meta,
    actions: options.actions,
  }
}

export function featInspectorItem(feat: Feat): InspectorItem {
  const locale = useLocaleStore.getState().locale
  const tr = translateFeat(feat, locale)
  return {
    type: 'feat',
    id: feat.id,
    title: tr.name,
    subtitle: tr.shortDesc,
    description: tr.fullDesc || tr.shortDesc,
    tags: [locale === 'it' ? 'Talento' : 'Feat'],
    meta:
      feat.bonusValue !== undefined && feat.bonusMax !== undefined
        ? [{ label: feat.bonusLabel ?? translate(locale, 'common.uses'), value: `${feat.bonusValue} / ${feat.bonusMax}` }]
        : undefined,
  }
}

export function classAbilityInspectorItem(ability: ClassAbility): InspectorItem {
  const locale = useLocaleStore.getState().locale
  const isIt = locale === 'it'
  const tr = translateClassAbility(ability, locale)
  return {
    type: 'ability',
    id: ability.id,
    title: tr.name,
    subtitle: ability.isSignature
      ? isIt ? 'Capacità di classe distintiva' : 'Signature class ability'
      : isIt ? 'Capacità di classe' : 'Class ability',
    description: tr.description,
    tags: [
      isIt ? 'Capacità di Classe' : 'Class Ability',
      ...(ability.isSignature ? [isIt ? 'Distintiva' : 'Signature'] : []),
    ],
  }
}
