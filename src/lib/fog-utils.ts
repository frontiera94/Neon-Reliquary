import type { FogMask } from '../types/map'

export function initFog(cols: number, rows: number): FogMask {
  return {
    cols,
    rows,
    cells: new Array(cols * rows).fill(0),
  }
}

export function paintFog(fog: FogMask, col: number, row: number, hidden: boolean): FogMask {
  if (col < 0 || col >= fog.cols || row < 0 || row >= fog.rows) {
    return fog
  }

  const newCells = [...fog.cells]
  newCells[row * fog.cols + col] = hidden ? 1 : 0

  return {
    cols: fog.cols,
    rows: fog.rows,
    cells: newCells,
  }
}

export function isCellHidden(fog: FogMask, col: number, row: number): boolean {
  if (col < 0 || col >= fog.cols || row < 0 || row >= fog.rows) {
    return false
  }

  return fog.cells[row * fog.cols + col] === 1
}

export function paintRect(
  fog: FogMask,
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  hidden: boolean
): FogMask {
  const minCol = Math.max(0, Math.min(startCol, endCol))
  const maxCol = Math.min(fog.cols - 1, Math.max(startCol, endCol))
  const minRow = Math.max(0, Math.min(startRow, endRow))
  const maxRow = Math.min(fog.rows - 1, Math.max(startRow, endRow))

  const newCells = [...fog.cells]
  const value = hidden ? 1 : 0

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      newCells[row * fog.cols + col] = value
    }
  }

  return {
    cols: fog.cols,
    rows: fog.rows,
    cells: newCells,
  }
}
