import { useMemo, useState } from 'react'
import { useCharacterStore, type FullCharacter } from '../../store/useCharacterStore'
import { useSessionStore } from '../../store/useSessionStore'
import { useInspectorStore } from '../../store/useInspectorStore'
import { useDiceStore } from '../../store/useDiceStore'
import type { SessionState } from '../../types/session'
import type { InspectorItem } from '../../types/inspector'
import type { DebilitatingInjuryType } from '../../types/class-mechanics'
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
  /** Fold the feature grid into a single summary row. */
  collapsible?: boolean
  defaultCollapsed?: boolean
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
  collapsible = false,
  defaultCollapsed = false,
}: ContextualCombatFeaturesProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsible && defaultCollapsed)
  const storeCharacter = useCharacterStore((s) => s.activeCharacter())
  const character = characterProp ?? storeCharacter
  const storeSession = useSessionStore((s) => (character ? s.getSession(character.id) : null))
  const session = sessionProp ?? storeSession
  const openInspector = useInspectorStore((s) => s.openInspector)
  const openRoll = useDiceStore((s) => s.openRoll)
  const spendResource = useSessionStore((s) => s.spendResource)
  const setResourceSpent = useSessionStore((s) => s.setResourceSpent)
  const applyDebilitatingInjury = useSessionStore((s) => s.applyDebilitatingInjury)
  const setUnderhanded = useSessionStore((s) => s.setUnderhanded)
  const [debInjuryMode, setDebInjuryMode] = useState<DebilitatingInjuryType>('bewildered')
  const [debInjuryTarget, setDebInjuryTarget] = useState('')

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

  const isRogue = character ? (character.id === 'mariano-cardamomo' || /rogue/i.test(character.class)) : false
  const rogueState = session?.classMechanics?.rogue
  const debilitatingInjury = rogueState?.debilitatingInjury
  const underhandedAvailable = rogueState?.underhandedAvailable ?? true

  const summary = GROUP_ORDER.map((actionType) => {
    const count = groups[actionType]?.length ?? 0
    return count > 0 ? `${ACTION_ECONOMY_LABEL[actionType]} ${count}` : null
  })
    .filter(Boolean)
    .join(' · ')

  return (
    <section className={`rounded-2xl border border-white/10 bg-surface-container/70 backdrop-blur-sm ${compact ? 'p-3' : 'p-4'} ${className}`}>
      <div
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onClick={collapsible ? () => setIsCollapsed((value) => !value) : undefined}
        onKeyDown={
          collapsible
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsCollapsed((value) => !value)
                }
              }
            : undefined
        }
        aria-expanded={collapsible ? !isCollapsed : undefined}
        aria-label={collapsible ? (isCollapsed ? 'Show combat features' : 'Hide combat features') : undefined}
        className={`flex items-center justify-between gap-3 ${isCollapsed ? '' : 'mb-3'} ${
          collapsible ? 'cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60' : ''
        }`}
      >
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
            Combat Features
          </h3>
          <span className="font-label text-[10px] tabular-nums text-tertiary">
            {features.length} available
          </span>
          {isCollapsed && summary && (
            <span className="w-full truncate font-label text-[10px] text-tertiary/80">
              {summary}
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {collapsible && (
            <span className={`material-symbols-outlined text-tertiary transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
              expand_more
            </span>
          )}
        </div>
      </div>

      {!isCollapsed && (
      <div className="space-y-3">
        {GROUP_ORDER.map((actionType) => {
          const group = groups[actionType]
          if (!group || group.length === 0) return null
          return (
            <div key={actionType}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-label text-[10px] uppercase tracking-[0.18em] text-primary font-bold">
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
                          className={`font-label text-[10px] uppercase tracking-wider px-1.5 py-0.5 border rounded ${
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
                          <span className="font-label text-[10px] text-[#00daf3] uppercase tracking-wider">Defensive</span>
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
      )}

      {/* Rogue Special Tactics (Debilitating Injury & Underhanded) */}
      {isRogue && (
        <div className="space-y-2.5 rounded-xl border border-secondary/30 bg-surface-container-high/60 p-3 mt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-sm">visibility</span>
              <span className="font-headline text-xs font-bold text-white uppercase tracking-wider">
                Unchained Rogue Tactics
              </span>
            </div>
            <span className="font-label text-[10px] font-bold text-primary">
              +3 Favored Class Crit Confirm Daggers
            </span>
          </div>

          {/* Debilitating Injury Target Badges */}
          <div className="space-y-1.5 rounded-lg border border-white/10 bg-surface-container/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-headline text-[11px] font-bold text-white uppercase tracking-wider">
                Debilitating Injury (Promemoria)
              </span>
              {debilitatingInjury && (debilitatingInjury.remainingRounds ?? 0) > 0 && (
                <div className="flex items-center gap-1">
                  <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.2 font-label text-[10px] font-bold text-amber-300">
                    {debilitatingInjury.type ?? debilitatingInjury.mode} su {debilitatingInjury.targetName || 'Bersaglio'}
                  </span>
                  <button
                    type="button"
                    onClick={() => applyDebilitatingInjury(character.id, null)}
                    title="Rimuovi promemoria"
                    className="text-tertiary hover:text-error transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {(['bewildered', 'disoriented', 'hampered'] as DebilitatingInjuryType[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDebInjuryMode(mode)}
                  className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    debInjuryMode === mode
                      ? 'border border-amber-500 bg-amber-500 text-black'
                      : 'border border-white/10 bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {mode === 'bewildered' ? 'Bewildered (-2/-4 CA)' : mode === 'disoriented' ? 'Disoriented (-2/-4 TxC)' : 'Hampered (1/2 Vel)'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Nome Bersaglio"
                value={debInjuryTarget}
                onChange={(e) => setDebInjuryTarget(e.target.value)}
                className="rounded border border-white/10 bg-surface-container-high px-2 py-0.5 font-label text-xs text-white focus:border-secondary focus:outline-none flex-1 max-w-[160px]"
              />
              <button
                type="button"
                onClick={() => {
                  applyDebilitatingInjury(character.id, debInjuryMode, debInjuryTarget.trim() || 'Bersaglio')
                  setDebInjuryTarget('')
                }}
                className="rounded border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 font-label text-[10px] font-bold uppercase text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
              >
                Applica
              </button>
            </div>
          </div>

          {/* Underhanded 1-click */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <span className="font-label text-[10px] text-tertiary">
              Underhanded (Danno furtivo massimizzato):
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!underhandedAvailable}
                onClick={() => {
                  openRoll({
                    diceType: 6,
                    count: 0,
                    modifier: 18,
                    label: 'Underhanded Maximized Sneak Attack (18 flat)',
                  })
                  setUnderhanded(character.id, false)
                }}
                className="rounded border border-secondary/40 bg-secondary/20 px-2 py-0.5 font-label text-[10px] font-bold uppercase text-secondary hover:bg-secondary/30 transition-colors cursor-pointer disabled:opacity-40"
              >
                18 Flat Sneak
              </button>
              {!underhandedAvailable && (
                <button
                  type="button"
                  onClick={() => setUnderhanded(character.id, true)}
                  className="rounded border border-white/10 bg-surface-container-high px-1.5 py-0.5 font-label text-[9px] text-tertiary hover:text-white cursor-pointer"
                >
                  Ripristina
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
            className={`min-h-[44px] px-2.5 py-1 rounded-lg border font-label text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-all hover:brightness-125 ${
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
