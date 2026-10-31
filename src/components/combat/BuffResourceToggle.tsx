import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useSessionStore } from '../../store/useSessionStore'
import type { BuffToggle } from '../../types/combat'
import type { DailyResource } from '../../types/resources'
import { summarizeBuffModifiers, buffModifierTokens, modifierColor } from '../../lib/buff-summary'
import { resolveBuffResource } from '../../lib/stat-calc'
import { TACTICAL_SPRING, SNAPPY_SPRING } from '../../lib/motion-presets'

export interface DailyResourcePipsProps {
  characterId: string
  resource: DailyResource
  spent: number
  compact?: boolean
}

/**
 * Touch-friendly daily-resource tracker. Each pip has a full 44x44 hit area
 * with a smaller visual core, so it remains usable on mobile.
 */
export function DailyResourcePips({ characterId, resource, spent, compact = false }: DailyResourcePipsProps) {
  const setResourceSpent = useSessionStore((s) => s.setResourceSpent)
  const spendResource = useSessionStore((s) => s.spendResource)
  const remaining = Math.max(0, resource.total - spent)

  const handleClick = (index: number) => {
    if (index < spent) {
      setResourceSpent(characterId, resource.id, index)
    } else if (index === spent) {
      spendResource(characterId, resource.id, resource.total)
    } else {
      setResourceSpent(characterId, resource.id, index + 1)
    }
  }

  const labelText = resource.label ?? resource.name
  const colonIndex = labelText.indexOf(':')
  const prefix = colonIndex > 0 ? labelText.slice(0, colonIndex).trim() : null
  const mainLabel = colonIndex > 0 ? labelText.slice(colonIndex + 1).trim() : labelText

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      role="group"
      aria-label={`${resource.name}: ${remaining} of ${resource.total} remaining`}
      title={resource.name}
    >
      <span className="inline-flex items-center gap-1 font-label text-[9px] uppercase tracking-wider mr-1">
        {prefix ? (
          <>
            <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-secondary text-[8px] font-bold">
              {prefix}
            </span>
            <span className="text-tertiary font-semibold">{mainLabel}</span>
          </>
        ) : (
          <span className="text-tertiary">{mainLabel}</span>
        )}
      </span>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-0.5' : 'gap-1'}`}>
        {Array.from({ length: resource.total }).map((_, index) => {
          const isSpent = index < spent
          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleClick(index)}
              whileTap={{ scale: 0.88 }}
              aria-label={`${isSpent ? 'Recover' : 'Spend'} ${resource.name} ${index + 1} of ${resource.total}`}
              aria-pressed={isSpent}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <motion.span
                layout
                animate={{ scale: isSpent ? 0.95 : 1 }}
                transition={SNAPPY_SPRING}
                className={`block transition-all group-hover:scale-110 ${
                  isSpent
                    ? 'w-2.5 h-2.5 rounded-full border border-white/20 bg-surface-container-highest'
                    : 'w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,240,255,0.55)]'
                }`}
              />
            </motion.button>
          )
        })}
      </div>
      <span className="font-label text-[10px] font-bold tabular-nums text-on-surface-variant ml-1">
        {remaining}/{resource.total}
      </span>
    </div>
  )
}

export interface BuffResourceToggleProps {
  characterId: string
  buff: BuffToggle
  isActive: boolean
  resources: DailyResource[]
  spentResources: Record<string, number>
  onToggle: () => void
  onInspect?: () => void
}

export function BuffResourceToggle({
  characterId,
  buff,
  isActive,
  resources,
  spentResources,
  onToggle,
  onInspect,
}: BuffResourceToggleProps) {
  const hex =
    ({ primary: '#00f0ff', secondary: '#d946ef', error: '#ff4b60' } as const)[buff.color ?? 'primary'] ??
    '#00f0ff'
  const linked = useMemo(() => {
    const resource = resolveBuffResource(buff, resources)
    return resource ? [resource] : []
  }, [buff, resources])
  const tokens = buffModifierTokens(buff)
  const summary = summarizeBuffModifiers(buff)

  return (
    <div className="relative">
      <motion.button
        type="button"
        data-buff-id={buff.id}
        data-buff-active={isActive ? 'true' : 'false'}
        onClick={onToggle}
        whileHover={{ scale: 1.006 }}
        whileTap={{ scale: 0.985 }}
        transition={TACTICAL_SPRING}
        className="w-full flex items-start justify-between gap-3 p-4 border rounded-xl transition-all cursor-pointer text-left bg-surface-container/90 backdrop-blur-sm hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        style={
          isActive
            ? {
                borderColor: hex,
                backgroundColor: `${hex}1a`,
                boxShadow: `0 0 20px ${hex}40`,
              }
            : { borderColor: 'rgba(255,255,255,0.08)' }
        }
      >
        <div className="flex items-start gap-3 min-w-0">
          <motion.div
            animate={{ scale: isActive ? [0.8, 1.25, 1] : 1 }}
            transition={SNAPPY_SPRING}
            className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors"
            style={
              isActive
                ? { backgroundColor: hex, boxShadow: `0 0 8px ${hex}` }
                : { backgroundColor: 'rgba(255,255,255,0.2)' }
            }
          />
          <div className="min-w-0">
            <p
              className="font-headline text-sm font-bold uppercase tracking-wider truncate"
              style={{ color: isActive ? hex : undefined }}
            >
              {buff.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
              {tokens.length > 0 ? (
                tokens.map((token) => (
                  <span
                    key={`${token.label}-${token.value}`}
                    className={`font-label text-[10px] tabular-nums tracking-wide ${modifierColor(token.value)}`}
                  >
                    {token.value !== null
                      ? `${token.value > 0 ? '+' : ''}${token.value} ${token.label}`
                      : `+${token.label}`}
                  </span>
                ))
              ) : (
                <span className="font-label text-[10px] text-tertiary">
                  {buff.description ? 'Situational' : 'No numeric modifiers'}
                </span>
              )}
            </div>
            {!isActive && summary && (
              <p className="font-label text-[9px] text-tertiary mt-1 truncate">{buff.duration ?? 'Ready to toggle'}</p>
            )}
          </div>
        </div>
        <span
          className="font-label text-[10px] uppercase tracking-widest px-2.5 py-0.5 flex-shrink-0 border rounded-full transition-all font-bold"
          style={
            isActive
              ? { color: hex, borderColor: hex, boxShadow: `0 0 8px ${hex}` }
              : { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' }
          }
        >
          {isActive ? 'ON' : 'OFF'}
        </span>
      </motion.button>

      {(linked.length > 0 || onInspect) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-col gap-0.5">
            {linked.map((resource) => (
              <DailyResourcePips
                key={resource.id}
                characterId={characterId}
                resource={resource}
                spent={spentResources[resource.id] ?? 0}
                compact
              />
            ))}
          </div>
          {onInspect && (
            <button
              type="button"
              onClick={onInspect}
              aria-label={`Inspect ${buff.name}`}
              className="min-h-[44px] min-w-[44px] px-2 flex items-center justify-center gap-1 font-label text-[10px] uppercase tracking-wider text-tertiary hover:text-primary border border-white/10 rounded-xl cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              <span className="hidden xl:inline">Details</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
