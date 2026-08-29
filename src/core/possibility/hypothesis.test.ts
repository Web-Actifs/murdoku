import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import type { PuzzleDef } from '../model/types'
import { cascadeDef } from '../testing/fixtures'
import { hypothesize, surveyAlternatives } from './hypothesis'
import { propagate } from './propagate'

/** Two people, no clues, on a 2x2 — every cell is live, nothing propagates on its own. */
const openPairDef: PuzzleDef = {
  id: 'openPair',
  plan: `
    AA
    AA
  `,
  legend: { A: 'salle' },
  zones: [{ id: 'salle', nameKey: 'salle' }],
  objects: [],
  people: [
    { id: 'a', nameKey: 'a', constraints: [] },
    { id: 'b', nameKey: 'b', constraints: [] },
  ],
  victimId: 'a',
}

/** Same, on a 3x3: an assumption pins nobody else, so propagation stalls. */
const stallDef: PuzzleDef = { ...openPairDef, id: 'stall', plan: `
    AAA
    AAA
    AAA
  ` }

describe('hypothesize — a refuted assumption comes with its demonstration', () => {
  const puzzle = loadPuzzle(cascadeDef)

  it('refutes austin at 0:0 and returns a non-empty refutation chain', () => {
    const result = hypothesize(puzzle, 'austin', '0:0')

    expect(result.verdict).toBe('refuted')
    expect(result.proved).toBe(true)
    expect(result.refutation).toBeDefined()
    expect(result.refutation!.origin).toBe('chain')
    expect(result.refutation!.chain.length).toBeGreaterThan(0)
    // brycen is the one left with nowhere to stand: austin on 0:0 eats row 0 whole.
    expect(result.refutation!.personId).toBe('brycen')
    expect(result.run.status).toBe('contradiction')
  })

  it('grounds the chain in the assumption and ends on the emptied domain', () => {
    const { refutation } = hypothesize(puzzle, 'austin', '0:0')
    const chain = refutation!.chain

    expect(refutation!.dependsOnAssumption).toBe(true)
    expect(refutation!.assumptionStepId).toBeDefined()
    expect(chain[0].id).toBe(refutation!.assumptionStepId)
    expect(chain[0].placed).toBe('0:0')
    expect(chain[chain.length - 1].id).toBe(refutation!.terminalStepId)
    expect(chain[chain.length - 1].after).toEqual([])
  })

  it('is self-contained: every premise of a chain step is met earlier in the same chain', () => {
    const { refutation } = hypothesize(puzzle, 'austin', '0:0')
    const seen = new Set<string>()

    for (const step of refutation!.chain) {
      for (const premise of step.premises) {
        expect(seen.has(premise)).toBe(true)
      }
      seen.add(step.id)
    }
  })

  it('scores how convoluted the reductio is', () => {
    const { refutation } = hypothesize(puzzle, 'austin', '0:0')

    expect(refutation!.length).toBe(refutation!.chain.length)
    expect(refutation!.depth).toBeGreaterThanOrEqual(1)
    expect(refutation!.strength).toBe('immediate')
    expect(refutation!.peopleInvolved).toEqual(['austin', 'brycen'])
  })

  it('refutes a cell the person’s own clues never allowed, without inventing a chain', () => {
    const result = hypothesize(puzzle, 'austin', '2:2')

    expect(result.verdict).toBe('refuted')
    expect(result.proved).toBe(true)
    expect(result.novelty).toBe('offBoard')
    expect(result.refutation!.origin).toBe('ownClues')
    expect(result.refutation!.chain).toEqual([])
  })
})

