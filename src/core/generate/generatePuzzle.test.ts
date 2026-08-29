import { describe, expect, it } from 'vitest'
import { cormoranDef } from '../../data/v2/premier-cas'
import { staticDomain } from '../constraints/domain'
import type { Constraint } from '../constraints/types'
import { loadPuzzle } from '../model/loadPuzzle'
import type { PuzzleDef } from '../model/types'
import { propagate } from '../possibility/propagate'
import { analyzeDifficulty } from '../proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../solve/solver'
import { generatePuzzle, type GenerationSuccess } from './generatePuzzle'
import { makeRandom } from './random'
import { shellFromDef } from './shell'

/**
 * The real test: the Cormoran's own scene — same plan, same furniture, same five
 * people — stripped of every hand-written clue, handed back to the generator.
 */
const shell = shellFromDef(cormoranDef)
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const runs = SEEDS.map((seed) => ({ seed, result: generatePuzzle(shell, { seed }) }))

describe('generatePuzzle — the shell of Le Cormoran, clues stripped', () => {
  it('keeps the scene untouched: only the cast dossier is generated', () => {
    expect(shell.peopleIds.sort()).toEqual(['armand', 'helene', 'oscar', 'pascal', 'victoire'])
    expect(shell.victimId).toBe('armand')
    expect(shell.plan).toBe(cormoranDef.plan)
    expect(shell.objects).toEqual(cormoranDef.objects)
    expect(Object.keys(shell)).not.toContain('people')
  })

  it('succeeds on every seed tried', () => {
    const failures = runs.filter((r) => !r.result.ok)
    expect(failures.map((f) => `seed ${f.seed}: ${(f.result as { reason: string }).reason}`)).toEqual([])
  })

  it('is reproducible: the same seed yields the same case, byte for byte', () => {
    expect(generatePuzzle(shell, { seed: 4 })).toEqual(generatePuzzle(shell, { seed: 4 }))
    expect(generatePuzzle(shell, { random: makeRandom(4) })).toEqual(generatePuzzle(shell, { seed: 4 }))
  })

  it('does not just replay one canonical case across seeds', () => {
    const distinct = new Set(runs.filter((r) => r.result.ok).map((r) => JSON.stringify((r.result as GenerationSuccess).def.people)))
    expect(distinct.size).toBeGreaterThan(SEEDS.length - 3)
  })
})

