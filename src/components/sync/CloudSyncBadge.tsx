import { useSyncStore } from '../../store/useSyncStore'
import { syncSessionsNow } from '../../lib/session-sync'

interface CloudSyncBadgeProps {
  compact?: boolean
}

export function CloudSyncBadge({ compact = true }: CloudSyncBadgeProps) {
  const status = useSyncStore((s) => s.status)
  const pendingCount = useSyncStore((s) => s.pendingCount)

  if (status === 'idle') return null

  const config = (() => {
    switch (status) {
      case 'synced':
        return {
          icon: 'cloud_done',
          label: 'Cloud',
          title: 'Stato salvato su Neon Cloud — clicca per sincronizzare',
          className:
            'text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 hover:shadow-[0_0_14px_rgba(0,240,255,0.25)]',
          spin: false,
        }
      case 'syncing':
      case 'loading':
        return {
          icon: 'sync',
          label: 'Sync...',
          title: 'Sincronizzazione stato su Neon Cloud in corso...',
          className: 'text-primary border-primary/40 bg-primary/15',
          spin: true,
        }
      case 'offline':
        return {
          icon: 'cloud_off',
          label: pendingCount > 0 ? `Offline (${pendingCount})` : 'Offline',
          title:
            'Connessione cloud assente — stato salvato in locale, clicca per riprovare',
          className:
            'text-[#ffb4ab] border-error/40 bg-error/15 hover:bg-error/25',
          spin: false,
        }
      case 'unconfigured':
        return {
          icon: 'save',
          label: 'Locale',
          title:
            'Salvataggio solo locale (configura DATABASE_URL su Vercel per abilitare Neon Cloud)',
          className:
            'text-tertiary border-white/10 bg-surface-container/70 hover:text-white hover:border-white/20',
          spin: false,
        }
    }
  })()

  return (
    <button
      type="button"
      data-testid="cloud-sync-badge"
      onClick={() => {
        void syncSessionsNow()
      }}
      title={config.title}
      aria-label={config.title}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-label text-[10px] uppercase tracking-widest transition-all duration-300 cursor-pointer ${config.className}`}
    >
      <span
        className={`material-symbols-outlined text-sm leading-none ${
          config.spin ? 'animate-spin' : ''
        }`}
      >
        {config.icon}
      </span>
      <span className={compact ? 'hidden lg:inline' : 'inline'}>{config.label}</span>
    </button>
  )
}