describe('hypothesize — honest when nothing contradicts', () => {
  it('says "completes", never "confirmed", when the grid falls into place', () => {
    const result = hypothesize(loadPuzzle(openPairDef), 'a', '0:0')

    expect(result.verdict).toBe('completes')
    expect(result.proved).toBe(false)
    expect(result.refutation).toBeUndefined()
    expect(result.entailed).toEqual({ a: '0:0', b: '1:1' })
  })

  it('proves that "completes" is not a proof: a rival assumption completes just as well', () => {
    const puzzle = loadPuzzle(openPairDef)
    const here = hypothesize(puzzle, 'a', '0:0')
    const there = hypothesize(puzzle, 'a', '0:1')

    expect(here.verdict).toBe('completes')
    expect(there.verdict).toBe('completes')
    expect(here.proved).toBe(false)
    expect(there.proved).toBe(false)
  })

  it('says "open" when propagation stalls under the assumption', () => {
    const result = hypothesize(loadPuzzle(stallDef), 'a', '0:0')

    expect(result.verdict).toBe('open')
    expect(result.proved).toBe(false)
    expect(result.refutation).toBeUndefined()
    // 'a' is pinned by the assumption itself; 'b' still has four cells to choose from.
    expect(result.entailed).toEqual({ a: '0:0' })
    expect(result.run.candidates.get('b')!.size).toBe(4)
  })
})

describe('hypothesize — catches what the propagator itself never checks', () => {
  /** The whole board is one zone, so `a` can never be alone in it while `b` exists. */
  const crowdedDef: PuzzleDef = {
    ...openPairDef,
    id: 'crowded',
    people: [
      { id: 'a', nameKey: 'a', constraints: [{ type: 'alone' }] },
      { id: 'b', nameKey: 'b', constraints: [] },
    ],
  }

  it('refutes a crowded `alone` with a real chain, now that propagation reads it', () => {
    const result = hypothesize(loadPuzzle(crowdedDef), 'a', '0:0')

    expect(result.verdict).toBe('refuted')
    expect(result.proved).toBe(true)
    // This used to be a bare 'finalCheck' with nothing to show: `alone` is now
    // propagated, so the refutation comes with the deduction that killed it.
    expect(result.refutation!.origin).toBe('chain')
    // 'a' is the one who runs out of room: the cell they were assumed onto is the
    // very cell `alone` forbids while 'b' is stuck in the same (only) zone.
    expect(result.refutation!.personId).toBe('a')
    expect(result.refutation!.dependsOnAssumption).toBe(true)
    expect(result.refutation!.chain.some((s) => s.technique === 'zoneExclusivity')).toBe(true)
    expect(result.entailed).toEqual({})
  })

  /** A negated relation on a board that is one single room: `a` can never be apart from `b`. */
  const apartDef: PuzzleDef = {
    ...openPairDef,
    id: 'apart',
    people: [
      { id: 'a', nameKey: 'a', constraints: [{ type: 'not', of: { type: 'withPerson', other: 'b' } }] },
      { id: 'b', nameKey: 'b', constraints: [] },
    ],
  }

  it('refutes a denied relation with a real chain, now that propagation reads it too', () => {
    const result = hypothesize(loadPuzzle(apartDef), 'a', '0:0')

    expect(result.verdict).toBe('refuted')
    expect(result.proved).toBe(true)
    // This used to be a bare 'finalCheck' with nothing to show, for exactly the
    // same reason `alone` used to be: nothing propagated the denial.
    expect(result.refutation!.origin).toBe('chain')
    expect(result.refutation!.chain.some((s) => s.technique === 'relationalExclusion')).toBe(true)
    expect(result.entailed).toEqual({})
  })

  /** The last family propagation cannot see: a denied zone-occupancy clue. */
  const notCrowdedDef: PuzzleDef = {
    ...openPairDef,
    id: 'notCrowded',
    people: [
      // "It is not true that I had company" — on a one-room board with `b` about, it never holds.
      { id: 'a', nameKey: 'a', constraints: [{ type: 'not', of: { type: 'notAlone' } }] },
      { id: 'b', nameKey: 'b', constraints: [] },
    ],
  }

  it('still refutes an assumption whose only completion fails full validation', () => {
    const result = hypothesize(loadPuzzle(notCrowdedDef), 'a', '0:0')

    expect(result.verdict).toBe('refuted')
    expect(result.proved).toBe(true)
    expect(result.refutation!.origin).toBe('finalCheck')
    expect(result.refutation!.chain).toEqual([])
    expect(result.entailed).toEqual({})
  })
})

