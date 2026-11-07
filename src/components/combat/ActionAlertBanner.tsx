import type { ActionRestriction } from '../../lib/stat-calc'

interface ActionAlertBannerProps {
  restrictions: ActionRestriction[]
}

export function ActionAlertBanner({ restrictions }: ActionAlertBannerProps) {
  if (!restrictions || restrictions.length === 0) return null

  return (
    <div className="space-y-2 mb-4">
      {restrictions.map((r) => {
        const styleConfig =
          r.severity === 'danger'
            ? 'border-error/40 bg-error/10 text-error shadow-[0_0_20px_rgba(255,75,96,0.15),inset_0_1px_0_rgba(255,75,96,0.2)]'
            : r.severity === 'warning'
            ? 'border-secondary/40 bg-secondary/10 text-secondary shadow-[0_0_20px_rgba(217,70,239,0.15),inset_0_1px_0_rgba(217,70,239,0.2)]'
            : 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_20px_rgba(0,240,255,0.15),inset_0_1px_0_rgba(0,240,255,0.2)]'

        const iconName =
          r.severity === 'danger'
            ? 'error'
            : r.severity === 'warning'
            ? 'warning'
            : 'info'

        return (
          <div
            key={r.condition}
            className={`p-3.5 rounded-xl flex items-start gap-3 bg-surface-container/95 backdrop-blur-md border ${styleConfig}`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0 mt-0.5">
              {iconName}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-headline text-xs uppercase tracking-widest font-bold">
                  Tactical Restriction: {r.title}
                </h4>
                <span className="font-label text-[9px] uppercase px-2 py-0.5 rounded-full border border-current opacity-85 font-semibold">
                  {r.severity}
                </span>
              </div>
              <p className="font-body text-xs text-on-surface/90 mt-1 leading-relaxed">
                {r.message}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
