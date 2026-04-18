import { memo } from 'react'
import type { FogMask } from '../../types/map'

interface FogLayerProps {
  fog: FogMask
  gridSize: number
  isReadOnly: boolean
}

export const FogLayer = memo(function FogLayer({ fog, gridSize, isReadOnly }: FogLayerProps) {
  const { cols, rows, cells } = fog
  const fill = isReadOnly ? '#0a0a0a' : 'rgba(0,0,0,0.45)'
  const rects: React.ReactElement[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (cells[row * cols + col] === 1) {
        rects.push(
          <rect
            key={`${col}-${row}`}
            x={col * gridSize}
            y={row * gridSize}
            width={gridSize}
            height={gridSize}
            fill={fill}
          />
        )
      }
    }
  }

  return <g pointerEvents="none">{rects}</g>
})
