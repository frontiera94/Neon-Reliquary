import { useLocaleStore, type Locale, type LocaleState } from '../../store/useLocaleStore'

function ItalianFlagSvg({ className = 'w-4 h-3' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      className={`${className} rounded-[2px] flex-shrink-0`}
      aria-hidden="true"
    >
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  )
}

function BritishFlagSvg({ className = 'w-4 h-3' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 30"
      className={`${className} rounded-[2px] flex-shrink-0`}
      aria-hidden="true"
    >
      <clipPath id="gb-clip">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="gb-diag">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#gb-clip)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath="url(#gb-diag)"
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}

export function LanguageFlagSwitcher({
  variant = 'pill',
}: {
  variant?: 'pill' | 'settings'
}) {
  const locale = useLocaleStore((s: LocaleState) => s.locale)
  const setLocale = useLocaleStore((s: LocaleState) => s.setLocale)

  const options: { code: Locale; label: string; Flag: typeof ItalianFlagSvg }[] = [
    { code: 'en', label: 'English', Flag: BritishFlagSvg },
    { code: 'it', label: 'Italiano', Flag: ItalianFlagSvg },
  ]

  if (variant === 'settings') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {options.map(({ code, label, Flag }) => {
          const active = locale === code
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border font-label text-xs uppercase tracking-widest transition-all cursor-pointer ${
                active
                  ? 'bg-primary/15 text-primary border-primary/40 shadow-[0_0_12px_rgba(0,240,255,0.2)] font-bold'
                  : 'bg-surface-container-high text-tertiary border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Flag className="w-5 h-3.5" />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="flex items-center rounded-lg bg-surface-container-high/80 border border-white/10 p-0.5"
      role="group"
      aria-label="Language"
    >
      {options.map(({ code, label, Flag }) => {
        const active = locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-all cursor-pointer ${
              active
                ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_8px_rgba(0,240,255,0.25)]'
                : 'text-tertiary/70 hover:text-white border border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Flag className="w-4 h-2.5" />
            <span className="font-label text-[9px] uppercase tracking-wider hidden sm:inline">
              {code}
            </span>
          </button>
        )
      })}
    </div>
  )
}
