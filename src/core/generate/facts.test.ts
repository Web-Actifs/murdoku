import { describe, expect, it } from 'vitest'
import { isCompleteAssignmentValid, pairwiseOk, staticDomainForConstraint } from '../constraints/domain'
import type { Constraint } from '../constraints/types'
import { cellKey } from '../model/geometry'
import { loadPuzzle } from '../model/loadPuzzle'
import type { Assignment, PuzzleDef } from '../model/types'
import { enumerateFacts, factsForPerson } from './facts'

/**
 * A hand-built 3x3 with a hand-checked solution, and deliberately *two* objects
 * of type "table" in different zones — the grid-wide union-by-type domain is a
 * documented author trap, so the enumerator has to be tested against it.
 */
const tinyDef: PuzzleDef = {
  id: 'tiny',
  plan: `
    AAB
    AAB
    CCB
  `,
  legend: { A: 'salon', B: 'couloir', C: 'cave' },
  zones: [
    { id: 'salon', nameKey: 'salon' },
    { id: 'couloir', nameKey: 'couloir' },
    { id: 'cave', nameKey: 'cave' },
  ],
  objects: [
    { id: 'tableSalon', type: 'table', occupiable: true, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
    { id: 'tableCave', type: 'table', occupiable: true, cells: [{ row: 2, col: 0 }] },
    { id: 'lucarne', type: 'window', occupiable: false, cells: [{ row: 2, col: 2 }] },
  ],
  people: [
    { id: 'p1', nameKey: 'p1', constraints: [] },
    { id: 'p2', nameKey: 'p2', constraints: [] },
    { id: 'p3', nameKey: 'p3', constraints: [] },
  ],
  victimId: 'p1',
}

const tiny = loadPuzzle(tinyDef)
const solution: Assignment = { p1: '0:0', p2: '1:2', p3: '2:1' }
const facts = enumerateFacts(tiny.board, tiny.people, solution)

const sorted = (constraints: Constraint[]) => constraints.map((c) => JSON.stringify(c)).sort()

describe('enumerateFacts — every clue it emits is true of the solution', () => {
  it('holds up against isCompleteAssignmentValid, one clue at a time', () => {
    // Independent oracle: dress the person with that single clue and re-validate
    // the whole assignment through the model, rather than trusting the checker
    // the enumerator itself filtered with.
    for (const [personId, constraints] of facts) {
      for (const constraint of constraints) {
        const dressed = loadPuzzle({
          ...tinyDef,
          people: tinyDef.people.map((p) => (p.id === personId ? { ...p, constraints: [constraint] } : p)),
        })
        expect(isCompleteAssignmentValid(dressed, solution), `${personId}: ${JSON.stringify(constraint)}`).toBe(true)
      }
    }
  })

  it('agrees with staticDomainForConstraint and pairwiseOk clue by clue', () => {
    for (const [personId, constraints] of facts) {
      for (const constraint of constraints) {
        const domain = staticDomainForConstraint(constraint, tiny.board)
        if (domain) {
          expect(domain.map(cellKey)).toContain(solution[personId])
        } else {
          expect(pairwiseOk([constraint], personId, solution, tiny.board), JSON.stringify(constraint)).toBe(true)
        }
      }
    }
  })

  it('never proposes distance: 0 — §2 makes it unsatisfiable and loadPuzzle rejects it', () => {
    for (const constraints of facts.values()) {
      for (const c of constraints) if (c.type === 'distance') expect(c.exact).not.toBe(0)
    }
  })
})

/** Everything the enumerator proposes plainly, denials set aside — see the block below for those. */
const plainFacts = new Map([...facts].map(([id, list]) => [id, list.filter((c) => c.type !== 'not')]))

describe('enumerateFacts — it is exhaustive, not a sample', () => {
  it('lists exactly the 15 clues true of p1 on the salon table, and nothing else', () => {
    expect(sorted(plainFacts.get('p1')!)).toEqual(
      sorted([
        { type: 'inZone', zoneId: 'salon' },
        { type: 'onObjectType', objectType: 'table' },
        { type: 'inRow', row: 'top' },
        { type: 'inRow', row: 0 },
        { type: 'inColumn', column: 'left' },
        { type: 'inColumn', column: 0 },
        { type: 'direction', other: 'p2', dir: 'N' },
        { type: 'direction', other: 'p2', dir: 'W' },
        { type: 'direction', other: 'p3', dir: 'N' },
        { type: 'direction', other: 'p3', dir: 'W' },
        { type: 'distance', other: 'p2', axis: 'row', exact: 1 },
        { type: 'distance', other: 'p2', axis: 'col', exact: 2 },
        { type: 'distance', other: 'p3', axis: 'row', exact: 2 },
        { type: 'distance', other: 'p3', axis: 'col', exact: 1 },
        { type: 'alone' },
      ]),
    )
  })

  it('gives each person exactly one direction per axis towards each other person', () => {
    for (const [personId, constraints] of plainFacts) {
      for (const other of ['p1', 'p2', 'p3'].filter((id) => id !== personId)) {
        const dirs = constraints.filter((c) => c.type === 'direction' && c.other === other)
        expect(dirs, `${personId} -> ${other}`).toHaveLength(2)
      }
    }
  })

  it('emits notAlone for nobody here: all three are in separate zones', () => {
    for (const [, constraints] of facts) {
      expect(constraints).toContainEqual({ type: 'alone' })
      expect(constraints).not.toContainEqual({ type: 'notAlone' })
    }
  })

  it('never emits onObjectType for a window: nobody can stand on one', () => {
    for (const constraints of facts.values()) {
      expect(constraints).not.toContainEqual({ type: 'onObjectType', objectType: 'window' })
    }
  })
})

describe('enumerateFacts — a witness can deny as well as confirm', () => {
  const denials = (personId: string) => facts.get(personId)!.filter((c) => c.type === 'not')

  it('states the other side of every clue that turned out false — once, and never both sides', () => {
    for (const [personId, constraints] of facts) {
      const stated = new Set(constraints.filter((c) => c.type !== 'not').map((c) => JSON.stringify(c)))
      const denied = constraints.filter((c) => c.type === 'not')

      for (const d of denied) {
        expect(stated.has(JSON.stringify(d.type === 'not' && d.of)), `${personId} both states and denies`).toBe(false)
      }
      expect(new Set(denied.map((c) => JSON.stringify(c))).size).toBe(denied.length)
    }
  })

  it('denies the rooms, the landmarks and the relations p1 is not part of', () => {
    expect(denials('p1')).toContainEqual({ type: 'not', of: { type: 'inZone', zoneId: 'cave' } })
    expect(denials('p1')).toContainEqual({ type: 'not', of: { type: 'withPerson', other: 'p2' } })
    expect(denials('p1')).toContainEqual({ type: 'not', of: { type: 'direction', other: 'p2', dir: 'S' } })
    expect(denials('p1')).toContainEqual({ type: 'not', of: { type: 'distance', other: 'p2', axis: 'row', exact: 2 } })
    // ...and never the other side of something that *is* true of p1.
    expect(denials('p1')).not.toContainEqual({ type: 'not', of: { type: 'inZone', zoneId: 'salon' } })
  })

  it('never denies distance: 0, no more than it proposes it', () => {
    for (const constraints of facts.values()) {
      for (const c of constraints) {
        if (c.type === 'not' && c.of.type === 'distance') expect(c.of.exact).not.toBe(0)
      }
    }
  })

  it('leaves alone/notAlone undeniable: propagation could not act on those', () => {
    for (const constraints of facts.values()) {
      for (const c of constraints) {
        if (c.type === 'not') expect(['alone', 'notAlone']).not.toContain(c.of.type)
      }
    }
  })
})

describe('enumerateFacts — the union-by-type domain is honoured, not the nearest object', () => {
  it('calls p3 "next to a table" because of the cellar table, though the salon one is far away', () => {
    expect(facts.get('p3')).toContainEqual({ type: 'adjacentToObjectType', objectType: 'table' })
    // ...and it really is grid-wide: the domain spans both rooms.
    const domain = staticDomainForConstraint({ type: 'adjacentToObjectType', objectType: 'table' }, tiny.board)!
    expect(domain.map(cellKey).sort()).toEqual(['1:0', '1:1', '2:1'])
  })

  it('does not call p1 "next to a table" just because they sit on one', () => {
    expect(facts.get('p1')).not.toContainEqual({ type: 'adjacentToObjectType', objectType: 'table' })
  })
})

describe('factsForPerson', () => {
  it('refuses to work from an incomplete solution rather than guessing', () => {
    expect(() => factsForPerson(tiny.board, tiny.people, { p1: '0:0' }, 'p2')).toThrow(/unplaced/)
  })
})
