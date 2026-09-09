import { isCompleteAssignmentValid, pairwiseOk, staticDomain } from '../constraints/domain'
import { assignedCell, cellKey, parseCellKey } from '../model/geometry'
import type { Assignment, Puzzle } from '../model/types'

export interface SolveOptions {
  /** Stop searching once this many distinct solutions have been found. */
  limit?: number
}

/**
 * Finds valid placements of every person in the building. Backtracking search
 * ordered by most-constrained-person-first, pruned by domain, by §2 *scoped to a
 * floor*, and by relational constraints.
 *
 * The floor scoping is the only structural difference from V2's solver, and it
 * makes the search meaningfully wider: a used row costs nothing on the other
 * levels, so the pruning that carried V2 through a 36-cell board has to work
 * across three times as many cells with a third of the bite. Most-constrained
 * ordering is what keeps that tractable.
 */
export function solvePuzzle(puzzle: Puzzle, options: SolveOptions = {}): Assignment[] {
  const limit = options.limit ?? 2
  const { board, people } = puzzle

  const domains = new Map<string, string[]>()
  for (const person of people) {
    domains.set(person.id, staticDomain(person.constraints, board).map(cellKey))
  }

  const order = [...people].sort((a, b) => domains.get(a.id)!.length - domains.get(b.id)!.length)

  const solutions: Assignment[] = []
  const usedCells = new Set<string>()
  /** "floor:row" and "floor:col" keys — §2 is per level here. */
  const usedRows = new Set<string>()
  const usedCols = new Set<string>()

  function backtrack(index: number, assignment: Assignment) {
    if (solutions.length >= limit) return

    if (index === order.length) {
      if (isCompleteAssignmentValid(puzzle, assignment)) solutions.push({ ...assignment })
      return
    }

    const person = order[index]
    for (const candidate of domains.get(person.id)!) {
      if (usedCells.has(candidate)) continue
      const { floor, row, col } = parseCellKey(candidate)
      const rowKey = `${floor}:${row}`
      const colKey = `${floor}:${col}`
      if (usedRows.has(rowKey) || usedCols.has(colKey)) continue

      assignment[person.id] = candidate
      const ok = people.every((p) => pairwiseOk(p.constraints, p.id, assignment, board))

      if (ok) {
        usedCells.add(candidate)
        usedRows.add(rowKey)
        usedCols.add(colKey)
        backtrack(index + 1, assignment)
        usedCells.delete(candidate)
        usedRows.delete(rowKey)
        usedCols.delete(colKey)
      }

      delete assignment[person.id]
      if (solutions.length >= limit) return
    }
  }

  backtrack(0, {})
  return solutions
}

/**
 * The murderer is derived, never stored: whoever alone shares the victim's final
 * *volume*. A volume with the victim plus two or more others names no one — a
 * valid outcome (§15), not an error.
 *
 * This is the one function the discovery mechanic rewrites without touching a
 * single placement: weld the cellar to the scullery and the body's volume grows
 * a floor, so a person who never set foot in the room the body lies in becomes
 * the only one alone with it.
 */
export function deriveMurderer(puzzle: Puzzle, assignment: Assignment): string | null {
  const victimCell = assignedCell(puzzle.board, assignment, puzzle.victimId)
  if (!victimCell) throw new Error('Victim is not placed in this assignment')

  const others = puzzle.people.filter(
    (p) => p.id !== puzzle.victimId && assignedCell(puzzle.board, assignment, p.id)?.zoneId === victimCell.zoneId,
  )
  return others.length === 1 ? others[0].id : null
}
