import { useMemo } from 'react'
import { useCharacterStore, type FullCharacter } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useInspectorStore } from '../../store/useInspectorStore'
import type { SessionState } from '../../types/session'
import type { InspectorItem } from '../../types/inspector'
import {
  ACTION_ECONOMY_LABEL,
  categorizeFeatures,
  getDefensiveBadges,
  type CategorizedFeature,
  type DefensiveBadge,
} from '../../lib/action-economy'

const GROUP_ORDER = ['standard', 'swift', 'move', 'immediate', 'full-round', 'passive'] as const
const COMBAT_RE = /flurry|ki pool|ki strike|ki dodge|judgment|bane|spell combat|spellstrike|power attack|stunning fist|fire bolt|wild shape|hex|bloodrage|sneak attack|smite|channel|rage|two.weapon|combat casting|weapon finesse|dodge|evasion|uncanny|deflect|natural armor|furious focus/i

function isSignatureFeature(character: FullCharacter, feature: CategorizedFeature): boolean {
  return feature.source === 'classAbility' && character.classAbilities.some((a) => a.id === feature.id && a.isSignature)
}

function featureInspectorItem(
  character: FullCharacter,
  feature: CategorizedFeature,
  onSpend?: () => void
): InspectorItem {
  const actions: InspectorItem['actions'] = []
  if (feature.resourceId && (feature.remainingUses ?? 0) > 0 && onSpend) {
    const resourceName =
      character.dailyResources.find((resource) => resource.id === feature.resourceId)?.name ??
      feature.resourceId
    actions.push({ label: `Spend 1 ${resourceName}`, onClick: onSpend, variant: 'primary' })
  }

  const signature = isSignatureFeature(character, feature)
  return {
    type: signature ? 'ability' : 'feat',
    id: feature.id,
    title: feature.name,
    subtitle: `${ACTION_ECONOMY_LABEL[feature.actionType]} action${signature ? ' · Signature ability' : ''}`,
    description: feature.fullDesc || feature.shortDesc,
    tags: [
      ACTION_ECONOMY_LABEL[feature.actionType],
      feature.source === 'classAbility' ? 'Class Ability' : 'Feat',
      ...(feature.isDefensive ? ['Defensive'] : []),
    ],
    meta:
      feature.resourceId && feature.maxUses !== undefined
        ? [
            {
              label: 'Resource',
              value:
                character.dailyResources.find((resource) => resource.id === feature.resourceId)?.name ??
                feature.resourceId,
            },
            { label: 'Remaining', value: `${feature.remainingUses ?? 0} / ${feature.maxUses}` },
          ]
        : undefined,
    actions,
  }
}

export interface ContextualCombatFeaturesProps {
  character?: FullCharacter
  session?: SessionState
  className?: string
  maxPassive?: number
  compact?: boolean
  limit?: number
}

/**
 * Contextual, action-economy-grouped combat abilities with inline resource
 * tracking. Clicking a feature opens the lateral inspector instead of routing.
 */
