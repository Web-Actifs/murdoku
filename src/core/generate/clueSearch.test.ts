import { describe, expect, it } from 'vitest'
import { cormoranDef } from '../../data/v2/premier-cas'
import type { Constraint } from '../constraints/types'
import type { Assignment } from '../model/types'
import { propagate } from '../possibility/propagate'
import { searchClues } from './clueSearch'
import { enumerateFacts } from './facts'
import { makeRandom, type Random } from './random'
import { loadShell, puzzleWithClues, shellFromDef } from './shell'
import { generateSolution } from './solution'
import { deriveMurderer } from '../solve/solver'

const shell = shellFromDef(cormoranDef)
const base = loadShell(shell)

/** A solution that names a culprit, drawn the same way generatePuzzle draws one. */
function usableSolution(random: Random): Assignment {
  for (let tries = 0; tries < 200; tries++) {
    const solution = generateSolution(base.board, shell.peopleIds, random)
    if (solution && deriveMurderer(base, solution)) return solution
  }
  throw new Error('no solution naming a culprit in 200 draws')
}

function run(seed: number) {
  const random = makeRandom(seed)
  const solution = usableSolution(random)
  const found = searchClues(base, solution, enumerateFacts(base.board, base.people, solution), random)
  return { solution, found }
}

/**
 * Sampled over 320 seeds rather than a handful. Since the §14 gate joined
 * verifyGenerated a single search succeeds about 8% of the time on this shell
 * (measured 38/500): victim-last holds for roughly a third of the puzzles that
 * are otherwise sound, so the rejection sampler simply has to run more often.
 * generatePuzzle absorbs that in ~8 attempts per case; this file needs the wider
 * sweep to observe enough successes to assert anything about them.
 */
const runs = Array.from({ length: 320 }, (_, i) => ({ seed: i + 1, ...run(i + 1) }))
const solved = runs.filter((r) => r.found.ok)

describe('searchClues — grow until solved, then prune to a minimal set', () => {
  it('succeeds often enough for the retry loop above it to be cheap, and names its rejections', () => {
    // A single search is *allowed* to fail: the quality gates (self-pin, flatness,
    // victim-last) are rejection samplers, and retrying is generatePuzzle's job,
    // not this function's. What matters here is that failures are named, never silent.
    expect(solved.length).toBeGreaterThanOrEqual(runs.length / 20)
    for (const { found } of runs) {
      if (found.ok) continue
      expect(['clue-budget-exhausted', 'too-many-self-pinned', 'flat', 'not-unique', 'victim-not-last']).toContain(found.reason)
    }
  })

  it('rejects a puzzle whose body falls out mid-proof, and says so (§14)', () => {
    const rejected = runs.filter((r) => !r.found.ok && r.found.reason === 'victim-not-last')
    expect(rejected.length).toBeGreaterThan(0)
  })

  it('never accepts one: every surviving clue set closes on the victim (§14)', () => {
    for (const { found } of solved) {
      if (!found.ok) continue
      const journal = propagate(puzzleWithClues(base, found.clues)).journal
      const placed = journal.filter((s) => s.placed)
      expect(placed[placed.length - 1].personId).toBe(base.victimId)
    }
  })

  it('only ever emits clues drawn from the pool of facts true of that solution', () => {
    for (const { solution, found } of solved) {
      if (!found.ok) continue
      const pool = enumerateFacts(base.board, base.people, solution)
      for (const [personId, clues] of found.clues) {
        const truths = new Set(pool.get(personId)!.map((c) => JSON.stringify(c)))
        for (const clue of clues) expect(truths.has(JSON.stringify(clue)), `${personId}: ${JSON.stringify(clue)}`).toBe(true)
      }
    }
  })

  it('is minimal: strike any single clue and propagation no longer finishes the grid', () => {
    // This is the whole point of the prune pass. Anything that survives it has
    // to be load-bearing — a redundant clue would let the player reach the
    // answer by a second, independent route, which is exactly the flatness V2 exists to avoid.
    for (const { seed, solution, found } of solved) {
      if (!found.ok) continue

      for (const [personId, clues] of found.clues) {
        for (const clue of clues) {
          const weakened = new Map<string, Constraint[]>(
            [...found.clues].map(([id, list]) => [id, id === personId ? list.filter((c) => c !== clue) : list]),
          )
          const result = propagate(puzzleWithClues(base, weakened))
          const stillSolved =
            result.status === 'solved' && base.people.every((p) => result.placements[p.id] === solution[p.id])

          expect(stillSolved, `seed ${seed}: ${personId} does not need ${JSON.stringify(clue)}`).toBe(false)
        }
      }
    }
  })

  it('keeps alone/notAlone now that propagation reads them, and only when they carry weight', () => {
    // Until zone-occupancy propagation existed these were always pruned back out:
    // the pool offered them, the search declined, and no generated case could ever
    // say "j'étais seul en cuisine". They survive the prune pass now — and the
    // minimality test above already proves anything that survives is load-bearing.
    const kept = solved.flatMap(({ found }) =>
      found.ok ? [...found.clues.values()].flat().filter((c) => c.type === 'alone' || c.type === 'notAlone') : [],
    )
    expect(kept.length).toBeGreaterThan(0)
    // No `zoneId` is ever proposed by facts.ts, so what survives always speaks
    // about wherever the witness actually ended up.
    for (const clue of kept) expect(Object.keys(clue)).toEqual(['type'])
  })

  it('spreads the clues across the cast instead of over-briefing one suspect', () => {
    for (const { found } of solved) {
      if (!found.ok) continue
      const counts = [...found.clues.values()].map((c) => c.length)
      expect(Math.min(...counts)).toBeGreaterThan(0)
      // Four is the hand-written Cormoran's own ceiling (Oscar carries four), and
      // it takes a denial to get there: those cut less on their own, so a witness
      // whose dossier leans on one occasionally needs a fourth line to close.
      expect(Math.max(...counts)).toBeLessThanOrEqual(4)
    }
  })

  it('gives up rather than looping when the clue budget cannot reach a solution', () => {
    const random = makeRandom(11)
    const solution = usableSolution(random)
    const found = searchClues(base, solution, enumerateFacts(base.board, base.people, solution), random, { maxClues: 1 })
    expect(found.ok).toBe(false)
    if (found.ok) return
    expect(found.reason).toBe('clue-budget-exhausted')
  })
})
