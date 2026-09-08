import type { ActionRestriction } from '../../lib/stat-calc'

interface ActionAlertBannerProps {
  restrictions: ActionRestriction[]
}

export function ActionAlertBanner({ restrictions }: ActionAlertBannerProps) {
  if (!restrictions || restrictions.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {restrictions.map((r) => {
        const borderStyle =
          r.severity === 'danger'
            ? 'border-l-4 border-l-error bg-error/10 text-error'
            : r.severity === 'warning'
            ? 'border-l-4 border-l-secondary bg-secondary/10 text-secondary'
            : 'border-l-4 border-l-primary bg-primary/10 text-primary'

        const iconName =
          r.severity === 'danger'
            ? 'error'
            : r.severity === 'warning'
            ? 'warning'
            : 'info'

        return (
          <div
            key={r.condition}
            className={`p-3.5 flex items-start gap-3 bg-surface-container border border-outline-variant/20 shadow-[0_2px_12px_rgba(0,0,0,0.3)] ${borderStyle}`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5">
              {iconName}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-headline text-xs uppercase tracking-widest font-bold">
                  Tactical Restriction: {r.title}
                </h4>
                <span className="font-label text-[9px] uppercase px-1.5 py-0.5 border border-current opacity-80">
                  {r.severity}
                </span>
              </div>
              <p className="font-body text-xs text-on-surface/80 mt-1 leading-relaxed">
                {r.message}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
