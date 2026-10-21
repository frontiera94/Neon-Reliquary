import type { FullCharacter } from '../store/useCharacterStore'
import type { SessionState } from '../types/session'
import type { DailyResource } from '../types/resources'

export type ActionEconomyType =
  | 'standard'
  | 'move'
  | 'swift'
  | 'immediate'
  | 'full-round'
  | 'passive'

export interface CategorizedFeature {
  id: string
  name: string
  actionType: ActionEconomyType
  shortDesc: string
  fullDesc: string
  resourceId?: string
  remainingUses?: number
  maxUses?: number
  isDefensive?: boolean
  source: 'feat' | 'classAbility'
}

export interface DefensiveBadge {
  id: string
  name: string
  stat: 'AC' | 'Touch AC' | 'Flat-Footed AC' | 'Reflex Save' | 'Fortitude Save' | 'Will Save'
  description: string
}

export const ACTION_ECONOMY_ORDER: ActionEconomyType[] = [
  'standard',
  'full-round',
  'swift',
  'move',
  'immediate',
  'passive',
]

export const ACTION_ECONOMY_LABEL: Record<ActionEconomyType, string> = {
  standard: 'Standard',
  'full-round': 'Full-Round',
  swift: 'Swift',
  move: 'Move',
  immediate: 'Immediate',
  passive: 'Passive',
}

/**
 * Classifies free-form rules text into a PF1e action-economy bucket.
 * Order matters: full-round and immediate are checked before the generic
 * "action" match.
 */
export function classifyActionEconomy(text: string): ActionEconomyType {
  const value = text.toLowerCase()
  if (/immediate action|azione immediata/.test(value)) return 'immediate'
  if (/full[- ]?round|round completo|flurry of blows/.test(value)) return 'full-round'
  if (/swift action|azione veloce|azione rapida|\bki pool\b|\bjudgment\b|\bbane\b/.test(value)) return 'swift'
  if (/move action|azione di movimento|\bcackle\b/.test(value)) return 'move'
  if (/standard action|azione standard/.test(value)) return 'standard'
  return 'passive'
}

const DEFENSIVE_RULES: { pattern: RegExp; stat: DefensiveBadge['stat'] }[] = [
  { pattern: /evasion/i, stat: 'Reflex Save' },
  { pattern: /uncanny dodge/i, stat: 'Flat-Footed AC' },
  { pattern: /canny defense/i, stat: 'AC' },
  { pattern: /monk ac bonus/i, stat: 'AC' },
  { pattern: /dodge/i, stat: 'AC' },
  { pattern: /still mind/i, stat: 'Will Save' },
  { pattern: /resistance/i, stat: 'Fortitude Save' },
  { pattern: /deflect arrows/i, stat: 'AC' },
]

export function getDefensiveBadges(character: FullCharacter): DefensiveBadge[] {
  const badges: DefensiveBadge[] = []
  const pool = [...character.classAbilities, ...character.feats]

  for (const feature of pool) {
    const description = 'description' in feature ? feature.description : feature.fullDesc
    for (const rule of DEFENSIVE_RULES) {
      if (rule.pattern.test(`${feature.name} ${description}`)) {
        if (!badges.some((badge) => badge.name === feature.name)) {
          badges.push({
            id: feature.id,
            name: feature.name,
            stat: rule.stat,
            description,
          })
        }
        break
      }
    }
  }

  // Racial / passive defenses that live outside class abilities.
  if (/tiefling/i.test(character.race)) {
    badges.push({
      id: 'racial-fiendish-resistance',
      name: 'Fiendish Resistance',
      stat: 'Fortitude Save',
      description: 'Tieflings have cold, electricity and fire resistance 5.',
    })
  }
  if (/halfling/i.test(character.race)) {
    badges.push({
      id: 'racial-halfling-luck',
      name: 'Halfling Luck',
      stat: 'Reflex Save',
      description: '+1 racial bonus on all saving throws.',
    })
  }

  return badges
}

function findLinkedResource(
  dailyResources: DailyResource[],
  featureName: string,
  description: string
): DailyResource | undefined {
  const text = `${featureName} ${description}`.toLowerCase()
  return dailyResources.find((resource) => {
    const key = `${resource.id} ${resource.name}`.toLowerCase()
    if (/\bki\b/.test(text) && /\bki\b/.test(key)) return true
    if (/(rage|bloodrage|ira)/.test(text) && /(rage|bloodrage|ira)/.test(key)) return true
    if (/arcane pool/.test(text) && /arcane.?pool/.test(key)) return true
    if (/stunning fist/.test(text) && /stunning/.test(key)) return true
    if (/judg/.test(text) && /judg/.test(key)) return true
    if (/wild shape/.test(text) && /wild.?shape/.test(key)) return true
    if (/\bbane\b/.test(text) && /\bbane\b/.test(key)) return true
    if (/darkness/.test(text) && /darkness/.test(key)) return true
    return false
  })
}

/**
 * Converts the static feat / class-ability lists into context-aware combat
 * features, with action economy and linked daily-resource usage counters.
 */
export function categorizeFeatures(
  character: FullCharacter,
  session: SessionState
): CategorizedFeature[] {
  const features: CategorizedFeature[] = []

  for (const feat of character.feats) {
    const text = `${feat.shortDesc} ${feat.fullDesc}`
    const resource = findLinkedResource(character.dailyResources, feat.name, text)
    features.push({
      id: feat.id,
      name: feat.name,
      actionType: classifyActionEconomy(text),
      shortDesc: feat.shortDesc,
      fullDesc: feat.fullDesc,
      resourceId: resource?.id,
      maxUses: resource?.total,
      remainingUses: resource
        ? Math.max(0, resource.total - (session.spentResources[resource.id] ?? 0))
        : undefined,
      isDefensive: /evasion|uncanny dodge|dodge|deflect|resistance/i.test(feat.name),
      source: 'feat',
    })
  }

  for (const ability of character.classAbilities) {
    const resource = findLinkedResource(character.dailyResources, ability.name, ability.description)
    features.push({
      id: ability.id,
      name: ability.name,
      actionType: classifyActionEconomy(ability.description),
      shortDesc: ability.description,
      fullDesc: ability.description,
      resourceId: resource?.id,
      maxUses: resource?.total,
      remainingUses: resource
        ? Math.max(0, resource.total - (session.spentResources[resource.id] ?? 0))
        : undefined,
      isDefensive: /evasion|uncanny dodge|dodge|deflect|resistance|still mind|ac bonus/i.test(ability.name),
      source: 'classAbility',
    })
  }

  return features.sort(
    (a, b) => ACTION_ECONOMY_ORDER.indexOf(a.actionType) - ACTION_ECONOMY_ORDER.indexOf(b.actionType)
  )
}
