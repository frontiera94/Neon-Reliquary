import type { Token } from '../../types/map'

interface TokenNodeProps {
  token: Token
  gridSize: number
  isReadOnly: boolean
  isSelected: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  onClick?: () => void
}

function hpColor(current: number, max: number): string {
  const pct = max > 0 ? current / max : 0
  if (pct > 0.5) return '#4ade80'
  if (pct >= 0.25) return '#fbbf24'
  return '#ef4444'
}

function kindColor(kind: Token['kind']): string {
  if (kind === 'pc') return '#00daf3'
  if (kind === 'enemy') return '#ef4444'
  return '#fbbf24'
}

export function TokenNode({ token, gridSize, isReadOnly, isSelected, onPointerDown, onClick }: TokenNodeProps) {
  const r = gridSize * 0.38
  const barFullWidth = gridSize * 0.76
  const barX = -gridSize * 0.38
  const barY = gridSize * 0.42
  const hpPct = token.hp.max > 0 ? Math.max(0, Math.min(1, token.hp.current / token.hp.max)) : 0
  const fgWidth = hpPct * barFullWidth

  return (
    <g
      cursor={isReadOnly ? 'default' : 'grab'}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <circle
        cx={0}
        cy={0}
        r={r}
        fill={token.color}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={1}
      />
      <text
        x={0}
        y={0}
        fill="white"
        fontSize={gridSize * 0.3}
        fontFamily="Space Grotesk"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {token.initial}
      </text>
      <rect
        x={barX}
        y={barY}
        width={barFullWidth}
        height={4}
        fill="rgba(0,0,0,0.5)"
      />
      <rect
        x={barX}
        y={barY}
        width={fgWidth}
        height={4}
        fill={hpColor(token.hp.current, token.hp.max)}
      />
      {isSelected && (
        <circle
          r={gridSize * 0.42}
          fill="none"
          stroke="#00daf3"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
      <circle
        cx={gridSize * 0.28}
        cy={gridSize * 0.28}
        r={4}
        fill={kindColor(token.kind)}
      />
    </g>
  )
}
