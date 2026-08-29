import type { Assignment, Puzzle } from '../model/types'
import { propagate } from '../possibility/propagate'
import { analyzeDifficulty, type PuzzleDifficulty } from '../proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../solve/solver'

export type RejectionReason =
  /** Propagation alone can't finish it: the player would have to guess (§36). */
  | 'not-solvable-by-propagation'
  /** Propagation lands somewhere else than the solution the clues were written from. */
  | 'wrong-solution'
  /** No step the proof depends on — every clue resolves on its own, the V1 defect. */
  | 'flat'
  /** A second placement satisfies the same clues. */
  | 'not-unique'
  /** The victim's zone holds zero or several other people, so no one is named (§15). */
  | 'no-murderer'

export type VerificationResult =
  | { ok: true; difficulty: PuzzleDifficulty; murdererId: string }
  | { ok: false; reason: RejectionReason }

/**
 * The §39 gate, in one place: a puzzle is never accepted merely because a
 * solution exists. Validity (the clues hold), logical solvability (propagation
 * finishes without a guess), uniqueness (checked by full search, independently
 * of propagation), non-flatness, and a derivable culprit must all hold at once.
 *
 * Non-flatness is measured with `articulationCount`, not `keystones.length`:
 * a puzzle where every person resolves alone still produces keystones — the
 * seed-time naked singles are trivially load-bearing for themselves — but no
 * articulation point, i.e. no step that drags other steps down with it.
 */
export function verifyGenerated(puzzle: Puzzle, expected: Assignment): VerificationResult {
  const propagation = propagate(puzzle)
  if (propagation.status !== 'solved') return { ok: false, reason: 'not-solvable-by-propagation' }

  for (const person of puzzle.people) {
    if (propagation.placements[person.id] !== expected[person.id]) return { ok: false, reason: 'wrong-solution' }
  }

  const solutions = solvePuzzle(puzzle, { limit: 2 })
  if (solutions.length !== 1) return { ok: false, reason: 'not-unique' }

  const difficulty = analyzeDifficulty(puzzle)
  if (difficulty.articulationCount === 0) return { ok: false, reason: 'flat' }

  const murdererId = deriveMurderer(puzzle, expected)
  if (!murdererId) return { ok: false, reason: 'no-murderer' }

  return { ok: true, difficulty, murdererId }
}
