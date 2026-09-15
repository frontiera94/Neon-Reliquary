import { useState, useMemo } from 'react'
import type { CombatManeuversCalculated, CombatManeuverType } from '../../types/combat'
import type { DiceRoll } from '../../types/dice'

export interface CombatManeuversPanelProps {
  maneuversCalc: CombatManeuversCalculated
  openRoll: (roll: DiceRoll) => void
}

type ManeuverFilter = 'all' | 'noAoO' | 'provokes'

export function CombatManeuversPanel({ maneuversCalc, openRoll }: CombatManeuversPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedBreakdown, setSelectedBreakdown] = useState<'cmb' | 'cmd' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<ManeuverFilter>('all')
  const [expandedCardBreakdown, setExpandedCardBreakdown] = useState<CombatManeuverType | null>(null)

  const maneuverList = useMemo(() => Object.values(maneuversCalc.maneuvers), [maneuversCalc.maneuvers])

  const noAoOCount = useMemo(() => maneuverList.filter((m) => !m.provokesAoO).length, [maneuverList])
  const provokesCount = useMemo(() => maneuverList.filter((m) => m.provokesAoO).length, [maneuverList])

  const filteredManeuvers = useMemo(() => {
    return maneuverList.filter((m) => {
      if (activeFilter === 'noAoO' && m.provokesAoO) return false
      if (activeFilter === 'provokes' && !m.provokesAoO) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        (m.featApplied && m.featApplied.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q))
      )
    })
  }, [maneuverList, activeFilter, searchQuery])

  return (
    <div className="bg-surface-container/90 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)] overflow-hidden transition-all duration-300">
      {/* Collapsible Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-surface-container-high/60 transition-colors select-none group"
        aria-expanded={isExpanded}
        aria-label="Maneuvers & Tactics Panel"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-secondary/15 border border-secondary/30 flex items-center justify-center text-secondary shadow-[0_0_12px_rgba(217,70,239,0.2)] group-hover:border-secondary/50 group-hover:shadow-[0_0_16px_rgba(217,70,239,0.35)] transition-all">
            <span className="material-symbols-outlined text-lg">sports_kabaddi</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-headline text-sm uppercase tracking-widest text-white font-bold">
                Maneuvers & Tactics (CMB / CMD)
              </h3>
              <span
                className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 shadow-[0_0_8px_rgba(217,70,239,0.2)]"
                data-testid="header-cmb-value"
              >
                CMB {maneuversCalc.cmb >= 0 ? `+${maneuversCalc.cmb}` : maneuversCalc.cmb}
              </span>
              <span className="text-tertiary text-xs">•</span>
              <span
                className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/30 shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                data-testid="header-cmd-value"
              >
                CMD {maneuversCalc.cmd}
              </span>
            </div>
            <p className="font-label text-[10px] text-tertiary tracking-wider mt-0.5">
              Trip, Disarm, Grapple, Bull Rush & defensive counters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-tertiary uppercase tracking-wider hidden sm:inline group-hover:text-white transition-colors">
            {isExpanded ? 'Hide' : 'Expand'}
          </span>
          <span
            className={`material-symbols-outlined text-tertiary transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-secondary' : ''
            }`}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 pt-0 border-t border-white/5 space-y-4">
          {/* Quick breakdown toggle buttons */}
          <div className="flex flex-wrap gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSelectedBreakdown(selectedBreakdown === 'cmb' ? null : 'cmb')}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                selectedBreakdown === 'cmb'
                  ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_12px_rgba(217,70,239,0.35)]'
                  : 'bg-surface-container border-white/10 text-tertiary hover:text-white hover:border-secondary/40'
              }`}
              aria-expanded={selectedBreakdown === 'cmb'}
            >
              <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_6px_#d946ef]" />
              <span>CMB Breakdown:</span>
              <span className="font-mono font-bold text-white">
                {maneuversCalc.cmb >= 0 ? `+${maneuversCalc.cmb}` : maneuversCalc.cmb}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBreakdown(selectedBreakdown === 'cmd' ? null : 'cmd')}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                selectedBreakdown === 'cmd'
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                  : 'bg-surface-container border-white/10 text-tertiary hover:text-white hover:border-primary/40'
              }`}
              aria-expanded={selectedBreakdown === 'cmd'}
            >
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_#00f0ff]" />
              <span>CMD Breakdown:</span>
              <span className="font-mono font-bold text-white">{maneuversCalc.cmd}</span>
            </button>
          </div>

          {/* Active breakdown viewer */}
          {selectedBreakdown === 'cmb' && (
            <div
              className="p-4 bg-surface-container-lowest/90 rounded-xl border border-secondary/30 shadow-[0_0_20px_rgba(217,70,239,0.08),inset_0_0_15px_rgba(217,70,239,0.05)] space-y-3"
              data-testid="cmb-breakdown-panel"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm">shield</span>
                  <span className="text-secondary font-headline font-bold text-xs uppercase tracking-wider">
                    Base Combat Maneuver Bonus (CMB)
                  </span>
                </div>
                <span className="text-[10px] font-label text-tertiary tracking-wide hidden sm:inline">
                  Formula: BAB + STR (or DEX) + Size + Buffs - Conditions
                </span>
                <span className="font-mono font-bold text-white bg-secondary/20 px-2 py-0.5 rounded-md border border-secondary/40 text-xs">
                  Total: {maneuversCalc.cmb >= 0 ? `+${maneuversCalc.cmb}` : maneuversCalc.cmb}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-label">
                {maneuversCalc.breakdownCmb.map((b, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-surface-container/90 border border-white/10 flex items-center gap-2 shadow-xs"
                  >
                    <span className="text-tertiary">{b.label}:</span>
                    <strong
                      className={`font-mono ${
                        b.value > 0 ? 'text-secondary' : b.value < 0 ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {b.value >= 0 ? `+${b.value}` : b.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedBreakdown === 'cmd' && (
            <div
              className="p-4 bg-surface-container-lowest/90 rounded-xl border border-primary/30 shadow-[0_0_20px_rgba(0,240,255,0.08),inset_0_0_15px_rgba(0,240,255,0.05)] space-y-3"
              data-testid="cmd-breakdown-panel"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-sm">security</span>
                  <span className="text-primary font-headline font-bold text-xs uppercase tracking-wider">
                    Combat Maneuver Defense (CMD)
                  </span>
                </div>
                <span className="text-[10px] font-label text-tertiary tracking-wide hidden sm:inline">
                  Formula: 10 + Base BAB + STR + DEX + Size + Dodge/Deflection + Buffs - Conditions
                </span>
                <span className="font-mono font-bold text-white bg-primary/20 px-2 py-0.5 rounded-md border border-primary/40 text-xs">
                  Total: {maneuversCalc.cmd}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-label">
                {maneuversCalc.breakdownCmd.map((b, i) => (
                  <div
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-surface-container/90 border border-white/10 flex items-center gap-2 shadow-xs"
                  >
                    <span className="text-tertiary">{b.label}:</span>
                    <strong
                      className={`font-mono ${
                        b.value > 0 ? 'text-primary' : b.value < 0 ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {b.value >= 0 ? `+${b.value}` : b.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm select-none pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search maneuvers (e.g. Trip, Disarm, Grapple)..."
                aria-label="Search maneuvers"
                className="w-full bg-surface-container-lowest/90 border border-white/10 focus:border-primary/60 focus:shadow-[0_0_15px_rgba(0,240,255,0.25)] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-tertiary/70 outline-none transition-all font-label"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm leading-none">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-primary/20 border-primary text-primary font-bold shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                    : 'bg-surface-container border-white/10 text-tertiary hover:text-white'
                }`}
              >
                All ({maneuverList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('noAoO')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'noAoO'
                    ? 'bg-secondary/20 border-secondary text-secondary font-bold shadow-[0_0_10px_rgba(217,70,239,0.25)]'
                    : 'bg-surface-container border-white/10 text-tertiary hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_4px_#d946ef]" />
                <span>No AoO ({noAoOCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('provokes')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-label uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilter === 'provokes'
                    ? 'bg-white/15 border-white/30 text-white font-bold shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                    : 'bg-surface-container border-white/10 text-tertiary hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                <span>Provokes ({provokesCount})</span>
              </button>
            </div>
          </div>

          {/* Empty Search Results */}
          {filteredManeuvers.length === 0 && (
            <div className="py-8 px-4 text-center rounded-xl bg-surface-container-lowest/60 border border-white/5 space-y-2">
              <span className="material-symbols-outlined text-tertiary text-2xl">filter_list_off</span>
              <p className="text-xs font-label text-tertiary">
                No maneuvers found matching your search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setActiveFilter('all')
                }}
                className="px-3 py-1 text-xs font-label uppercase tracking-wider text-primary hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Maneuvers Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredManeuvers.map((m) => {
              const hasFeat = !m.provokesAoO
              const isCardBreakdownOpen = expandedCardBreakdown === m.type
              const bonusDiff = m.bonus - maneuversCalc.cmb

              return (
                <div
                  key={m.type}
                  className="p-4 rounded-xl bg-surface-container-high/80 backdrop-blur-sm border border-white/10 hover:border-secondary/40 transition-all duration-200 flex flex-col justify-between gap-3 group shadow-sm hover:shadow-[0_0_16px_rgba(217,70,239,0.15)]"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-headline text-sm font-bold text-white group-hover:text-secondary transition-colors">
                          {m.name}
                        </h4>
                      </div>
                      {hasFeat ? (
                        <span
                          className="text-[9px] font-label font-bold px-2 py-0.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 uppercase tracking-widest shadow-[0_0_8px_rgba(217,70,239,0.2)] flex-shrink-0"
                          title={m.featApplied ?? 'Improved Feat applied'}
                        >
                          No AoO
                        </span>
                      ) : (
                        <span
                          className="text-[9px] font-label px-2 py-0.5 rounded-lg bg-white/5 text-tertiary border border-white/10 uppercase tracking-widest flex-shrink-0"
                          title="Provokes Attack of Opportunity without Improved feat"
                        >
                          Provokes
                        </span>
                      )}
                    </div>

                    {m.featApplied && (
                      <div className="flex items-center gap-1.5 text-secondary text-[11px] font-medium">
                        <span className="material-symbols-outlined text-[12px] leading-none">star</span>
                        <span>{m.featApplied}</span>
                        <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-secondary/20 border border-secondary/30">
                          {bonusDiff >= 0 ? `+${bonusDiff}` : bonusDiff}
                        </span>
                      </div>
                    )}

                    {m.cmdBonus && (
                      <div className="text-[10px] font-label text-primary/80">
                        <span>CMD vs {m.type}: </span>
                        <strong className="text-white font-mono">{maneuversCalc.cmd + m.cmdBonus}</strong>
                        <span className="text-tertiary"> (+{m.cmdBonus})</span>
                      </div>
                    )}

                    {m.description && (
                      <p className="font-label text-[10px] text-tertiary line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    )}

                    {/* Maneuver specific breakdown toggle */}
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCardBreakdown(isCardBreakdownOpen ? null : m.type)
                        }
                        className="text-[10px] font-label text-tertiary hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
                        aria-expanded={isCardBreakdownOpen}
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          {isCardBreakdownOpen ? 'expand_less' : 'expand_more'}
                        </span>
                        <span>{isCardBreakdownOpen ? 'Hide Breakdown' : 'View Breakdown'}</span>
                      </button>

                      {isCardBreakdownOpen && (
                        <div className="mt-1.5 p-2 rounded-lg bg-surface-container-lowest/80 border border-white/10 text-[10px] font-label space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {m.breakdown.map((b, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-surface-container border border-white/5 text-tertiary"
                              >
                                {b.label}:{' '}
                                <strong
                                  className={
                                    b.value > 0 ? 'text-secondary' : b.value < 0 ? 'text-red-400' : 'text-white'
                                  }
                                >
                                  {b.value >= 0 ? `+${b.value}` : b.value}
                                </strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Roll Button */}
                  <button
                    type="button"
                    onClick={() =>
                      openRoll({
                        diceType: 20,
                        count: 1,
                        modifier: m.bonus,
                        label: `${m.name} Check`,
                        breakdown: m.breakdown,
                      })
                    }
                    className="w-full py-2.5 bg-gradient-to-r from-secondary/20 to-primary/20 hover:from-secondary/30 hover:to-primary/30 border border-secondary/40 hover:border-secondary/60 text-white font-label text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-between px-3.5 hover:shadow-[0_0_15px_rgba(217,70,239,0.25)] transition-all cursor-pointer active:scale-95"
                    aria-label={`Roll ${m.name} Check (${m.bonus >= 0 ? `+${m.bonus}` : m.bonus})`}
                  >
                    <span className="text-secondary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">casino</span>
                      Check
                    </span>
                    <span className="font-mono text-base font-black text-white">
                      {m.bonus >= 0 ? `+${m.bonus}` : m.bonus}
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
