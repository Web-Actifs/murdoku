import { describe, expect, it } from 'vitest'
import { cormoranDef } from '../../data/v2/premier-cas'
import { footprintOf, outlinePath } from './footprint'

/** Corners are the only place the path turns, so counting them counts the shape. */
const corners = (path: string) => (path.match(/Q/g) ?? []).length

describe('footprintOf', () => {
  it('normalizes a run to its own bounding box and reports its direction', () => {
    const vertical = footprintOf([
      { row: 4, col: 3 },
      { row: 5, col: 3 },
    ])
    expect(vertical.cells).toEqual([
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ])
    expect(vertical.rows).toBe(2)
    expect(vertical.cols).toBe(1)
    expect(vertical.isRun).toBe(true)
    expect(vertical.vertical).toBe(true)
    expect(vertical.runLength).toBe(200)
  })

  it('does not call the L-shaped helm a run — its art cannot be a straight strip', () => {
    const helm = cormoranDef.objects.find((o) => o.id === 'barre')!
    const footprint = footprintOf(helm.cells)
    expect(footprint.rows).toBe(2)
    expect(footprint.cols).toBe(2)
    expect(footprint.isRun).toBe(false)
  })
})

describe('outlinePath — the silhouette of the union, not of each cell', () => {
  it('insets a single cell by the same amount on all four sides', () => {
    const path = outlinePath([{ row: 0, col: 0 }], 10, 0)
    expect(corners(path)).toBe(4)
    for (const point of ['10 10', '90 10', '90 90', '10 90']) expect(path).toContain(point)
  })

  it('joins a run into one long shape rather than two squares', () => {
    const path = outlinePath(
      [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
      10,
      0,
    )
    // Four corners: the seams between the three cells are not corners at all.
    expect(corners(path)).toBe(4)
    expect(path).toContain('290 10')
  })

  it('traces the real outline of an L, elbow included', () => {
    const helm = cormoranDef.objects.find((o) => o.id === 'barre')!
    const path = outlinePath(footprintOf(helm.cells).cells, 10, 0)
    expect(corners(path)).toBe(6)
    // The elbow: at a reflex corner both edges still move toward the inside of
    // the shape, so the missing cell's corner lands at (110, 110), not (90, 90).
    expect(path).toContain('110 110')
  })

  it('rounds corners without ever cutting back further than half an edge', () => {
    const path = outlinePath([{ row: 0, col: 0 }], 40, 999)
    // A 20-wide square asked for a huge radius still produces a closed path.
    expect(corners(path)).toBe(4)
    expect(path.endsWith('Z')).toBe(true)
    expect(path).not.toContain('NaN')
  })
})