describe('generatePuzzle — nothing is accepted just because a solution exists (§39)', () => {
  const successes = runs.filter((r) => r.result.ok).map((r) => ({ seed: r.seed, result: r.result as GenerationSuccess }))

  it.each(successes)('seed $seed loads and validates like a hand-authored case', ({ result }) => {
    // Re-loaded from the emitted def, not reused from the generator's own puzzle:
    // whatever it hands over has to survive validateModel on its own.
    expect(() => loadPuzzle(result.def)).not.toThrow()
  })

  it.each(successes)('seed $seed is solved by propagation alone, on the intended solution', ({ result }) => {
    const propagation = propagate(loadPuzzle(result.def))
    expect(propagation.status).toBe('solved')
    expect(propagation.placements).toEqual(result.solution)
  })

  it.each(successes)('seed $seed has exactly one solution, checked by full search', ({ result }) => {
    const solutions = solvePuzzle(loadPuzzle(result.def), { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual(result.solution)
  })

  it.each(successes)('seed $seed names a culprit', ({ result }) => {
    const puzzle = loadPuzzle(result.def)
    expect(deriveMurderer(puzzle, result.solution)).toBe(result.murdererId)
    expect(result.murdererId).not.toBe(shell.victimId)
  })

  it.each(successes)('seed $seed is a chain, not a pile: articulationCount > 0', ({ result }) => {
    const report = analyzeDifficulty(loadPuzzle(result.def))
    // articulationCount, never keystones.length: a flat puzzle still has
    // keystones (its seed-time singles) but no step that drags others down.
    expect(report.articulationCount).toBeGreaterThan(0)
    expect(report.maxCascade).toBeGreaterThan(1)
    expect(report).toEqual(result.difficulty)
  })

  it.each(successes)('seed $seed hands nobody their own cell outright', ({ result }) => {
    const puzzle = loadPuzzle(result.def)
    for (const person of puzzle.people) {
      expect(staticDomain(person.constraints, puzzle.board).length, `${person.id} is self-pinned`).toBeGreaterThan(1)
    }
  })

  it.each(successes)('seed $seed gives every suspect at least one clue', ({ result }) => {
    for (const person of result.def.people) expect(person.constraints.length).toBeGreaterThan(0)
  })
})

describe('generatePuzzle — measured difficulty across seeds (calibration data)', () => {
  const successes = runs.filter((r) => r.result.ok).map((r) => r.result as GenerationSuccess)

  it('reports the spread rather than targeting a category', () => {
    const rows = successes.map((r) => ({
      clues: r.clueCount,
      score: r.difficulty.score,
      category: r.difficulty.category,
      tier: r.difficulty.tier,
      maxChainDepth: r.difficulty.maxChainDepth,
      articulations: r.difficulty.articulationCount,
      steps: r.difficulty.deductionCount,
    }))
    console.table(rows)

    // No threshold is asserted on score/category: scoreOf and categoryOf are
    // themselves awaiting recalibration, and this table is the input for it.
    expect(rows).toHaveLength(successes.length)
    for (const row of rows) expect(row.score).toBeGreaterThan(0)
  })

  it('produces a clue set no larger than the hand-written one', () => {
    const handWritten = cormoranDef.people.reduce((n, p) => n + p.constraints.length, 0)
    for (const r of successes) expect(r.clueCount).toBeLessThanOrEqual(handWritten)
  })
})

/**
 * One wide sweep, shared by the two blocks below — running the generator twice
 * over the same seeds would double the suite's cost for nothing.
 */
const WIDE = Array.from({ length: 60 }, (_, i) => i + 1)
const wideRuns = WIDE.map((seed) => generatePuzzle(shell, { seed })).filter((r): r is GenerationSuccess => r.ok)

/** Strikes one clue out of a generated case, leaving everything else in place. */
function without(result: GenerationSuccess, personId: string, constraint: Constraint): PuzzleDef {
  return {
    ...result.def,
    people: result.def.people.map((p) => (p.id === personId ? { ...p, constraints: p.constraints.filter((c) => c !== constraint) } : p)),
  }
}

describe('generatePuzzle — "I was alone in there" is now a clue the generator can keep', () => {
  // Before zone-occupancy propagation this block could not exist: `alone` and
  // `notAlone` never advanced propagate(), so the prune pass dropped every one of
  // them and no generated case ever used the word.

  const zoneClues = wideRuns.flatMap((result) =>
    result.def.people.flatMap((person) =>
      person.constraints
        .filter((c) => c.type === 'alone' || c.type === 'notAlone')
        .map((constraint) => ({ result, personId: person.id, constraint })),
    ),
  )

  it('produces cases whose minimal clue set contains alone or notAlone', () => {
    expect(wideRuns.length).toBeGreaterThan(WIDE.length / 2)
    expect(zoneClues.length).toBeGreaterThan(0)
    expect(new Set(zoneClues.map((z) => z.constraint.type)).size).toBeGreaterThan(0)
  })

  it.each(zoneClues.map((z, index) => ({ index, ...z })))(
    'zone clue #$index ($personId $constraint.type) is load-bearing: strike it and the grid no longer closes',
    ({ result, personId, constraint }) => {
      expect(propagate(loadPuzzle(without(result, personId, constraint))).status).not.toBe('solved')
    },
  )
})

/**
 * The same milestone, one family later: until denied relations were propagated,
 * `not(withPerson)`, `not(direction)` and `not(distance)` could be *enumerated*
 * and even drawn during growth, but never survived pruning — they never advanced
 * propagate(), so striking them cost the proof nothing. Measured over these very
 * 60 seeds, that count was 0; it is not any more.
 */
describe('generatePuzzle — "I was not with her" is a clue the generator can keep too', () => {
  const RELATIONAL = new Set(['withPerson', 'direction', 'distance'])

  const denials = wideRuns.flatMap((result) =>
    result.def.people.flatMap((person) =>
      person.constraints
        .filter((c) => c.type === 'not' && RELATIONAL.has(c.of.type))
        .map((constraint) => ({ result, personId: person.id, constraint, inner: (constraint as { of: Constraint }).of.type })),
    ),
  )

  it('produces cases whose minimal clue set contains a denied relation', () => {
    expect(wideRuns.length).toBeGreaterThan(WIDE.length / 2)
    expect(denials.length).toBeGreaterThan(0)
  })

  it.each(denials.map((d, index) => ({ index, ...d })))(
    'denied relation #$index ($personId not($inner)) is load-bearing: strike it and the grid no longer closes',
    ({ result, personId, constraint }) => {
      expect(propagate(loadPuzzle(without(result, personId, constraint))).status).not.toBe('solved')
    },
  )

  it('proves the denial is what closes the grid, by the technique that reads it', () => {
    // Not merely "a clue that happens to be a `not`": at least one of these cases
    // must show relationalExclusion actually firing in the journal it produces.
    const usingTechnique = denials.filter(({ result }) =>
      propagate(loadPuzzle(result.def)).journal.some((s) => s.technique === 'relationalExclusion'),
    )
    expect(usingTechnique.length).toBe(denials.length)
  })
})

describe('generatePuzzle — failure is reported, never thrown or faked', () => {
  it('gives up cleanly and says why when the clue budget is too small to ever solve', () => {
    const result = generatePuzzle(shell, { seed: 3, attempts: 10, clueSearchesPerSolution: 1, maxClues: 1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.rejections['clue-budget-exhausted']).toBeGreaterThan(0)
    expect(result.attempts).toBe(10)
    expect(Object.keys(result.rejections)).toContain(result.reason)
  })

  it('reports the self-pin gate as its own rejection reason, not a silent retry', () => {
    // maxSelfPinned: -1 can never be satisfied, so every clue search is rejected there.
    const result = generatePuzzle(shell, { seed: 5, attempts: 10, clueSearchesPerSolution: 1, maxSelfPinned: -1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.rejections['too-many-self-pinned']).toBeGreaterThan(0)
  })

  it('counts a solution that names nobody as its own rejection, before any clue work', () => {
    // A placement leaving the victim's zone empty or crowded is discarded up
    // front (§15) — it shows up in the tally rather than being silently retried.
    const result = generatePuzzle(shell, { seed: 3, attempts: 10, clueSearchesPerSolution: 1, maxClues: 1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.rejections['no-murderer']).toBeGreaterThan(0)
  })
})
