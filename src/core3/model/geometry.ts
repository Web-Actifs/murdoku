import type { Direction } from '../constraints/types'
import type { Assignment, Board, Cell, CellRef, SceneObject } from './types'

const ORTHOGONAL_DELTAS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

export function cellKey(ref: CellRef): string {
  return `${ref.floor}:${ref.row}:${ref.col}`
}

export function parseCellKey(key: string): CellRef {
  const [floor, row, col] = key.split(':').map(Number)
  return { floor, row, col }
}

export function cellAt(board: Board, floor: number, row: number, col: number): Cell | undefined {
  return board.cellsByKey.get(`${floor}:${row}:${col}`)
}

export function cellForKey(board: Board, key: string): Cell | undefined {
  return board.cellsByKey.get(key)
}

export function assignedCell(board: Board, assignment: Assignment, personId: string): Cell | undefined {
  const key = assignment[personId]
  return key ? board.cellsByKey.get(key) : undefined
}

/**
 * Is the floor under this cell open? `openings` list upper-level cells with
 * nothing beneath them — a stairwell, a mezzanine's void, a hatch left ajar.
 */
export function isOpenBelow(board: Board, ref: CellRef): boolean {
  return board.openings.some((opening) => opening.cells.some((c) => cellKey(c) === cellKey(ref)))
}

/**
 * Neighbours in the building's own geometry: the four cells around it on its own
 * level, plus the cell directly under it when the floor is open and the cell
 * directly over it when *that* one's floor is open. A slab is not a neighbour.
 * Zones are not consulted here (see `sameZoneNeighbors` for "à côté de", §5).
 */
export function neighborsOf(board: Board, cell: CellRef): Cell[] {
  const result: Cell[] = []
  for (const [dr, dc] of ORTHOGONAL_DELTAS) {
    const neighbor = cellAt(board, cell.floor, cell.row + dr, cell.col + dc)
    if (neighbor) result.push(neighbor)
  }
  if (isOpenBelow(board, cell)) {
    const under = cellAt(board, cell.floor - 1, cell.row, cell.col)
    if (under) result.push(under)
  }
  const over = cellAt(board, cell.floor + 1, cell.row, cell.col)
  if (over && isOpenBelow(board, over)) result.push(over)
  return result
}

/**
 * On the building's exterior wall, judged on the cell's own level: a window
 * belongs in an outside wall, and what is above or below it is irrelevant to
 * that. Generic across any plan shape, unlike a bounding-box test.
 */
export function isPeripheral(board: Board, cell: CellRef): boolean {
  let count = 0
  for (const [dr, dc] of ORTHOGONAL_DELTAS) {
    if (cellAt(board, cell.floor, cell.row + dr, cell.col + dc)) count++
  }
  return count < 4
}

/** "à côté de" requires adjacency AND the same volume (§5) — vertically too. */
export function sameZoneNeighbors(board: Board, cell: Cell): Cell[] {
  return neighborsOf(board, cell).filter((n) => n.zoneId === cell.zoneId)
}

export function isAdjacent(board: Board, a: CellRef, b: CellRef): boolean {
  return neighborsOf(board, a).some((n) => cellKey(n) === cellKey(b))
}

/**
 * Pure single-axis comparison (§21), and floor-blind: "au nord de" says a
 * smaller row number and nothing else, whichever levels the two people are on.
 * The vertical is expressed by `above`/`below`/`sameShaft`, never by a compass
 * point, so that a direction clue never smuggles in a floor claim.
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

/** Same row and column: one is somewhere over the other, however many levels apart. */
export function sameShaft(a: CellRef, b: CellRef): boolean {
  return a.row === b.row && a.col === b.col
}

/**
 * §2, per floor. Two people can only be forbidden from coexisting when they
 * stand on the same level — the whole point of the third dimension is that a
 * shared row costs nothing across levels.
 */
export function mayCoexist(a: CellRef, b: CellRef): boolean {
  if (a.floor !== b.floor) return true
  return a.row !== b.row && a.col !== b.col
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
    const cell = board.cellsByKey.get(cellKey(ref))
    if (!cell) throw new Error(`Object ${obj.id} references a cell outside the building: ${cellKey(ref)}`)
    return cell
  })
}

/** Cells a person could stand on for this object — empty unless it's occupiable. */
export function onObjectCells(board: Board, obj: SceneObject): Cell[] {
  return obj.occupiable ? objectCells(board, obj) : []
}

/**
 * Union of same-volume neighbours across every cell of the object (§9) — never
 * one chosen cell. For a staircase, whose cells sit on two levels, this yields
 * the landing on both of them.
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
