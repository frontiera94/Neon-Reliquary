import { useState } from 'react'
import { motion } from 'framer-motion'
import { useCharacterStore } from '../store/useCharacterStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { featInspectorItem, classAbilityInspectorItem } from '../lib/inspector-items'
import type { Feat, ClassAbility } from '../types/features'
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../lib/motion-presets'

export function FeaturesPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'feats' | 'class'>('all')
  const openInspector = useInspectorStore((s) => s.openInspector)

  if (!char) {
    return (
      <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
        No character selected
      </div>
    )
  }

  const signatureAbility = char.classAbilities.find((a) => a.isSignature)

  const query = searchQuery.trim().toLowerCase()
  const filteredFeats = char.feats.filter(
    (f) =>
      !query ||
      f.name.toLowerCase().includes(query) ||
      f.shortDesc.toLowerCase().includes(query) ||
      f.fullDesc.toLowerCase().includes(query)
  )

  const filteredAbilities = (char.classAbilities ?? []).filter(
    (a) =>
      !query ||
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
  )

  const showFeats = activeTab === 'all' || activeTab === 'feats'
  const showAbilities = activeTab === 'all' || activeTab === 'class'
  const totalResults = (showFeats ? filteredFeats.length : 0) + (showAbilities ? filteredAbilities.length : 0)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
            Features & <span className="text-secondary neon-glow-accent">Abilities</span>
          </h1>
          <p className="font-label text-xs sm:text-sm text-tertiary tracking-wide mt-0.5">
            Powers, talents and feats for <span className="text-white font-medium">{char.name}</span>
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-base select-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container/80 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-tertiary focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white cursor-pointer"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Signature Ability Highlight */}
      {signatureAbility && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-[0_0_15px_rgba(0,240,255,0.08)]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 text-primary">
              <span className="material-symbols-outlined text-lg">star</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-label text-[10px] uppercase tracking-wider text-primary font-bold">
                  Signature Ability
                </span>
                <h2 className="font-headline text-base sm:text-lg font-bold text-white truncate">
                  {signatureAbility.name}
                </h2>
              </div>
              <p className="font-body text-xs text-tertiary truncate max-w-xl">
                {signatureAbility.description}
              </p>
            </div>
          </div>
          <button
            onClick={() => openInspector(classAbilityInspectorItem(signatureAbility))}
            className="px-2.5 py-1 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg font-label text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center gap-1 flex-shrink-0 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">info</span>
            <span className="hidden sm:inline">Inspect</span>
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {(
            [
              { id: 'all', label: 'All', count: char.feats.length + char.classAbilities.length },
              { id: 'class', label: 'Class Abilities', count: char.classAbilities.length },
              { id: 'feats', label: 'Feats', count: char.feats.length },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-label text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-primary text-black font-bold shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'bg-surface-container/60 text-tertiary border border-white/5 hover:text-white hover:bg-surface-container'
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-mono ${
                    isActive ? 'bg-black/25 text-black font-bold' : 'bg-white/10 text-tertiary'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
        <span className="font-label text-[11px] text-tertiary">
          {totalResults} {totalResults === 1 ? 'result' : 'results'}
        </span>
      </div>

      {/* Content Area */}
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        {totalResults === 0 ? (
          <p className="font-body text-tertiary italic text-center py-8">No features match your search.</p>
        ) : (
          <>
            {/* Class Abilities Section */}
            {showAbilities && filteredAbilities.length > 0 && (
              <motion.div variants={STAGGER_ITEM} className="space-y-2.5">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-3 pt-1">
                    <span className="material-symbols-outlined text-secondary text-base">auto_awesome</span>
                    <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-secondary">
                      Class Abilities ({filteredAbilities.length})
                    </h2>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                  {filteredAbilities.map((ability, index) => (
                    <ClassAbilityItem
                      key={ability.id}
                      ability={ability}
                      index={index + 1}
                      onInspect={() => openInspector(classAbilityInspectorItem(ability))}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Feats Section */}
            {showFeats && filteredFeats.length > 0 && (
              <motion.div variants={STAGGER_ITEM} className="space-y-2.5">
                {activeTab === 'all' && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="material-symbols-outlined text-primary text-base">military_tech</span>
                    <h2 className="font-headline text-lg sm:text-xl font-bold uppercase tracking-wider text-primary">
                      Feats ({filteredFeats.length})
                    </h2>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                  {filteredFeats.map((feat) => (
                    <FeatAccordionItem
                      key={feat.id}
                      feat={feat}
                      onInspect={() => openInspector(featInspectorItem(feat))}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}

function ClassAbilityItem({
  ability,
  index,
  onInspect,
}: {
  ability: ClassAbility
  index: number
  onInspect: () => void
}) {
  return (
    <div className="group border border-white/10 rounded-xl overflow-hidden bg-surface-container/70 backdrop-blur-sm hover:border-secondary/40 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
      <details className="w-full">
        <summary className="flex items-start justify-between p-3 sm:p-3.5 cursor-pointer hover:bg-surface-container-high transition-colors list-none select-none">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="font-label text-[10px] font-mono font-bold text-secondary bg-secondary/15 border border-secondary/30 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
              #{index.toString().padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-headline text-base sm:text-lg font-bold text-white group-hover:text-secondary uppercase tracking-tight transition-colors">
                  {ability.name}
                </span>
                {ability.isSignature && (
                  <span className="font-label text-[10px] uppercase tracking-wider text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.2 rounded font-bold">
                    Signature
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-tertiary line-clamp-2 mt-0.5 leading-snug">
                {ability.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onInspect()
              }}
              title="Inspect details"
              aria-label={`Inspect ${ability.name}`}
              className="p-1 rounded-md text-tertiary hover:text-secondary hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">info</span>
            </button>
            <span className="material-symbols-outlined text-tertiary group-open:text-secondary group-open:rotate-180 transition-transform text-lg">
              expand_more
            </span>
          </div>
        </summary>
        <div className="px-3.5 pb-3.5 pt-2 border-t border-white/5 font-body text-xs sm:text-sm text-tertiary leading-relaxed">
          {ability.description}
        </div>
      </details>
    </div>
  )
}

function FeatAccordionItem({
  feat,
  onInspect,
}: {
  feat: Feat
  onInspect: () => void
}) {
  return (
    <div className="group border border-white/10 rounded-xl overflow-hidden bg-surface-container/70 backdrop-blur-sm hover:border-primary/40 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.2)]">
      <details className="w-full">
        <summary className="flex items-start justify-between p-3 sm:p-3.5 cursor-pointer hover:bg-surface-container-high transition-colors list-none select-none">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <span className="font-label text-[10px] font-mono font-bold text-primary bg-primary/15 border border-primary/30 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
              #{feat.index.toString().padStart(2, '0')}
            </span>
            <div className="min-w-0 flex-1 pr-2">
              <span className="font-headline text-base sm:text-lg font-bold text-white group-hover:text-primary uppercase tracking-tight transition-colors">
                {feat.name}
              </span>
              <p className="font-body text-xs text-tertiary line-clamp-2 mt-0.5 leading-snug">
                {feat.shortDesc}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onInspect()
              }}
              title="Inspect details"
              aria-label={`Inspect ${feat.name}`}
              className="p-1 rounded-md text-tertiary hover:text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">info</span>
            </button>
            <span className="material-symbols-outlined text-tertiary group-open:text-primary group-open:rotate-180 transition-transform text-lg">
              expand_more
            </span>
          </div>
        </summary>
        <div className="px-3.5 pb-3.5 pt-2 border-t border-white/5 space-y-2.5 font-body text-xs sm:text-sm text-tertiary leading-relaxed">
          <div>{feat.fullDesc}</div>
          {feat.bonusValue !== undefined && feat.bonusMax !== undefined && (
            <div className="bg-surface-container-lowest p-2.5 sm:p-3 border border-white/10 rounded-lg">
              <div className="flex justify-between mb-1.5">
                <span className="font-label text-[10px] uppercase text-primary font-bold">
                  {feat.bonusLabel ?? 'Bonus'}
                </span>
                <span className="font-label text-xs text-white font-bold">
                  {feat.bonusValue >= 0 ? `+${feat.bonusValue}` : feat.bonusValue}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(feat.bonusValue / feat.bonusMax) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
