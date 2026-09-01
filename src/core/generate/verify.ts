import { findMirroredTestimony } from '../constraints/relations'
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
  /** Two witnesses state the same relation about each other — one fact, read twice. */
  | 'mirrored-testimony'

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
 *
 * `findMirroredTestimony` is the one criterion here that is about *reading*
 * rather than about logic, and it has to live in the gate precisely because the
 * logic cannot catch it: propagation only narrows the domain of the person a
 * clue is written on, so a relation stated from both sides is load-bearing on
 * both sides and survives pruning intact. Measured over 200 seeds per shell
 * before this check existed, 13% to 35% of accepted candidates carried such a
 * pair — a player reading two cards to learn one fact, which is exactly the
 * "pile of clues" §4 exists to prevent.
 */
export function verifyGenerated(puzzle: Puzzle, expected: Assignment): VerificationResult {
  const mirrored = findMirroredTestimony(puzzle)
  if (mirrored) return { ok: false, reason: 'mirrored-testimony' }

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
