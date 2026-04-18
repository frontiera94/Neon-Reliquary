import { useState } from 'react'
import type { SummonOption } from '../../types/resources'

export interface SummonSpell {
  id: string
  name: string
  level: number
  summonOptions?: SummonOption[]
}

export function SummonSection({
  spells,
  activeSummonId,
  onSelect,
}: {
  spells: SummonSpell[]
  activeSummonId: string | null
  onSelect: (spellId: string, opt: SummonOption) => void
}) {
  const [activeTab, setActiveTab] = useState(spells[0]?.id ?? '')
  const currentSpell = spells.find((s) => s.id === activeTab) ?? spells[0]

  return (
    <section className="bg-surface-container p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-label text-[10px] text-primary uppercase tracking-[0.25em]">Summon Nature's Ally</span>
        <div className="flex gap-1">
          {spells.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(s.id)}
              className="px-3 py-1 font-label text-[10px] uppercase tracking-widest transition-all"
              style={activeTab === s.id
                ? { backgroundColor: 'rgba(0,218,243,0.15)', color: '#00daf3', border: '1px solid rgba(0,218,243,0.5)' }
                : { color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              SNA {s.level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(currentSpell?.summonOptions ?? []).map((opt) => {
          const isActive = activeSummonId === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(currentSpell.id, opt)}
              className="p-3 text-left transition-all hover:bg-surface-container-high"
              style={isActive
                ? { backgroundColor: 'rgba(0,218,243,0.12)', border: '1px solid rgba(0,218,243,0.5)', boxShadow: '0 0 16px rgba(0,218,243,0.2)' }
                : { border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p
                className="font-headline text-sm font-bold leading-tight"
                style={{ color: isActive ? '#00daf3' : undefined }}
              >
                {opt.name}
              </p>
              <p className="font-label text-[10px] text-tertiary mt-1 uppercase tracking-widest">
                {opt.size} • AC {opt.ac} • HP {opt.hp}
              </p>
              <p className="font-label text-[10px] text-secondary mt-0.5">
                {opt.attacks.map((a) => `${a.name} +${a.bonus}`).join(' / ')}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
