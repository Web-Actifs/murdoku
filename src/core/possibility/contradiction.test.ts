import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import type { PuzzleDef } from '../model/types'
import { traceContradiction } from './contradiction'
import { propagate } from './propagate'

describe('traceContradiction — diagnosing a genuinely broken case, not just a hypothesis', () => {
  it('returns undefined when there is nothing to explain', () => {
    expect(traceContradiction({ status: 'solved', candidates: new Map(), journal: [], placements: {} })).toBeUndefined()
    expect(traceContradiction({ status: 'stuck', candidates: new Map(), journal: [], placements: {} })).toBeUndefined()
  })

  it('names the person and shows a real chain when two clues collide mid-propagation', () => {
    // Both anchored to a single cell of their own, both in the same row —
    // an author mistake, found by plain propagate(), no hypothesis involved.
    const def: PuzzleDef = {
      id: 'row-clash',
      plan: `
        AAA
        AAA
      `,
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [
        { id: 'spotX', type: 'spotX', occupiable: true, cells: [{ row: 0, col: 0 }] },
        { id: 'spotY', type: 'spotY', occupiable: true, cells: [{ row: 0, col: 1 }] },
      ],
      people: [
        { id: 'x', nameKey: 'x', constraints: [{ type: 'onObjectType', objectType: 'spotX' }] },
        { id: 'y', nameKey: 'y', constraints: [{ type: 'onObjectType', objectType: 'spotY' }] },
      ],
      victimId: 'x',
    }

    const run = propagate(loadPuzzle(def))
    expect(run.status).toBe('contradiction')

    const trace = traceContradiction(run)!
    expect(trace).toBeDefined()
    expect(trace.chain.length).toBeGreaterThan(0)
    expect(trace.peopleInvolved.length).toBeGreaterThan(0)

    // The chain reads as a demonstration: every premise it cites is either
    // grounded (empty) or satisfied by an earlier step of this same chain.
    const seenIds = new Set<string>()
    for (const step of trace.chain) {
      for (const premise of step.premises) expect(seenIds.has(premise)).toBe(true)
      seenIds.add(step.id)
    }
  })

  it('names the person outright when their own clues alone are unsatisfiable', () => {
    // Two zone constraints that can never both hold — empty from the seed,
    // before any removal ever happens.
    const def: PuzzleDef = {
      id: 'impossible-own-clues',
      plan: `
        AB
      `,
      legend: { A: 'salon', B: 'cuisine' },
      zones: [
        { id: 'salon', nameKey: 'salon' },
        { id: 'cuisine', nameKey: 'cuisine' },
      ],
      objects: [],
      people: [
        {
          id: 'ghost',
          nameKey: 'ghost',
          constraints: [
            { type: 'inZone', zoneId: 'salon' },
            { type: 'inZone', zoneId: 'cuisine' },
          ],
        },
      ],
      victimId: 'ghost',
    }

    const run = propagate(loadPuzzle(def))
    expect(run.status).toBe('contradiction')
    expect(run.contradictionPersonId).toBe('ghost')

    const trace = traceContradiction(run)!
    expect(trace.personId).toBe('ghost')
    expect(trace.chain).toEqual([])
  })
})
