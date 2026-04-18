interface RulerOverlayProps {
  startPx: { x: number; y: number } | null
  endPx: { x: number; y: number } | null
  gridSize: number
}

export function RulerOverlay({ startPx, endPx, gridSize }: RulerOverlayProps) {
  if (!startPx || !endPx) return null

  const dx = (endPx.x - startPx.x) / gridSize
  const dy = (endPx.y - startPx.y) / gridSize
  const cells = Math.sqrt(dx * dx + dy * dy)
  const feet = Math.round(cells * 5)

  const midX = (startPx.x + endPx.x) / 2
  const midY = (startPx.y + endPx.y) / 2

  return (
    <g pointerEvents="none">
      <line
        x1={startPx.x}
        y1={startPx.y}
        x2={endPx.x}
        y2={endPx.y}
        stroke="#00daf3"
        strokeWidth={2}
        strokeDasharray="6 3"
      />
      <rect
        x={midX - 25}
        y={midY - 8 - 9}
        width={50}
        height={18}
        fill="rgba(0,0,0,0.7)"
      />
      <text
        x={midX}
        y={midY - 8}
        fill="#00daf3"
        fontSize={12}
        fontFamily="Space Grotesk"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {feet} ft
      </text>
    </g>
  )
}
