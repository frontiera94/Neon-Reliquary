import type { FacingDirectionDeg } from '../../types/map'
import { rotateFacingStep } from '../../lib/battlemap-engine'
import { useTranslation } from '../../i18n'

interface FacingCompassDialProps {
  facingDeg: FacingDirectionDeg
  onChangeFacing: (deg: FacingDirectionDeg) => void
  disabled?: boolean
}

const COMPASS_GRID: readonly (
  | { label: string; deg: FacingDirectionDeg }
  | { label: 'CENTER'; deg: null }
)[] = [
  { label: 'NW', deg: 225 },
  { label: 'N', deg: 270 },
  { label: 'NE', deg: 315 },
  { label: 'W', deg: 180 },
  { label: 'CENTER', deg: null },
  { label: 'E', deg: 0 },
  { label: 'SW', deg: 135 },
  { label: 'S', deg: 90 },
  { label: 'SE', deg: 45 },
] as const

export function FacingCompassDial({
  facingDeg,
  onChangeFacing,
  disabled = false,
}: FacingCompassDialProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-label text-[10px] uppercase tracking-widest text-tertiary">
          {t('battlemap.facingLabel')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChangeFacing(rotateFacingStep(facingDeg, -1))}
            aria-label={t('battlemap.rotateLeft')}
            title={t('battlemap.rotateLeft')}
            className="px-2 py-1 rounded-lg bg-surface-container-high/70 border border-white/10 text-xs text-tertiary hover:text-primary hover:border-primary/40 disabled:opacity-40 cursor-pointer transition-colors"
          >
            ↺ -45°
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChangeFacing(rotateFacingStep(facingDeg, 1))}
            aria-label={t('battlemap.rotateRight')}
            title={t('battlemap.rotateRight')}
            className="px-2 py-1 rounded-lg bg-surface-container-high/70 border border-white/10 text-xs text-tertiary hover:text-primary hover:border-primary/40 disabled:opacity-40 cursor-pointer transition-colors"
          >
            ↻ +45°
          </button>
        </div>
      </div>

      <div
        role="group"
        aria-label={t('battlemap.facingLabel')}
        className="grid grid-cols-3 gap-1 w-32 mx-auto"
      >
        {COMPASS_GRID.map((item) => {
          if (item.deg === null) {
            return (
              <div
                key="center"
                className="h-8 flex items-center justify-center rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-primary"
              >
                {facingDeg}°
              </div>
            )
          }
          const isActive = facingDeg === item.deg
          return (
            <button
              key={item.label}
              type="button"
              disabled={disabled}
              data-testid={`compass-dir-${item.label}`}
              onClick={() => onChangeFacing(item.deg)}
              className={`h-8 rounded-lg font-label text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 ${
                isActive
                  ? 'bg-primary/25 text-primary border border-primary/60 shadow-[0_0_10px_rgba(0,240,255,0.35)]'
                  : 'bg-surface-container-high/60 text-tertiary border border-white/10 hover:text-white hover:border-white/25'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
