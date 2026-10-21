import { useEffect, useRef, useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useInspectorStore } from '../../store/useInspectorStore'

const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener?.('change', callback)
  return () => query.removeEventListener?.('change', callback)
}

function getDesktopSnapshot(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(DESKTOP_QUERY).matches
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, () => false)
}

const TYPE_LABELS: Record<string, string> = {
  feat: 'Feat / Talent',
  ability: 'Class Ability',
  classAbility: 'Class Ability',
  spell: 'Spell',
  buff: 'Active Effect',
  condition: 'Condition',
  weapon: 'Weapon',
  stat: 'Stat Breakdown',
}

export function InspectorDrawer() {
  const isOpen = useInspectorStore((s) => s.isOpen)
  const item = useInspectorStore((s) => s.currentItem)
  const closeInspector = useInspectorStore((s) => s.closeInspector)
  const isDesktop = useIsDesktop()
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInspector()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 40)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
    }
  }, [isOpen, closeInspector])

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          className="fixed inset-0 z-[80]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close inspector backdrop"
            onClick={closeInspector}
            className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-sm cursor-default"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="inspector-title"
            data-testid="inspector-drawer"
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="absolute right-0 bottom-0 left-0 lg:top-0 lg:left-auto lg:bottom-0 lg:w-[460px] max-h-[82vh] lg:max-h-none bg-[#11131c] border border-white/10 lg:border-y-0 lg:border-r-0 rounded-t-2xl lg:rounded-none shadow-[0_0_50px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10 bg-[#181b26]">
              <div className="min-w-0">
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-bold">
                  {TYPE_LABELS[item.type] ?? 'Inspector'}
                </span>
                <h2 id="inspector-title" className="font-headline text-xl font-bold text-white mt-1 truncate">
                  {item.title}
                </h2>
                {item.subtitle && (
                  <p className="font-label text-[11px] text-tertiary mt-1">{item.subtitle}</p>
                )}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeInspector}
                aria-label="Close inspector"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/10 text-tertiary hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-label text-[9px] uppercase tracking-wider px-2 py-1 border border-primary/30 bg-primary/10 text-primary rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="font-body text-sm leading-relaxed text-on-surface-variant whitespace-pre-line">
                {item.description}
              </p>

              {item.meta && item.meta.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {item.meta.map((entry) => (
                    <div key={entry.label} className="bg-[#181b26] border border-white/10 rounded-xl p-3">
                      <p className="font-label text-[9px] uppercase tracking-widest text-tertiary">{entry.label}</p>
                      <p className="font-label text-sm font-bold text-white tabular-nums mt-0.5">{entry.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {item.breakdown && item.breakdown.length > 0 && (
                <section>
                  <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-bold mb-2">
                    Calculation Breakdown
                  </h3>
                  <ul className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                    {item.breakdown.map((row, index) => (
                      <li
                        key={`${row.label}-${index}`}
                        className="flex items-center justify-between px-3 py-2 bg-[#181b26]"
                      >
                        <span className="font-label text-[11px] text-on-surface-variant">{row.label}</span>
                        <span
                          className={`font-label text-[11px] font-bold tabular-nums ${
                            row.value > 0
                              ? 'text-[#00daf3]'
                              : row.value < 0
                              ? 'text-[#ffb4ab]'
                              : 'text-tertiary'
                          }`}
                        >
                          {row.value > 0 ? `+${row.value}` : row.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {item.notes && item.notes.length > 0 && (
                <section>
                  <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-secondary font-bold mb-2">
                    Rules Notes
                  </h3>
                  <ul className="space-y-1.5">
                    {item.notes.map((note, index) => (
                      <li key={index} className="font-body text-xs text-tertiary leading-relaxed flex gap-2">
                        <span className="text-secondary/70 flex-shrink-0">▸</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {item.actions && item.actions.length > 0 && (
              <div className="p-4 border-t border-white/10 bg-[#181b26] flex flex-wrap gap-2">
                {item.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className={`min-h-[44px] flex-1 px-3 rounded-xl font-label text-xs uppercase tracking-wider font-bold border transition-all cursor-pointer active:scale-95 ${
                      action.variant === 'danger'
                        ? 'bg-error/15 border-error/40 text-error hover:bg-error/25'
                        : action.variant === 'secondary'
                        ? 'bg-secondary/15 border-secondary/40 text-secondary hover:bg-secondary/25'
                        : 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/25'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
