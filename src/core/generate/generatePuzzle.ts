import { loadPuzzle } from '../model/loadPuzzle'
import type { Assignment, Puzzle, PuzzleDef } from '../model/types'
import type { PuzzleDifficulty } from '../proof/difficulty'
import { deriveMurderer } from '../solve/solver'
import { searchClues, type ClueSearchResult } from './clueSearch'
import { enumerateFacts } from './facts'
import { makeRandom, type Random } from './random'
import { loadShell, shellToDef, type GeneratorShell } from './shell'
import { generateSolution } from './solution'

export interface GenerateOptions {
  /** Ignored when `random` is given; otherwise seeds a reproducible PRNG. */
  seed?: number
  random?: Random
  /** Whole attempts — a fresh solution each time — before giving up. */
  attempts?: number
  /** Independent clue searches run against each generated solution. */
  clueSearchesPerSolution?: number
  maxClues?: number
  /** See ClueSearchOptions — how many people may be pinned by their own clues alone. */
  maxSelfPinned?: number
}

export type GenerationFailureReason =
  | 'no-valid-placement'
  | 'no-murderer'
  | 'clue-budget-exhausted'
  | 'too-many-self-pinned'
  | 'flat'
  | 'not-unique'
  | 'not-solvable-by-propagation'
  | 'wrong-solution'

export interface GenerationSuccess {
  ok: true
  def: PuzzleDef
  puzzle: Puzzle
  solution: Assignment
  murdererId: string
  /**
   * Measured, never targeted: `scoreOf`/`categoryOf` are still awaiting
   * recalibration, so this is reported as raw calibration data rather than used
   * as an acceptance criterion.
   */
  difficulty: PuzzleDifficulty
  clueCount: number
  attempts: number
}

export interface GenerationFailure {
  ok: false
  reason: GenerationFailureReason
  /** How many times each rejection fired, so a failure can be explained rather than just announced. */
  rejections: Record<string, number>
  attempts: number
}

export type GenerationResult = GenerationSuccess | GenerationFailure

/**
 * Solution first, clues second, then the §39 gate. Nothing is accepted merely
 * because a solution exists: every candidate must be solvable by propagation
 * alone, uniquely solvable by independent search, non-flat, and must name a
 * culprit — otherwise the attempt is thrown away and another one is drawn.
 */
export function generatePuzzle(shell: GeneratorShell, options: GenerateOptions = {}): GenerationResult {
  const random = options.random ?? makeRandom(options.seed ?? 1)
  const attempts = options.attempts ?? 40
  const clueSearches = options.clueSearchesPerSolution ?? 3

  const base = loadShell(shell)
  const rejections: Record<string, number> = {}
  const reject = (reason: string) => {
    rejections[reason] = (rejections[reason] ?? 0) + 1
  }

  let attempt = 0
  while (attempt < attempts) {
    attempt++

    const solution = generateSolution(base.board, shell.peopleIds, random)
    if (!solution) {
      reject('no-valid-placement')
      continue
    }

    // The culprit depends on the placement alone, so a solution that names no one
    // is discarded before any clue work is done on it.
    if (!deriveMurderer(base, solution)) {
      reject('no-murderer')
      continue
    }

    const pool = enumerateFacts(base.board, base.people, solution)

    for (let round = 0; round < clueSearches; round++) {
      const found: ClueSearchResult = searchClues(base, solution, pool, random, {
        maxClues: options.maxClues,
        maxSelfPinned: options.maxSelfPinned,
      })

      if (!found.ok) {
        reject(found.reason)
        continue
      }

      // Final round-trip: the generated def has to load and validate exactly like
      // a hand-authored one, and the verdict must hold on that loaded puzzle.
      const def = shellToDef(shell, found.clues)
      const puzzle = loadPuzzle(def)

      return {
        ok: true,
        def,
        puzzle,
        solution,
        murdererId: found.murdererId,
        difficulty: found.difficulty,
        clueCount: found.clueCount,
        attempts: attempt,
      }
    }
  }

  return { ok: false, reason: dominantReason(rejections), rejections, attempts: attempt }
}

function dominantReason(rejections: Record<string, number>): GenerationFailureReason {
  const ranked = Object.entries(rejections).sort((a, b) => b[1] - a[1])
  return (ranked[0]?.[0] as GenerationFailureReason) ?? 'clue-budget-exhausted'
}
