import { describe, expect, it } from 'vitest'
import { cellKey } from '../model/geometry'
import type { Board, Cell, PersonDef, Puzzle, SceneObject } from '../model/types'
import { isCompleteAssignmentValid, pairwiseOk, staticDomain } from './domain'

// 2 zones, 2x2 each, side by side: salon = cols 0-1, cuisine = cols 2-3, all row 0-1.
function buildBoard(): Board {
  const cells: Cell[] = []
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) cells.push({ row, col, zoneId: col < 2 ? 'salon' : 'cuisine' })
  }
  const objects: SceneObject[] = [
    { id: 'chair_01', type: 'chair', occupiable: true, cells: [{ row: 0, col: 0 }] },
    { id: 'table_01', type: 'table', occupiable: false, cells: [{ row: 1, col: 3 }] },
  ]
  return { cells, rows: 2, cols: 4, objects, cellsByKey: new Map(cells.map((c) => [cellKey(c), c])) }
}

describe('staticDomain', () => {
  it('intersects zone and object-type constraints', () => {
    const board = buildBoard()
    const domain = staticDomain([{ type: 'onObjectType', objectType: 'chair' }], board)
    expect(domain.map(cellKey)).toEqual(['0:0'])
  })

  it('excludes cells covered by a non-occupiable object entirely', () => {
    const board = buildBoard()
    const domain = staticDomain([{ type: 'inZone', zoneId: 'cuisine' }], board)
    expect(domain.map(cellKey).sort()).toEqual(['0:2', '0:3', '1:2'])
  })

  it('not(inZone) is the complement of the zone', () => {
    const board = buildBoard()
    const domain = staticDomain([{ type: 'not', of: { type: 'inZone', zoneId: 'salon' } }], board)
    expect(domain.every((c) => c.zoneId === 'cuisine')).toBe(true)
  })
})

describe('withPerson and direction', () => {
  const board = buildBoard()

  it('withPerson only requires the same zone, regardless of position within it', () => {
    const assignment = { a: '0:1', b: '1:0' } // same zone (salon), diagonal from each other
    expect(pairwiseOk([{ type: 'withPerson', other: 'b' }], 'a', assignment, board)).toBe(true)
  })

  it('direction is a pure single-axis comparison, not tied to sharing a row or column', () => {
    // a and b share neither row nor column, satisfying the global row/col rule,
    // yet "a is north of b" still holds — see the geometry.ts isDirection comment.
    const assignment = { a: '0:3', b: '1:0' }
    expect(pairwiseOk([{ type: 'direction', other: 'b', dir: 'N' }], 'a', assignment, board)).toBe(true)
  })

  it('a relational constraint does not prune while the other person is unplaced', () => {
    const assignment = { a: '0:1' }
    expect(pairwiseOk([{ type: 'withPerson', other: 'b' }], 'a', assignment, board)).toBe(true)
  })

  it('not(withPerson) requires a different zone once both are placed', () => {
    const assignment = { a: '0:1', b: '1:0' }
    expect(pairwiseOk([{ type: 'not', of: { type: 'withPerson', other: 'b' } }], 'a', assignment, board)).toBe(false)
    const assignment2 = { a: '0:1', b: '0:2' }
    expect(pairwiseOk([{ type: 'not', of: { type: 'withPerson', other: 'b' } }], 'a', assignment2, board)).toBe(true)
  })
})

describe('alone / notAlone', () => {
  it('alone holds only when no other person shares the zone', () => {
    const board = buildBoard()
    const people: PersonDef[] = [
      { id: 'victim', nameKey: 'v', constraints: [{ type: 'alone' }] },
      { id: 'guest', nameKey: 'g', constraints: [] },
    ]
    const puzzle: Puzzle = { id: 'p', board, zones: [], people, victimId: 'victim' }

    expect(isCompleteAssignmentValid(puzzle, { victim: '0:0', guest: '1:2' })).toBe(true)
    expect(isCompleteAssignmentValid(puzzle, { victim: '0:0', guest: '1:1' })).toBe(false)
  })
})
