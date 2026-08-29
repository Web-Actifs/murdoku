import { isCompleteAssignmentValid, pairwiseOk, staticDomain } from '../constraints/domain'
import { assignedCell, cellKey } from '../model/geometry'
import type { Assignment, Puzzle } from '../model/types'

export interface SolveOptions {
  /** Stop searching once this many distinct solutions have been found. */
  limit?: number
}

/**
 * Finds valid placements of every person on the board. Backtracking search
 * ordered by most-constrained-person-first, pruned by domain, by the fundamental
 * no-shared-row/no-shared-column rule, and by relational constraints. Stops once
 * `limit` solutions are found (default 2, enough to tell "exactly one" from
 * "ambiguous").
 *
 * The victim carries little to no personal constraint, so this ordering places
 * them last "for free" — matching Claude/claude.md §14 without any special case.
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

  function backtrack(index: number, assignment: Assignment, usedCells: Set<string>, usedRows: Set<number>, usedCols: Set<number>) {
    if (solutions.length >= limit) return

    if (index === order.length) {
      if (isCompleteAssignmentValid(puzzle, assignment)) solutions.push({ ...assignment })
      return
    }

    const person = order[index]
    for (const candidate of domains.get(person.id)!) {
      if (usedCells.has(candidate)) continue
      const [row, col] = candidate.split(':').map(Number)
      if (usedRows.has(row) || usedCols.has(col)) continue

      assignment[person.id] = candidate
      const ok = people.every((p) => pairwiseOk(p.constraints, p.id, assignment, board))

      if (ok) {
        usedCells.add(candidate)
        usedRows.add(row)
        usedCols.add(col)
        backtrack(index + 1, assignment, usedCells, usedRows, usedCols)
        usedCells.delete(candidate)
        usedRows.delete(row)
        usedCols.delete(col)
      }

      delete assignment[person.id]
      if (solutions.length >= limit) return
    }
  }

  backtrack(0, {}, new Set(), new Set(), new Set())
  return solutions
}

/**
 * The murderer is derived, never stored: whoever alone shares the victim's final
 * zone. A zone with the victim plus two or more others identifies no one — that's
 * a valid outcome (Claude/claude.md §15), not an error.
 */
export function deriveMurderer(puzzle: Puzzle, assignment: Assignment): string | null {
  const victimCell = assignedCell(puzzle.board, assignment, puzzle.victimId)
  if (!victimCell) throw new Error('Victim is not placed in this assignment')

  const others = puzzle.people.filter(
    (p) => p.id !== puzzle.victimId && assignedCell(puzzle.board, assignment, p.id)?.zoneId === victimCell.zoneId,
  )
  return others.length === 1 ? others[0].id : null
}
