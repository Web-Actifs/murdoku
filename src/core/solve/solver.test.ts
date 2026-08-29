import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import type { PuzzleDef } from '../model/types'
import { deriveMurderer, solvePuzzle } from './solver'

describe('the row/column rule V1 was missing', () => {
  it('rejects two people confined to the same column, even in different rooms', () => {
    const def: PuzzleDef = {
      id: 'column-clash',
      plan: `
        AA
        AA
      `,
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [
        { id: 'spotX', type: 'spotX', occupiable: true, cells: [{ row: 0, col: 0 }] },
        { id: 'spotY', type: 'spotY', occupiable: true, cells: [{ row: 1, col: 0 }] },
      ],
      people: [
        { id: 'x', nameKey: 'x', constraints: [{ type: 'onObjectType', objectType: 'spotX' }] },
        { id: 'y', nameKey: 'y', constraints: [{ type: 'onObjectType', objectType: 'spotY' }] },
      ],
      victimId: 'x',
    }

    expect(solvePuzzle(loadPuzzle(def))).toHaveLength(0)
  })
})

describe('a cascade solved by locked-candidates + naked singles alone', () => {
  // austin's only candidates share column 0 -> that column locks for everyone else,
  // which forces brycen, which in turn forces diane. No cell is ever guessed.
  const def: PuzzleDef = {
    id: 'cascade',
    plan: `
      AAA
      AAA
      AAA
    `,
    legend: { A: 'salle' },
    zones: [{ id: 'salle', nameKey: 'salle' }],
    objects: [
      {
        id: 'spotA',
        type: 'spotA',
        occupiable: true,
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
        ],
      },
      {
        id: 'spotB',
        type: 'spotB',
        occupiable: true,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      },
      {
        id: 'spotD',
        type: 'spotD',
        occupiable: true,
        cells: [
          { row: 1, col: 2 },
          { row: 2, col: 2 },
        ],
      },
    ],
    people: [
      { id: 'austin', nameKey: 'austin', constraints: [{ type: 'onObjectType', objectType: 'spotA' }] },
      { id: 'brycen', nameKey: 'brycen', constraints: [{ type: 'onObjectType', objectType: 'spotB' }] },
      { id: 'diane', nameKey: 'diane', constraints: [{ type: 'onObjectType', objectType: 'spotD' }] },
    ],
    victimId: 'austin',
  }

  it('has exactly one solution', () => {
    expect(solvePuzzle(loadPuzzle(def))).toHaveLength(1)
  })

  it('matches the hand-derived placement', () => {
    const [solution] = solvePuzzle(loadPuzzle(def))
    expect(solution).toEqual({ austin: '1:0', brycen: '0:1', diane: '2:2' })
  })
})

describe('deriveMurderer', () => {
  const baseDef: PuzzleDef = {
    id: 'murder',
    plan: `
      AABB
      AABB
      AABB
    `,
    legend: { A: 'salon', B: 'cuisine' },
    zones: [
      { id: 'salon', nameKey: 'salon' },
      { id: 'cuisine', nameKey: 'cuisine' },
    ],
    objects: [],
    people: [
      { id: 'victim', nameKey: 'victim', constraints: [] },
      { id: 'suspect', nameKey: 'suspect', constraints: [] },
      { id: 'bystander', nameKey: 'bystander', constraints: [] },
    ],
    victimId: 'victim',
  }

  it('identifies the sole other person sharing the victim\'s zone', () => {
    const puzzle = loadPuzzle(baseDef)
    const assignment = { victim: '0:0', suspect: '1:1', bystander: '0:2' }
    expect(deriveMurderer(puzzle, assignment)).toBe('suspect')
  })

  it('identifies no one when the victim\'s zone holds more than one other person', () => {
    const puzzle = loadPuzzle(baseDef)
    const assignment = { victim: '0:0', suspect: '1:1', bystander: '0:1' }
    expect(deriveMurderer(puzzle, assignment)).toBeNull()
  })
})

describe('validation refuses rather than degrades', () => {
  it('rejects a window claimed on an interior cell', () => {
    const def: PuzzleDef = {
      id: 'bad-window',
      plan: `
        AAA
        AAA
        AAA
      `,
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [{ id: 'window_01', type: 'window', occupiable: false, cells: [{ row: 1, col: 1 }] }],
      people: [{ id: 'a', nameKey: 'a', constraints: [] }],
      victimId: 'a',
    }
    expect(() => loadPuzzle(def)).toThrow(/exterior/)
  })

  it('rejects more people than the grid can seat under the row/column rule', () => {
    const def: PuzzleDef = {
      id: 'too-many-people',
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
        { id: 'c', nameKey: 'c', constraints: [] },
      ],
      victimId: 'a',
    }
    expect(() => loadPuzzle(def)).toThrow(/can't fit/)
  })

  it('rejects a distance-0 constraint, which would force sharing a row or column', () => {
    const def: PuzzleDef = {
      id: 'impossible-distance',
      plan: `
        AA
        AA
      `,
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [],
      people: [
        { id: 'a', nameKey: 'a', constraints: [] },
        { id: 'b', nameKey: 'b', constraints: [{ type: 'distance', other: 'a', axis: 'row', exact: 0 }] },
      ],
      victimId: 'a',
    }
    expect(() => loadPuzzle(def)).toThrow(/exact: 0/)
  })
})
