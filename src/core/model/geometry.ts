import type { Direction } from '../constraints/types'
import type { Assignment, Board, Cell, CellRef, SceneObject } from './types'

const ORTHOGONAL_DELTAS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

export function cellKey(ref: CellRef): string {
  return `${ref.row}:${ref.col}`
}

export function parseCellKey(key: string): CellRef {
  const [row, col] = key.split(':').map(Number)
  return { row, col }
}

export function cellAt(board: Board, row: number, col: number): Cell | undefined {
  return board.cellsByKey.get(`${row}:${col}`)
}

export function assignedCell(board: Board, assignment: Assignment, personId: string): Cell | undefined {
  const key = assignment[personId]
  if (!key) return undefined
  const [row, col] = key.split(':').map(Number)
  return cellAt(board, row, col)
}

/** Orthogonal neighbors that exist on the board — regardless of zone. */
export function neighborsOf(board: Board, cell: CellRef): Cell[] {
  const result: Cell[] = []
  for (const [dr, dc] of ORTHOGONAL_DELTAS) {
    const neighbor = cellAt(board, cell.row + dr, cell.col + dc)
    if (neighbor) result.push(neighbor)
  }
  return result
}

/**
 * A cell is on the building's exterior if at least one of its 4 orthogonal
 * positions has no cell at all — generic across any plan shape (L-shapes,
 * courtyards), unlike a min/max bounding-box test which breaks on concave plans.
 */
export function isPeripheral(board: Board, cell: CellRef): boolean {
  return neighborsOf(board, cell).length < 4
}

/** "à côté de" requires both orthogonal adjacency AND the same zone (§5). */
export function sameZoneNeighbors(board: Board, cell: Cell): Cell[] {
  return neighborsOf(board, cell).filter((n) => n.zoneId === cell.zoneId)
}

export function isOrthogonallyAdjacent(a: CellRef, b: CellRef): boolean {
  const dr = Math.abs(a.row - b.row)
  const dc = Math.abs(a.col - b.col)
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1)
}

/**
 * Pure single-axis comparison (Claude/claude.md §21) — "north of" only means a
 * smaller row number, nothing about sharing a column. Deliberately NOT the
 * same-axis-plus-inequality test V1 used: combined with the global row/column
 * exclusion (§2), requiring a shared axis would make this unsatisfiable for
 * two people (see the removed `adjacentToPerson` note in constraints/types.ts).
 */
export function isDirection(from: CellRef, to: CellRef, dir: Direction): boolean {
  switch (dir) {
    case 'N':
      return from.row < to.row
    case 'S':
      return from.row > to.row
    case 'E':
      return from.col > to.col
    case 'W':
      return from.col < to.col
  }
}

export function isInRow(board: Board, cell: CellRef, row: 'top' | 'bottom' | number): boolean {
  if (row === 'top') return cell.row === 0
  if (row === 'bottom') return cell.row === board.rows - 1
  return cell.row === row
}

export function isInColumn(board: Board, cell: CellRef, column: 'left' | 'right' | number): boolean {
  if (column === 'left') return cell.col === 0
  if (column === 'right') return cell.col === board.cols - 1
  return cell.col === column
}

export function objectCells(board: Board, obj: SceneObject): Cell[] {
  return obj.cells.map((ref) => {
    const cell = cellAt(board, ref.row, ref.col)
    if (!cell) throw new Error(`Object ${obj.id} references a cell outside the plan: ${cellKey(ref)}`)
    return cell
  })
}

/** Cells a person could stand on for this object — empty unless it's occupiable. */
export function onObjectCells(board: Board, obj: SceneObject): Cell[] {
  return obj.occupiable ? objectCells(board, obj) : []
}

/**
 * Union of same-zone orthogonal neighbors across every cell of the object
 * (Claude/claude.md §9) — never just the first or last cell of a multi-cell object.
 */
export function adjacentToObjectCells(board: Board, obj: SceneObject): Cell[] {
  const ownKeys = new Set(obj.cells.map(cellKey))
  const seen = new Map<string, Cell>()
  for (const cell of objectCells(board, obj)) {
    for (const neighbor of sameZoneNeighbors(board, cell)) {
      if (!ownKeys.has(cellKey(neighbor))) seen.set(cellKey(neighbor), neighbor)
    }
  }
  return [...seen.values()]
}

export function objectsOfType(board: Board, type: string): SceneObject[] {
  return board.objects.filter((o) => o.type === type)
}

/** Cells no one may ever stand on — the union of every non-occupiable object's cells. */
export function unoccupiableCells(board: Board): Set<string> {
  const result = new Set<string>()
  for (const obj of board.objects) {
    if (!obj.occupiable) for (const ref of obj.cells) result.add(cellKey(ref))
  }
  return result
}
