export function CombatHPWidget({
  hp, maxHp, ac, onAdjust,
}: {
  hp: number
  maxHp: number
  ac: number
  onAdjust: (delta: number) => void
}) {
  const percent = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  return (
    <section className="bg-surface-container p-6 flex flex-col md:flex-row items-center gap-6 border border-primary/30 shadow-[0_0_15px_rgba(0,218,243,0.08)]">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onAdjust(-1)}
          className="w-12 h-12 bg-surface-container-high hover:bg-error-container text-primary hover:text-on-error transition-all active:scale-95 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">remove</span>
        </button>
        <div className="bg-surface-container-high px-6 py-4 text-center">
          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">HP</p>
          <p className="font-label text-3xl font-black text-primary">
            {hp}<span className="text-tertiary text-lg font-normal"> / {maxHp}</span>
          </p>
        </div>
        <button
          onClick={() => onAdjust(1)}
          className="w-12 h-12 bg-surface-container-high hover:bg-primary-container text-primary hover:text-on-primary transition-all active:scale-95 flex items-center justify-center"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* HP Bar */}
      <div className="flex-1 w-full">
        <div className="h-3 bg-surface-container-lowest overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #00daf3 0%, #93000a 100%)',
            }}
          />
        </div>
      </div>

      {/* AC */}
      <div className="bg-surface-container-high px-6 py-4 text-center">
        <p className="font-label text-[10px] text-tertiary uppercase tracking-widest">AC</p>
        <p className="font-label text-3xl font-bold text-on-surface">{ac}</p>
      </div>
    </section>
  )
}