describe('hypothesize — refuses to take credit for a broken puzzle', () => {
  /** Two people forced onto the same single cell: this contradicts with or without any assumption. */
  const brokenDef: PuzzleDef = {
    id: 'broken',
    plan: `
      AAA
      AAA
      AAA
    `,
    legend: { A: 'salle' },
    zones: [{ id: 'salle', nameKey: 'salle' }],
    objects: [{ id: 'chair', type: 'chair', occupiable: true, cells: [{ row: 0, col: 0 }] }],
    people: [
      { id: 'a', nameKey: 'a', constraints: [{ type: 'onObjectType', objectType: 'chair' }] },
      { id: 'b', nameKey: 'b', constraints: [{ type: 'onObjectType', objectType: 'chair' }] },
      { id: 'c', nameKey: 'c', constraints: [] },
    ],
    victimId: 'a',
  }

  it('reports "unsound" when the contradiction never rested on the assumption', () => {
    const result = hypothesize(loadPuzzle(brokenDef), 'c', '2:2')

    expect(result.run.status).toBe('contradiction')
    expect(result.verdict).toBe('unsound')
    expect(result.proved).toBe(false)
    expect(result.refutation!.dependsOnAssumption).toBe(false)
    expect(result.refutation!.chain.some((s) => s.personId === 'c')).toBe(false)
  })
})

describe('hypothesize — how much the assumption actually added', () => {
  const puzzle = loadPuzzle(cascadeDef)

  it('flags an assumption pure propagation had already established', () => {
    const result = hypothesize(puzzle, 'austin', '1:0')

    expect(result.verdict).toBe('completes')
    expect(result.novelty).toBe('alreadyProven')
  })

  it('flags an assumption pure propagation had already struck out', () => {
    expect(hypothesize(puzzle, 'austin', '0:0').novelty).toBe('alreadyExcluded')
  })

  it('flags a genuine bifurcation when the cell is still live', () => {
    expect(hypothesize(loadPuzzle(openPairDef), 'a', '0:0').novelty).toBe('genuine')
  })
})

describe('surveyAlternatives — the only way a hypothesis proves anything', () => {
  it('proves austin’s cell by refuting every alternative', () => {
    const survey = surveyAlternatives(loadPuzzle(cascadeDef), 'austin')

    expect(survey.tested.map((t) => t.cell).sort()).toEqual(['0:0', '1:0'])
    expect(survey.refutedCells).toEqual(['0:0'])
    expect(survey.survivingCells).toEqual(['1:0'])
    expect(survey.provenCell).toBe('1:0')
  })

  it('proves nothing when more than one cell survives', () => {
    const survey = surveyAlternatives(loadPuzzle(openPairDef), 'a')

    expect(survey.refutedCells).toEqual([])
    expect(survey.survivingCells).toHaveLength(4)
    expect(survey.provenCell).toBeUndefined()
  })
})

describe('hypothesize — leaves plain propagation exactly as it was', () => {
  it('propagate(cascade) still solves it identically, before and after a hypothesis run', () => {
    const puzzle = loadPuzzle(cascadeDef)
    const before = propagate(puzzle)

    hypothesize(puzzle, 'austin', '0:0')
    surveyAlternatives(puzzle, 'brycen')

    const after = propagate(puzzle)
    expect(before.status).toBe('solved')
    expect(after.status).toBe('solved')
    expect(after.placements).toEqual({ austin: '1:0', brycen: '0:1', diane: '2:2' })
    expect(after.placements).toEqual(before.placements)
    expect(after.journal).toEqual(before.journal)
  })

  it('rejects an unknown person or an off-board cell', () => {
    const puzzle = loadPuzzle(cascadeDef)
    expect(() => hypothesize(puzzle, 'nobody', '0:0')).toThrow(/unknown person/)
    expect(() => hypothesize(puzzle, 'austin', '9:9')).toThrow(/not on the board/)
  })
})
