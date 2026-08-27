import type { Direction, GridCell } from './types'

export function cellById(grid: GridCell[], id: string): GridCell {
  const cell = grid.find((c) => c.id === id)
  if (!cell) throw new Error(`Unknown cell id: ${id}`)
  return cell
}

export function gridBounds(grid: GridCell[]) {
  const xs = grid.map((c) => c.x)
  const ys = grid.map((c) => c.y)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

/** True if `from` is in the given cardinal direction relative to `to` (e.g. from is North of to). */
export function isDirection(from: GridCell, to: GridCell, direction: Direction): boolean {
  switch (direction) {
    case 'N':
      return from.x === to.x && from.y < to.y
    case 'S':
      return from.x === to.x && from.y > to.y
    case 'E':
      return from.y === to.y && from.x > to.x
    case 'W':
      return from.y === to.y && from.x < to.x
  }
}

export function isOrthogonallyAdjacent(a: GridCell, b: GridCell): boolean {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1)
}

export function neighborsOf(grid: GridCell[], cell: GridCell): GridCell[] {
  return grid.filter((c) => c.id !== cell.id && isOrthogonallyAdjacent(c, cell))
}

export function isInRow(grid: GridCell[], cell: GridCell, row: 'top' | 'bottom' | number): boolean {
  const { minY, maxY } = gridBounds(grid)
  if (row === 'top') return cell.y === minY
  if (row === 'bottom') return cell.y === maxY
  return cell.y === row
}

export function isInColumn(grid: GridCell[], cell: GridCell, column: 'left' | 'right' | number): boolean {
  const { minX, maxX } = gridBounds(grid)
  if (column === 'left') return cell.x === minX
  if (column === 'right') return cell.x === maxX
  return cell.x === column
}

export function cellsInRoom(grid: GridCell[], roomId: string): GridCell[] {
  return grid.filter((c) => c.roomId === roomId)
}
