import { describe, expect, it } from 'vitest'
import {
  adjacentToObjectCells,
  cellAt,
  cellKey,
  isDirection,
  isInColumn,
  isInRow,
  isOrthogonallyAdjacent,
  isPeripheral,
  onObjectCells,
  unoccupiableCells,
} from './geometry'
import type { Board, Cell, SceneObject } from './types'

// 3 rows x 5 cols, one zone. bed_01 sits mid-board (interior); window_01 sits on
// the top exterior row — mirrors the architecture dossier's worked example. The
// window is occupiable: §42 calls its cells `cellsFacingWindow`, the ordinary
// floor one stands on to face the opening. table_01 is the blocked object here.
function buildBoard(): Board {
  const cells: Cell[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 5; col++) cells.push({ row, col, zoneId: 'chambre' })
  }
  const objects: SceneObject[] = [
    {
      id: 'bed_01',
      type: 'bed',
      occupiable: true,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
    },
    {
      id: 'window_01',
      type: 'window',
      occupiable: true,
      cells: [
        { row: 0, col: 3 },
        { row: 0, col: 4 },
      ],
    },
    {
      id: 'table_01',
      type: 'table',
      occupiable: false,
      cells: [{ row: 2, col: 0 }],
    },
  ]
  return { cells, rows: 3, cols: 5, objects, cellsByKey: new Map(cells.map((c) => [cellKey(c), c])) }
}

describe('periphery', () => {
  it('flags cells with a missing orthogonal neighbor as exterior', () => {
    const board = buildBoard()
    expect(isPeripheral(board, cellAt(board, 0, 3)!)).toBe(true)
  })

  it('does not flag a cell whose 4 orthogonal neighbors all exist', () => {
    const board = buildBoard()
    expect(isPeripheral(board, cellAt(board, 1, 1)!)).toBe(false)
  })
})

describe('multi-cell objects', () => {
  it('unions adjacency across every cell of the object, not just one', () => {
    const board = buildBoard()
    const bed = board.objects[0]
    const adjacent = new Set(adjacentToObjectCells(board, bed).map(cellKey))
    expect(adjacent).toEqual(new Set(['0:1', '0:2', '2:1', '2:2', '1:0', '1:3']))
  })

  it('a non-occupiable object offers no cell to stand on', () => {
    const board = buildBoard()
    const table = board.objects[2]
    expect(onObjectCells(board, table)).toEqual([])
  })

  it('an occupiable object offers exactly its own cells', () => {
    const board = buildBoard()
    const bed = board.objects[0]
    expect(onObjectCells(board, bed).map(cellKey).sort()).toEqual(['1:1', '1:2'])
  })

  it('a window offers every cell facing it — "devant la fenêtre" is standable (§10)', () => {
    const board = buildBoard()
    const window = board.objects[1]
    expect(onObjectCells(board, window).map(cellKey).sort()).toEqual(['0:3', '0:4'])
  })

  it('collects every non-occupiable cell on the board, windows excluded', () => {
    const board = buildBoard()
    expect(unoccupiableCells(board)).toEqual(new Set(['2:0']))
  })
})

describe('directions and rows/columns', () => {
  it('isDirection is purely row/column comparison, no zone requirement', () => {
    const north = { row: 0, col: 2 }
    const south = { row: 2, col: 2 }
    expect(isDirection(north, south, 'N')).toBe(true)
    expect(isDirection(south, north, 'N')).toBe(false)
  })

  it('does not require sharing the other axis (unlike V1) — two people can differ in both row and column', () => {
    // Combined with the global row/column rule, requiring a shared axis here
    // would make "north of" unsatisfiable between two people.
    expect(isDirection({ row: 0, col: 0 }, { row: 2, col: 4 }, 'N')).toBe(true)
  })

  it('isOrthogonallyAdjacent rejects diagonals', () => {
    expect(isOrthogonallyAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false)
    expect(isOrthogonallyAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 })).toBe(true)
  })

  it('resolves top/bottom/left/right against the board bounds', () => {
    const board = buildBoard()
    expect(isInRow(board, { row: 0, col: 0 }, 'top')).toBe(true)
    expect(isInRow(board, { row: 2, col: 0 }, 'bottom')).toBe(true)
    expect(isInColumn(board, { row: 0, col: 4 }, 'right')).toBe(true)
    expect(isInColumn(board, { row: 0, col: 0 }, 'right')).toBe(false)
  })
})
