import { cellKey, unoccupiableCells } from '../model/geometry'
import type { Assignment, Board } from '../model/types'
import { shuffled, type Random } from './random'

/**
 * A random complete placement: one cell per person, never on a non-occupiable
 * cell, and no two people sharing a cell, a row or a column (Claude/claude.md §2).
 * No clue exists at this stage, so that rule set is the whole of it — the clues
 * are derived *from* this solution afterwards, never the other way round.
 *
 * Returns null when the board simply can't seat everyone (too few free
 * rows/columns), rather than throwing: the caller treats it as a failed attempt.
 */
export function generateSolution(board: Board, peopleIds: readonly string[], random: Random): Assignment | null {
  const blocked = unoccupiableCells(board)
  const free = board.cells.filter((c) => !blocked.has(cellKey(c)))

  const order = shuffled(peopleIds, random)
  const assignment: Assignment = {}
  const usedRows = new Set<number>()
  const usedCols = new Set<number>()

  function place(index: number): boolean {
    if (index === order.length) return true

    for (const cell of shuffled(free, random)) {
      if (usedRows.has(cell.row) || usedCols.has(cell.col)) continue

      usedRows.add(cell.row)
      usedCols.add(cell.col)
      assignment[order[index]] = cellKey(cell)

      if (place(index + 1)) return true

      usedRows.delete(cell.row)
      usedCols.delete(cell.col)
      delete assignment[order[index]]
    }
    return false
  }

  return place(0) ? assignment : null
}
