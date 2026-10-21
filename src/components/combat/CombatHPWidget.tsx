export function CombatHPWidget({
  hp,
  maxHp,
  ac,
  cmb,
  cmd,
  onAdjust,
}: {
  hp: number
  maxHp: number
  ac: number
  cmb?: number
  cmd?: number
  onAdjust: (delta: number) => void
}) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  return (
    <section className="bg-surface-container/90 backdrop-blur-sm p-6 flex flex-col lg:flex-row items-center gap-6 rounded-2xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      {/* HP Counter & Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onAdjust(-1)}
          className="w-11 h-11 rounded-xl bg-surface-container-high hover:bg-error-container text-primary hover:text-white transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5"
          aria-label="Decrease HP"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <div className="bg-surface-container-high px-6 py-3.5 text-center rounded-xl border border-white/5 min-w-[140px]">
          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">Vitality</p>
          <p className="font-label text-3xl font-black text-primary">
            {hp}
            <span className="text-tertiary text-sm font-normal"> / {maxHp}</span>
          </p>
        </div>
        <button
          onClick={() => onAdjust(1)}
          className="w-11 h-11 rounded-xl bg-surface-container-high hover:bg-primary-container text-primary hover:text-black transition-all active:scale-95 flex items-center justify-center cursor-pointer border border-white/5"
          aria-label="Increase HP"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* HP Bar */}
      <div className="flex-1 w-full flex flex-col gap-1.5">
        <div className="flex justify-between text-[11px] font-label text-tertiary uppercase tracking-wider px-0.5">
          <span>HP Gauge</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <div className="h-3.5 bg-surface-container-lowest rounded-full overflow-hidden p-0.5 border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #00f0ff 0%, #d946ef 70%, #ff4b60 100%)',
              boxShadow: '0 0 12px rgba(0,240,255,0.4)',
            }}
          />
        </div>
      </div>

      {/* Defense Badges: AC, CMB, CMD */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="bg-surface-container-high px-5 py-3.5 text-center rounded-xl border border-white/5 min-w-[70px]">
          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">AC</p>
          <p className="font-label text-2xl font-bold text-on-surface">{ac}</p>
        </div>

        {cmb !== undefined && (
          <div className="bg-surface-container-high px-5 py-3.5 text-center rounded-xl border border-white/5 min-w-[70px]">
            <p className="font-label text-[10px] text-secondary uppercase tracking-widest font-semibold">
              CMB
            </p>
            <p className="font-label text-2xl font-bold text-secondary">
              {cmb >= 0 ? `+${cmb}` : cmb}
            </p>
          </div>
        )}

        {cmd !== undefined && (
          <div className="bg-surface-container-high px-5 py-3.5 text-center rounded-xl border border-white/5 min-w-[70px]">
            <p className="font-label text-[10px] text-primary uppercase tracking-widest font-semibold">
              CMD
            </p>
            <p className="font-label text-2xl font-bold text-primary">{cmd}</p>
          </div>
        )}
      </div>
    </section>
  )
}
