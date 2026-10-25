import { useState } from 'react'
import { useCharacterStore } from '../store/useCharacterStore'
import { useInspectorStore } from '../store/useInspectorStore'
import { featInspectorItem, classAbilityInspectorItem } from '../lib/inspector-items'
import type { Feat, ClassAbility } from '../types/features'

export function FeaturesPage() {
  const char = useCharacterStore((s) => s.activeCharacter())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'feats' | 'class'>('all')
  const openInspector = useInspectorStore((s) => s.openInspector)

  if (!char) return (
    <div className="flex items-center justify-center h-64 text-tertiary font-label text-sm uppercase tracking-widest">
      No character selected
    </div>
  )

  const signatureAbility = char.classAbilities.find((a) => a.isSignature)

  const query = searchQuery.trim().toLowerCase()
  const filteredFeats = char.feats.filter((f) =>
    !query ||
    f.name.toLowerCase().includes(query) ||
    f.shortDesc.toLowerCase().includes(query) ||
    f.fullDesc.toLowerCase().includes(query)
  )

  const filteredAbilities = (char.classAbilities ?? []).filter((a) =>
    !query ||
    a.name.toLowerCase().includes(query) ||
    a.description.toLowerCase().includes(query)
  )

  const showFeats = activeTab === 'all' || activeTab === 'feats'
  const showAbilities = activeTab === 'all' || activeTab === 'class'
  const totalResults = (showFeats ? filteredFeats.length : 0) + (showAbilities ? filteredAbilities.length : 0)

  return (
    <div className="p-2.5 sm:p-4 md:p-8 lg:p-12">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-3 sm:mb-6 md:mb-8">
        <h1 className="font-headline text-xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-1 sm:mb-2 tracking-tighter uppercase">
          Features & <span className="text-secondary neon-glow-accent">Abilities</span>
        </h1>
        <div className="h-1 sm:h-1.5 w-16 sm:w-24 bg-gradient-to-r from-primary to-secondary mb-2 sm:mb-4 rounded-full" />
        <p className="font-body text-tertiary text-xs sm:text-base max-w-2xl leading-relaxed">
          The innate powers and forged techniques of {char.name}.
        </p>
      </div>

      {/* Bento grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-6">
        {/* Summary stats */}
        <div className="md:col-span-4 bg-surface-container-high/90 backdrop-blur-sm p-3.5 sm:p-6 flex flex-row md:flex-col justify-between items-center md:items-start border border-white/10 rounded-xl sm:rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.25)]">
          <div>
            <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-primary font-bold block mb-0.5 sm:mb-2">
              Total Feats
            </span>
            <div className="font-headline text-2xl sm:text-4xl md:text-5xl font-black text-white">{char.feats.length}</div>
          </div>
          <div className="md:mt-6 text-right md:text-left">
            <span className="font-label text-[9px] sm:text-[10px] uppercase tracking-wider text-secondary font-bold block mb-0.5 sm:mb-2">
              Class Abilities
            </span>
            <div className="font-headline text-xl sm:text-2xl md:text-3xl font-bold text-white">{char.classAbilities.length.toString().padStart(2, '0')}</div>
          </div>
        </div>

        {/* Featured ability */}
        {signatureAbility && (
          <div className="md:col-span-8 relative overflow-hidden bg-surface-container/90 backdrop-blur-sm min-h-[110px] sm:min-h-[160px] md:min-h-[200px] border border-white/10 rounded-xl sm:rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.25)] flex flex-col justify-end">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-secondary/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
            <div className="relative p-3.5 sm:p-6 md:p-8">
              <span className="font-label text-[8px] sm:text-[10px] uppercase tracking-wider text-primary bg-primary/20 border border-primary/30 px-2 py-0.5 mb-1 sm:mb-2 inline-block rounded-md font-bold">
                Active Signature
              </span>
              <h3 className="font-headline text-base sm:text-2xl md:text-3xl font-bold text-white uppercase">
                {signatureAbility.name}
              </h3>
              <p className="font-body text-tertiary text-xs sm:text-sm mt-1 max-w-sm line-clamp-2 sm:line-clamp-none">
                {signatureAbility.description}
              </p>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="md:col-span-12 flex flex-col sm:flex-row gap-2.5 sm:gap-4 items-stretch sm:items-center justify-between mt-1 sm:mt-3">
          <div className="flex gap-1.5 sm:gap-2">
            {(['all', 'feats', 'class'] as const).map((tab) => {
              const label = tab === 'all' ? 'All' : tab === 'feats' ? 'Feats' : 'Class'
              const count = tab === 'all' ? char.feats.length + char.classAbilities.length : tab === 'feats' ? char.feats.length : char.classAbilities.length
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-label text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary text-surface font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'bg-surface-container/60 text-tertiary border border-white/5 hover:text-white hover:bg-surface-container'
                  }`}
                >
                  {label}
                  <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-tertiary'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="relative flex-1 max-w-full sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-base sm:text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-tertiary focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* List of features */}
        <div className="md:col-span-12 space-y-3 sm:space-y-6">
          {totalResults === 0 ? (
            <p className="font-body text-tertiary italic text-center py-8">No features match your search.</p>
          ) : (
            <>
              {/* Class Abilities Section */}
              {showAbilities && filteredAbilities.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-4 pt-2">
                      <h2 className="font-headline text-xl text-white font-bold uppercase tracking-tight">Class Abilities</h2>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  {filteredAbilities.map((ability, index) => (
                    <ClassAbilityItem key={ability.id} ability={ability} index={index + 1} onInspect={() => openInspector(classAbilityInspectorItem(ability))} />
                  ))}
                </div>
              )}

              {/* Feats Section */}
              {showFeats && filteredFeats.length > 0 && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="flex items-center gap-4 pt-2">
                      <h2 className="font-headline text-xl text-white font-bold uppercase tracking-tight">Feats</h2>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>
                  )}
                  {filteredFeats.map((feat) => (
                    <FeatAccordionItem key={feat.id} feat={feat} onInspect={() => openInspector(featInspectorItem(feat))} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ClassAbilityItem({ ability, index, onInspect }: { ability: ClassAbility; index: number; onInspect: () => void }) {
  return (
    <div className="group border border-white/10 rounded-xl overflow-hidden bg-surface-container-low/90 backdrop-blur-sm hover:border-secondary/40 transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <details className="w-full">
        <summary className="flex items-center justify-between p-2.5 sm:p-4 md:p-5 cursor-pointer hover:bg-surface-container transition-colors list-none">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <span className="font-label text-secondary font-bold text-sm sm:text-base md:text-lg w-5 sm:w-8 flex-shrink-0">
              {index.toString().padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    onInspect()
                  }}
                  className="font-headline text-xs sm:text-base md:text-lg font-bold text-white group-hover:text-secondary uppercase tracking-tight transition-colors text-left cursor-pointer truncate max-w-full"
                >
                  {ability.name}
                </button>
                {ability.isSignature && (
                  <span className="font-label text-[8px] sm:text-[10px] uppercase tracking-wider text-primary bg-primary/20 border border-primary/30 px-1.5 py-0.2 rounded font-bold">
                    Signature
                  </span>
                )}
              </div>
              <p className="font-body text-tertiary text-xs sm:text-sm line-clamp-1 italic">{ability.description}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-secondary transition-transform flex-shrink-0 ml-2 group-open:rotate-180 text-sm sm:text-base">
            expand_more
          </span>
        </summary>
        <div className="px-3 pb-3 sm:px-10 sm:pb-6 pt-2 border-t border-white/5 font-body text-tertiary leading-relaxed text-xs sm:text-sm">
          {ability.description}
        </div>
      </details>
    </div>
  )
}

function FeatAccordionItem({ feat, onInspect }: { feat: Feat; onInspect: () => void }) {
  return (
    <div className="group border border-white/10 rounded-xl overflow-hidden bg-surface-container-low/90 backdrop-blur-sm hover:border-primary/40 transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
      <details className="w-full">
        <summary className="flex items-center justify-between p-2.5 sm:p-4 md:p-5 cursor-pointer hover:bg-surface-container transition-colors list-none">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <span className="font-label text-primary font-bold text-sm sm:text-base md:text-lg w-5 sm:w-8 flex-shrink-0">
              {feat.index.toString().padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  onInspect()
                }}
                className="font-headline text-xs sm:text-base md:text-lg font-bold text-white group-hover:text-primary uppercase tracking-tight transition-colors text-left cursor-pointer truncate max-w-full"
              >
                {feat.name}
              </button>
              <p className="font-body text-tertiary text-xs sm:text-sm italic line-clamp-1">{feat.shortDesc}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary transition-transform flex-shrink-0 ml-2 group-open:rotate-180 text-sm sm:text-base">
            expand_more
          </span>
        </summary>
        <div className="px-3 pb-3 sm:px-10 sm:pb-6 pt-2 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            <div className="font-body text-tertiary leading-relaxed text-xs sm:text-sm">
              {feat.fullDesc}
            </div>
            {feat.bonusValue !== undefined && feat.bonusMax !== undefined && (
              <div className="bg-surface-container-lowest p-3 sm:p-4 border border-white/10 rounded-xl">
                <div className="flex justify-between mb-1.5">
                  <span className="font-label text-[9px] sm:text-[10px] uppercase text-primary font-bold">
                    {feat.bonusLabel ?? 'Bonus'}
                  </span>
                  <span className="font-label text-white font-bold text-xs sm:text-sm">{feat.bonusValue >= 0 ? `+${feat.bonusValue}` : feat.bonusValue}</span>
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
        </div>
      </details>
    </div>
  )
}