export function ContextualCombatFeatures({
  character: characterProp,
  session: sessionProp,
  className = '',
  maxPassive = 4,
  compact = false,
  limit,
}: ContextualCombatFeaturesProps) {
  const storeCharacter = useCharacterStore((s) => s.activeCharacter())
  const character = characterProp ?? storeCharacter
  const storeSession = useSessionStore((s) => (character ? s.getSession(character.id) : null))
  const session = sessionProp ?? storeSession
  const openInspector = useInspectorStore((s) => s.openInspector)
  const spendResource = useSessionStore((s) => s.spendResource)
  const setResourceSpent = useSessionStore((s) => s.setResourceSpent)

  const features = useMemo(() => {
    if (!character || !session) return []
    const list = categorizeFeatures(character, session).filter(
      (feature) => COMBAT_RE.test(`${feature.name} ${feature.shortDesc}`) || feature.resourceId || feature.isDefensive
    )
    return limit ? list.slice(0, limit) : list
  }, [character, session, limit])

  const groups = useMemo(() => {
    const grouped: Partial<Record<(typeof GROUP_ORDER)[number], CategorizedFeature[]>> = {}
    for (const feature of features) {
      const bucket = (grouped[feature.actionType] ??= [])
      bucket.push(feature)
    }
    if (grouped.passive && grouped.passive.length > maxPassive) {
      grouped.passive = grouped.passive.slice(0, maxPassive)
    }
    return grouped
  }, [features, maxPassive])

  if (!character || !session || features.length === 0) return null

  return (
    <section className={`bg-[#11131c] border border-white/10 rounded-xl ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-headline text-sm uppercase tracking-widest text-secondary font-bold">
          Combat Features
        </h3>
        <span className="font-label text-[10px] text-tertiary tabular-nums uppercase tracking-wider">
          {features.length} available
        </span>
      </div>

      <div className="space-y-3">
        {GROUP_ORDER.map((actionType) => {
          const group = groups[actionType]
          if (!group || group.length === 0) return null
          return (
            <div key={actionType}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-label text-[9px] uppercase tracking-[0.18em] text-primary font-bold">
                  {ACTION_ECONOMY_LABEL[actionType]}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-1.5`}>
                {group.map((feature) => {
                  const empty = feature.resourceId !== undefined && (feature.remainingUses ?? 0) <= 0
                  const signature = isSignatureFeature(character, feature)
                  const resourceName = feature.resourceId
                    ? character.dailyResources.find((resource) => resource.id === feature.resourceId)?.name
                    : undefined
                  return (
                    <div
                      key={feature.id}
                      data-testid="combat-feature"
                      className={`bg-[#181b26] border rounded-xl p-2.5 flex flex-col gap-1.5 ${
                        signature ? 'border-secondary/40' : 'border-white/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          openInspector(
                            featureInspectorItem(character, feature, () => {
                              if (!feature.resourceId) return
                              const spent = session.spentResources?.[feature.resourceId] ?? 0
                              setResourceSpent(
                                character.id,
                                feature.resourceId,
                                Math.min(feature.maxUses ?? 0, spent + 1)
                              )
                            })
                          )
                        }}
                        className="text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded"
                      >
                        <p className="font-label text-[11px] font-bold text-white group-hover:text-primary transition-colors leading-tight">
                          {feature.name}
                        </p>
                        <p className="font-body text-[10px] text-tertiary leading-snug line-clamp-2 mt-0.5">
                          {feature.shortDesc}
                        </p>
                      </button>

                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <span
                          className={`font-label text-[9px] uppercase tracking-wider px-1.5 py-0.5 border rounded ${
                            feature.actionType === 'passive'
                              ? 'border-white/10 text-tertiary'
                              : 'border-primary/30 text-primary bg-primary/10'
                          }`}
                        >
                          {ACTION_ECONOMY_LABEL[feature.actionType]}
                        </span>

                        {feature.resourceId ? (
                          <button
                            type="button"
                            disabled={empty}
                            onClick={() => spendResource(character.id, feature.resourceId!, feature.maxUses ?? 0)}
                            className={`min-h-[44px] min-w-[44px] px-2 font-label text-[10px] font-bold tabular-nums border rounded-lg transition-colors ${
                              empty
                                ? 'border-white/10 text-tertiary/50 cursor-not-allowed'
                                : 'border-primary/40 text-primary hover:bg-primary/15 cursor-pointer'
                            }`}
                            aria-label={`Use ${feature.name}`}
                            title={resourceName}
                          >
                            {feature.remainingUses}/{feature.maxUses}
                          </button>
                        ) : feature.isDefensive ? (
                          <span className="font-label text-[9px] text-[#00daf3] uppercase tracking-wider">Defensive</span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function badgeTone(badge: DefensiveBadge): 'primary' | 'secondary' {
  return /evasion|uncanny/i.test(badge.name) ? 'primary' : 'secondary'
}

export function DefensiveBadges({
  character: characterProp,
  className = '',
  compact = false,
}: {
  character?: FullCharacter
  className?: string
  compact?: boolean
}) {
  const storeCharacter = useCharacterStore((s) => s.activeCharacter())
  const character = characterProp ?? storeCharacter
  const openInspector = useInspectorStore((s) => s.openInspector)
  const badges = useMemo(() => (character ? getDefensiveBadges(character) : []), [character])
  if (!character || badges.length === 0) return null

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'mt-2' : ''} ${className}`} aria-label="Defensive abilities">
      {badges.map((badge) => {
        const tone = badgeTone(badge)
        return (
          <button
            key={badge.id}
            type="button"
            data-testid="defensive-badge"
            onClick={() =>
              openInspector({
                type: 'ability',
                id: badge.id,
                title: badge.name,
                subtitle: `Defensive reaction · ${badge.stat}`,
                description: badge.description,
                tags: ['Defensive', badge.stat],
              })
            }
            className={`min-h-[44px] px-2.5 py-1 rounded-lg border font-label text-[9px] uppercase tracking-wider font-bold cursor-pointer transition-all hover:brightness-125 ${
              tone === 'primary'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-secondary/40 bg-secondary/10 text-secondary'
            }`}
            title={`${badge.name} — ${badge.stat}`}
          >
            {badge.name}
          </button>
        )
      })}
    </div>
  )
}
