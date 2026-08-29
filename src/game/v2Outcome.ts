import type { PlayerNotebook } from '../core/hints/notebook'
import type { Assignment, Puzzle } from '../core/model/types'

export interface GridOutcome {
  total: number
  placed: number
  correct: number
  /** Placed on a cell the solution does not give them. */
  misplaced: string[]
  /** Not placed anywhere yet. */
  missing: string[]
  /** Everyone is somewhere — the grid can be submitted. */
  complete: boolean
  /** Everyone is on their own cell — the case is closed. */
  solved: boolean
}

/**
 * Confronts the player's grid with the one true solution. Deliberately checks
 * *cells*, not zones: two people in the right room but on each other's cells is
 * two wrong answers, because every V2 clue is positional.
 *
 * The victim counts like anyone else — V2 places them by deduction too, so a
 * grid that has everyone but the victim right is not a solved case.
 */
export function evaluateGrid(puzzle: Puzzle, notebook: PlayerNotebook, solution: Assignment): GridOutcome {
  const misplaced: string[] = []
  const missing: string[] = []
  let correct = 0

  for (const person of puzzle.people) {
    const guess = notebook.placements[person.id]
    if (guess === undefined) missing.push(person.id)
    else if (guess === solution[person.id]) correct += 1
    else misplaced.push(person.id)
  }

  const total = puzzle.people.length
  return {
    total,
    placed: total - missing.length,
    correct,
    misplaced,
    missing,
    complete: missing.length === 0,
    solved: correct === total,
  }
}
