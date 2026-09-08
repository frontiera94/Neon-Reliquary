import { describe, it, expect } from 'vitest'
import { initFog, paintFog, isCellHidden, paintRect } from './fog-utils'

describe('initFog', () => {
  it('creates grid filled with zeros', () => {
    const fog = initFog(4, 3)
    expect(fog.cols).toBe(4)
    expect(fog.rows).toBe(3)
    expect(fog.cells).toHaveLength(12)
    expect(fog.cells.every((c) => c === 0)).toBe(true)
  })
})

describe('paintFog', () => {
  it('hides a cell', () => {
    const fog = initFog(5, 5)
    const updated = paintFog(fog, 2, 3, true)
    expect(isCellHidden(updated, 2, 3)).toBe(true)
  })

  it('reveals a previously hidden cell', () => {
    let fog = initFog(5, 5)
    fog = paintFog(fog, 1, 1, true)
    const updated = paintFog(fog, 1, 1, false)
    expect(isCellHidden(updated, 1, 1)).toBe(false)
  })

  it('returns same reference when out of bounds', () => {
    const fog = initFog(3, 3)
    expect(paintFog(fog, -1, 0, true)).toBe(fog)
    expect(paintFog(fog, 0, -1, true)).toBe(fog)
    expect(paintFog(fog, 3, 0, true)).toBe(fog)
    expect(paintFog(fog, 0, 3, true)).toBe(fog)
  })

  it('does not mutate original cells array', () => {
    const fog = initFog(4, 4)
    paintFog(fog, 0, 0, true)
    expect(fog.cells[0]).toBe(0)
  })

  it('only changes the target cell', () => {
    const fog = initFog(3, 3)
    const updated = paintFog(fog, 1, 1, true)
    const hiddenCount = updated.cells.filter((c) => c === 1).length
    expect(hiddenCount).toBe(1)
  })
})

describe('isCellHidden', () => {
  it('returns false for visible cell', () => {
    const fog = initFog(5, 5)
    expect(isCellHidden(fog, 2, 2)).toBe(false)
  })

  it('returns true for hidden cell', () => {
    const fog = paintFog(initFog(5, 5), 0, 0, true)
    expect(isCellHidden(fog, 0, 0)).toBe(true)
  })

  it('returns false for negative coords', () => {
    expect(isCellHidden(initFog(3, 3), -1, 0)).toBe(false)
    expect(isCellHidden(initFog(3, 3), 0, -1)).toBe(false)
  })

  it('returns false for coords >= dimensions', () => {
    const fog = initFog(3, 3)
    expect(isCellHidden(fog, 3, 0)).toBe(false)
    expect(isCellHidden(fog, 0, 3)).toBe(false)
  })
})

describe('paintRect', () => {
  it('hides all cells in rectangle', () => {
    const fog = initFog(10, 10)
    const updated = paintRect(fog, 1, 1, 3, 3, true)
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        expect(isCellHidden(updated, c, r)).toBe(true)
      }
    }
    expect(isCellHidden(updated, 0, 0)).toBe(false)
    expect(isCellHidden(updated, 4, 4)).toBe(false)
  })

  it('reveals all cells in rectangle', () => {
    let fog = initFog(5, 5)
    fog = paintRect(fog, 0, 0, 4, 4, true)
    const cleared = paintRect(fog, 1, 1, 2, 2, false)
    expect(isCellHidden(cleared, 1, 1)).toBe(false)
    expect(isCellHidden(cleared, 0, 0)).toBe(true)
  })

  it('clips to grid bounds without error', () => {
    const fog = initFog(5, 5)
    const updated = paintRect(fog, -10, -10, 100, 100, true)
    expect(updated.cells.every((c) => c === 1)).toBe(true)
  })

  it('handles reversed start/end coords', () => {
    const fog = initFog(5, 5)
    const a = paintRect(fog, 3, 3, 1, 1, true)
    const b = paintRect(fog, 1, 1, 3, 3, true)
    expect(a.cells).toEqual(b.cells)
  })

  it('does not mutate original', () => {
    const fog = initFog(4, 4)
    paintRect(fog, 0, 0, 3, 3, true)
    expect(fog.cells.every((c) => c === 0)).toBe(true)
  })
})
