import { useLanguageStore } from '../../store/useLanguageStore'

interface LanguageToggleProps {
  className?: string
  variant?: 'compact' | 'full'
}

export function LanguageToggle({ className = '', variant = 'compact' }: LanguageToggleProps) {
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`} data-testid="language-toggle-full">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-label text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            language === 'en'
              ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'text-tertiary hover:text-white bg-surface-container-high/40 border border-white/5'
          }`}
          aria-pressed={language === 'en'}
          aria-label="Switch to English"
        >
          <span>English (EN)</span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage('it')}
          className={`flex-1 py-1.5 px-3 rounded-lg font-label text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            language === 'it'
              ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'text-tertiary hover:text-white bg-surface-container-high/40 border border-white/5'
          }`}
          aria-pressed={language === 'it'}
          aria-label="Passa all'Italiano"
        >
          <span>Italiano (IT)</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-white/10 bg-surface-container-high/60 p-0.5 text-[10px] font-label font-bold uppercase tracking-wider ${className}`}
      data-testid="language-toggle"
      role="group"
      aria-label="Select language"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-primary text-black font-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
            : 'text-tertiary hover:text-white'
        }`}
        aria-pressed={language === 'en'}
        aria-label="English language"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('it')}
        className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
          language === 'it'
            ? 'bg-primary text-black font-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
            : 'text-tertiary hover:text-white'
        }`}
        aria-pressed={language === 'it'}
        aria-label="Lingua italiana"
      >
        IT
      </button>
    </div>
  )
}
