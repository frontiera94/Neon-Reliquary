import { useState, useRef, useEffect } from 'react'

export interface StatBreakdownTooltipProps {
  title: string
  total: number | string
  breakdown: { label: string; value: number }[]
  notes?: string[]
  children: React.ReactNode
  className?: string
  /** Hover (default) keeps legacy behaviour; click is better inside buttons. */
  trigger?: 'hover' | 'click'
  align?: 'center' | 'left' | 'right'
}

export function StatBreakdownTooltip({
  title,
  total,
  breakdown,
  notes,
  children,
  className = '',
  trigger = 'hover',
  align = 'center',
}: StatBreakdownTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const alignmentClass =
    align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={trigger === 'hover' ? () => setIsOpen(true) : undefined}
      onMouseLeave={trigger === 'hover' ? () => setIsOpen(false) : undefined}
      onFocus={trigger === 'hover' ? () => setIsOpen(true) : undefined}
      onBlur={trigger === 'hover' ? () => setIsOpen(false) : undefined}
      onClick={
        trigger === 'click'
          ? (event) => {
              event.stopPropagation()
              setIsOpen((open) => !open)
            }
          : undefined
      }
    >
      {children}

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute top-full ${alignmentClass} mt-2 z-[140] w-64 max-w-[82vw] animate-in fade-in zoom-in-95`}
        >
          <div className="backdrop-blur-md bg-[#181b26]/95 border border-white/10 rounded-xl p-3 shadow-2xl shadow-primary/5 text-left">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="font-headline text-xs font-bold uppercase tracking-wider text-secondary">
                {title}
              </span>
              <span className="font-label text-sm font-black text-primary tabular-nums">
                {total}
              </span>
            </div>

            {/* Breakdown List */}
            {breakdown && breakdown.length > 0 ? (
              <ul className="space-y-1 font-label text-xs">
                {breakdown.map((item, idx) => {
                  const isPositive = item.value > 0
                  const isNegative = item.value < 0
                  const valueColor = isPositive ? '#00daf3' : isNegative ? '#ffb4ab' : '#94a3b8'

                  return (
                    <li key={idx} className="flex items-center justify-between">
                      <span className="text-on-surface-variant text-[11px]">{item.label}</span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: valueColor }}>
                        {isPositive ? `+${item.value}` : item.value}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="font-label text-[11px] text-tertiary italic">Base value only</p>
            )}

            {/* Notes Section (e.g. Prone) */}
            {notes && notes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5 space-y-0.5">
                {notes.map((note, idx) => (
                  <p key={idx} className="font-label text-[10px] text-tertiary italic">
                    {note}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
