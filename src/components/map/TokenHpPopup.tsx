import type { Token } from '../../types/map'
import { useMapStore } from '../../store/useMapStore'

interface TokenHpPopupProps {
  token: Token
  onClose: () => void
  style?: React.CSSProperties
}

function hpColor(current: number, max: number): string {
  const pct = max > 0 ? current / max : 0
  if (pct > 0.5) return '#4ade80'
  if (pct >= 0.25) return '#fbbf24'
  return '#ef4444'
}

const DELTAS = [-10, -5, -1, 1, 5, 10]

export function TokenHpPopup({ token, onClose, style }: TokenHpPopupProps) {
  const editHP = useMapStore((s) => s.editHP)
  const liveToken = useMapStore((s) => s.map?.tokens.find((t) => t.id === token.id) ?? token)
  const hpPct = liveToken.hp.max > 0 ? Math.max(0, Math.min(1, liveToken.hp.current / liveToken.hp.max)) : 0

  return (
    <div
      style={{ position: 'absolute', zIndex: 100, padding: 12, minWidth: 180, ...style }}
      className="bg-surface-container-highest"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-label text-secondary text-sm">{liveToken.name}</span>
        <button
          onClick={onClose}
          className="text-tertiary hover:text-white font-label text-sm leading-none ml-2"
        >
          ×
        </button>
      </div>
      <div className="font-label text-xl text-white mb-2">
        {liveToken.hp.current} / {liveToken.hp.max}
      </div>
      <div className="w-full mb-3" style={{ height: 4, background: 'rgba(0,0,0,0.4)' }}>
        <div
          style={{
            width: `${hpPct * 100}%`,
            height: '100%',
            background: hpColor(liveToken.hp.current, liveToken.hp.max),
            transition: 'width 0.15s ease',
          }}
        />
      </div>
      <div className="flex gap-1">
        {DELTAS.map((delta) => (
          <button
            key={delta}
            onClick={() => editHP(liveToken.id, delta)}
            className="bg-surface-container text-white font-label text-xs px-2 py-1 hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]"
          >
            {delta > 0 ? `+${delta}` : delta}
          </button>
        ))}
      </div>
    </div>
  )
}
