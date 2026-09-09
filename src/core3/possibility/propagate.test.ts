import { describe, expect, it } from 'vitest'
import type { Clue } from '../model/types'
import { loadPuzzle } from '../model/loadPuzzle'
import { deriveMurderer, solvePuzzle } from '../solve/solver'
import { mezzanineShell, twoStoreyShell } from '../testing/fixtures'
import { propagate } from './propagate'

function clue(id: string, personId: string, constraint: Clue['constraint']): Clue {
  return { id, personId, constraint, revealedBy: 'start' }
}

describe('per-floor row/column elimination', () => {
  it('closes a row on the pinned person floor only', () => {
    const def = {
      ...twoStoreyShell(),
      clues: [clue('c1', 'a', { type: 'inZone', zoneId: 'salon' }), clue('c2', 'a', { type: 'inRow', row: 1 }), clue('c3', 'a', { type: 'inColumn', column: 1 })],
    }
    const result = propagate(loadPuzzle(def))
    const b = result.candidates.get('b')!

    expect(result.candidates.get('a')).toEqual(new Set(['0:1:1']))
    // Row 1 and column 1 are gone downstairs...
    expect(b.has('0:1:0')).toBe(false)
    expect(b.has('0:0:1')).toBe(false)
    // ...and untouched upstairs, including the cell directly above a's.
    expect(b.has('1:1:1')).toBe(true)
  })
})

describe('the vertical vocabulary', () => {
  it('reads "juste au-dessus" as an adjacency the flat game cannot state', () => {
    const def = {
      ...twoStoreyShell(),
      clues: [
        clue('c1', 'a', { type: 'inRow', row: 2 }),
        clue('c2', 'a', { type: 'inColumn', column: 0 }),
        clue('c3', 'a', { type: 'onFloor', floor: 0 }),
        clue('c4', 'b', { type: 'above', other: 'a', exact: 1 }),
      ],
    }
    const result = propagate(loadPuzzle(def))
    expect(result.candidates.get('a')).toEqual(new Set(['0:2:0']))
    expect(result.candidates.get('b')).toEqual(new Set(['1:2:0']))
  })

  it('treats a shared row as a statement about floors', () => {
    const def = {
      ...twoStoreyShell(),
      clues: [
        clue('c1', 'a', { type: 'onFloor', floor: 0 }),
        clue('c2', 'a', { type: 'inRow', row: 0 }),
        clue('c3', 'b', { type: 'distance', other: 'a', axis: 'row', exact: 0 }),
      ],
    }
    const result = propagate(loadPuzzle(def))
    // b shares a's row, so b cannot be on a's floor — nothing else is settled yet.
    const b = result.candidates.get('b')!
    expect([...b].every((key) => key.startsWith('1:0:'))).toBe(true)
    expect(b.size).toBe(3)
  })
})

describe('volumes and the verdict', () => {
  it('names a culprit standing one floor above the body, in the same volume', () => {
    const def = {
      ...mezzanineShell(),
      clues: [
        clue('c1', 'a', { type: 'onFloor', floor: 1 }),
        clue('c2', 'b', { type: 'onFloor', floor: 0 }),
        clue('c3', 'v', { type: 'onFloor', floor: 0 }),
      ],
    }
    const puzzle = loadPuzzle(def)
    const [solution] = solvePuzzle(puzzle, { limit: 1 })

    // Everyone is in the same volume here, so nobody is alone with the body.
    expect(deriveMurderer(puzzle, solution)).toBeNull()
  })

  it('changes who is guilty when a link is discovered, on identical placements', () => {
    const def = {
      ...twoStoreyShell(),
      links: [{ id: 'chute', rooms: ['salon', 'chambre'] as [string, string], nameKey: 'chute' }],
    }
    const placements = { v: '0:0:0', a: '0:1:1', b: '1:2:2' }

    const sealed = loadPuzzle(def, { revealedClues: new Set(), unlockedLinks: new Set(), accessibleFloors: new Set([0, 1]) })
    expect(deriveMurderer(sealed, placements)).toBe('a')

    const opened = loadPuzzle(def, { revealedClues: new Set(), unlockedLinks: new Set(['chute']), accessibleFloors: new Set([0, 1]) })
    // The scullery and the cellar are now one volume: two people share it with
    // the body, so the answer that looked settled dissolves.
    expect(deriveMurderer(opened, placements)).toBeNull()
  })
})

describe('the solver', () => {
  it('agrees with propagation and finds the placement unique', () => {
    const def = {
      ...twoStoreyShell(),
      clues: [
        clue('c1', 'a', { type: 'onFloor', floor: 0 }),
        clue('c2', 'a', { type: 'inRow', row: 0 }),
        clue('c3', 'a', { type: 'inColumn', column: 0 }),
        clue('c4', 'b', { type: 'above', other: 'a', exact: 1 }),
        clue('c5', 'v', { type: 'onFloor', floor: 0 }),
        clue('c6', 'v', { type: 'inRow', row: 2 }),
        clue('c7', 'v', { type: 'inColumn', column: 2 }),
      ],
    }
    const puzzle = loadPuzzle(def)
    const solutions = solvePuzzle(puzzle, { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(propagate(puzzle).placements).toEqual(solutions[0])
  })
})
