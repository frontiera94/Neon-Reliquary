import { useSyncStore } from '../../store/useSyncStore'
import { syncSessionsNow } from '../../lib/session-sync'
import { useTranslation } from '../../i18n'

interface CloudSyncBadgeProps {
  compact?: boolean
}

export function CloudSyncBadge({ compact = true }: CloudSyncBadgeProps) {
  const status = useSyncStore((s) => s.status)
  const pendingCount = useSyncStore((s) => s.pendingCount)
  const { locale, t } = useTranslation()

  const config = (() => {
    switch (status) {
      case 'idle':
      case 'synced':
        return {
          icon: 'cloud_done',
          label: 'Cloud',
          title:
            locale === 'it'
              ? 'Stato salvato su Neon Cloud — clicca per sincronizzare'
              : 'State saved on Neon Cloud — click to sync',
          className:
            'text-primary/70 border-primary/20 bg-primary/5 hover:bg-primary/20 hover:text-primary',
          spin: false,
        }
      case 'syncing':
      case 'loading':
        return {
          icon: 'sync',
          label: `${t('sync.syncing')}...`,
          title:
            locale === 'it'
              ? 'Sincronizzazione stato su Neon Cloud in corso...'
              : 'Syncing state to Neon Cloud...',
          className: 'text-primary border-primary/40 bg-primary/15',
          spin: true,
        }
      case 'offline':
        return {
          icon: 'cloud_off',
          label: pendingCount > 0 ? `${t('sync.offline')} (${pendingCount})` : t('sync.offline'),
          title: t('sync.cloudUnavailable'),
          className:
            'text-[#ffb4ab] border-error/40 bg-error/15 hover:bg-error/25',
          spin: false,
        }
      case 'unconfigured':
        return {
          icon: 'save',
          label: t('sync.local'),
          title: t('sync.localOnlyHint'),
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-label text-[10px] uppercase tracking-widest cursor-pointer lg:min-w-[84px] ${config.className}`}
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
