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
  /** No step the proof depends on — every clue resolves on its own. */
  | 'flat'
  /** A second placement satisfies the same clues. */
  | 'not-unique'
  /** The body's cell falls out mid-proof instead of closing it (§14). */
  | 'victim-not-last'
  /** The victim's volume holds zero or several other people, so no one is named (§15). */
  | 'no-murderer'
  /** Two witnesses state the same relation about each other — one fact, read twice. */
  | 'mirrored-testimony'

export type VerificationResult =
  | { ok: true; difficulty: PuzzleDifficulty; murdererId: string }
  | { ok: false; reason: RejectionReason }

export interface VerifyOptions {
  /**
   * Off for the intermediate acts. A case is only obliged to name a culprit once
   * the building has been fully explored — the whole point of the discovery
   * mechanic is that the verdict is not yet computable before then, and an act
   * that already named someone would have nothing left to reveal.
   */
  requireMurderer?: boolean
  /** Off while checking an act: only the finished dossier has to close on the body. */
  requireVictimLast?: boolean
}

/**
 * The §39 gate, in one place: a puzzle is never accepted merely because a
 * solution exists. Validity, logical solvability (propagation finishes without a
 * guess), uniqueness (checked by independent search), non-flatness, and — for
 * the finished case — a derivable culprit must all hold at once.
 */
export function verifyGenerated(puzzle: Puzzle, expected: Assignment, options: VerifyOptions = {}): VerificationResult {
  const mirrored = findMirroredTestimony(puzzle)
  if (mirrored) return { ok: false, reason: 'mirrored-testimony' }

  const propagation = propagate(puzzle)
  if (propagation.status !== 'solved') return { ok: false, reason: 'not-solvable-by-propagation' }

  for (const person of puzzle.people) {
    if (propagation.placements[person.id] !== expected[person.id]) return { ok: false, reason: 'wrong-solution' }
  }

  if ((options.requireVictimLast ?? true) && !victimResolvesLast(propagation.journal, puzzle.victimId)) {
    return { ok: false, reason: 'victim-not-last' }
  }

  const solutions = solvePuzzle(puzzle, { limit: 2 })
  if (solutions.length !== 1) return { ok: false, reason: 'not-unique' }

  const difficulty = analyzeDifficulty(puzzle)
  if (difficulty.articulationCount === 0) return { ok: false, reason: 'flat' }

  const murdererId = deriveMurderer(puzzle, expected)
  if (!murdererId && (options.requireMurderer ?? true)) return { ok: false, reason: 'no-murderer' }

  return { ok: true, difficulty, murdererId: murdererId ?? '' }
}

/**
 * §14 as a property of the proof rather than of the data: the body's cell is the
 * last thing the journal pins, so learning *whose volume it lay in* is the
 * closing move. In V3 that closing move is worth more than it was, because the
 * volume is not a room — it can be two rooms and two levels.
 */
export function victimResolvesLast(journal: DeductionStep[], victimId: string): boolean {
  const placed = journal.filter((step) => step.placed)
  return placed.length > 0 && placed[placed.length - 1].personId === victimId
}
