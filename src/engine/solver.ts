import { pairwiseOk, isCompleteAssignmentValid, staticDomain } from './clues'
import type { Assignment, CaseDef } from './types'

export interface SolveOptions {
  /** Stop searching once this many distinct solutions have been found. */
  limit?: number
}

/**
 * Finds valid placements of every character on the grid, satisfying every clue.
 * Backtracking search ordered by most-constrained-character-first, pruned as early
 * as possible. Stops once `limit` solutions are found (default 2, which is enough
 * to tell "exactly one" from "ambiguous").
 */
export function solveCase(caseDef: CaseDef, options: SolveOptions = {}): Assignment[] {
  const limit = options.limit ?? 2
  const { grid, characters } = caseDef

  const domains = new Map<string, string[]>()
  for (const character of characters) {
    const staticCells = staticDomain(character.clues, grid)
    domains.set(character.id, staticCells.map((c) => c.id))
  }

  const order = [...characters].sort((a, b) => domains.get(a.id)!.length - domains.get(b.id)!.length)

  const solutions: Assignment[] = []

  function backtrack(index: number, assignment: Assignment, usedCells: Set<string>) {
    if (solutions.length >= limit) return

    if (index === order.length) {
      if (isCompleteAssignmentValid(caseDef, assignment)) {
        solutions.push({ ...assignment })
      }
      return
    }

    const character = order[index]
    for (const cellId of domains.get(character.id)!) {
      if (usedCells.has(cellId)) continue

      assignment[character.id] = cellId
      const ok = characters.every((c) => pairwiseOk(c.clues, c.id, assignment, grid))

      if (ok) {
        usedCells.add(cellId)
        backtrack(index + 1, assignment, usedCells)
        usedCells.delete(cellId)
      }

      delete assignment[character.id]
      if (solutions.length >= limit) return
    }
  }

  backtrack(0, {}, new Set())
  return solutions
}
