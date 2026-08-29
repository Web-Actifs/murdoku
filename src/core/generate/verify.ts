import type { Assignment, Puzzle } from '../model/types'
import type { DeductionStep } from '../possibility/journal'
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
  /** The body's cell falls out mid-proof instead of closing it (§14). */
  | 'victim-not-last'
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
 *
 * `victimResolvesLast` is the §14 rule made checkable: the reveal only means
 * anything once the body's zone is the last thing learned, so a candidate where
 * propagation pins the victim mid-proof is rejected outright, however sound it
 * otherwise is.
 */
export function verifyGenerated(puzzle: Puzzle, expected: Assignment): VerificationResult {
  const propagation = propagate(puzzle)
  if (propagation.status !== 'solved') return { ok: false, reason: 'not-solvable-by-propagation' }

  for (const person of puzzle.people) {
    if (propagation.placements[person.id] !== expected[person.id]) return { ok: false, reason: 'wrong-solution' }
  }

  if (!victimResolvesLast(propagation.journal, puzzle.victimId)) return { ok: false, reason: 'victim-not-last' }

  const solutions = solvePuzzle(puzzle, { limit: 2 })
  if (solutions.length !== 1) return { ok: false, reason: 'not-unique' }

  const difficulty = analyzeDifficulty(puzzle)
  if (difficulty.articulationCount === 0) return { ok: false, reason: 'flat' }

  const murdererId = deriveMurderer(puzzle, expected)
  if (!murdererId) return { ok: false, reason: 'no-murderer' }

  return { ok: true, difficulty, murdererId }
}

/**
 * §14, stated as a property of the proof rather than of the data: "la victime
 * occupe la dernière case disponible" is not a placement rule the solver could
 * apply — the body is bound by exactly the same row/column rule as everyone else
 * — it is an ordering rule on how the puzzle comes apart. So what has to hold is
 * that the last cell the journal pins is the victim's: every living person is
 * resolved first, and learning *whose zone the body was in* is the closing move,
 * which is what makes the reveal land at the end rather than mid-solve.
 */
export function victimResolvesLast(journal: DeductionStep[], victimId: string): boolean {
  const placed = journal.filter((step) => step.placed)
  return placed.length > 0 && placed[placed.length - 1].personId === victimId
}
