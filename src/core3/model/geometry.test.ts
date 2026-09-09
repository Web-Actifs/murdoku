import { describe, expect, it } from 'vitest'
import { cellKey, isAdjacent, isPeripheral, mayCoexist, neighborsOf, sameShaft } from './geometry'
import { loadPuzzle } from './loadPuzzle'
import { mezzanineShell, twoStoreyShell } from '../testing/fixtures'

describe('V3 geometry', () => {
  it('keys carry the floor', () => {
    expect(cellKey({ floor: 2, row: 1, col: 0 })).toBe('2:1:0')
  })

  it('lets two people share a row and a column across floors — the whole point of V3', () => {
    expect(mayCoexist({ floor: 0, row: 1, col: 1 }, { floor: 1, row: 1, col: 1 })).toBe(true)
  })

  it('still forbids a shared row on the same floor (§2)', () => {
    expect(mayCoexist({ floor: 0, row: 1, col: 1 }, { floor: 0, row: 1, col: 2 })).toBe(false)
    expect(mayCoexist({ floor: 0, row: 1, col: 1 }, { floor: 0, row: 2, col: 1 })).toBe(false)
    expect(mayCoexist({ floor: 0, row: 1, col: 1 }, { floor: 0, row: 2, col: 2 })).toBe(true)
  })

  it('reads a shaft off the row and column alone', () => {
    expect(sameShaft({ floor: 0, row: 1, col: 2 }, { floor: 2, row: 1, col: 2 })).toBe(true)
    expect(sameShaft({ floor: 0, row: 1, col: 2 }, { floor: 2, row: 1, col: 1 })).toBe(false)
  })

  it('does not make a slab a neighbour', () => {
    const puzzle = loadPuzzle(twoStoreyShell())
    const neighbors = neighborsOf(puzzle.board, { floor: 0, row: 1, col: 1 })
    expect(neighbors.every((n) => n.floor === 0)).toBe(true)
    expect(neighbors).toHaveLength(4)
  })

  it('makes the cell under an opening a neighbour, and only that one', () => {
    const puzzle = loadPuzzle(mezzanineShell())
    expect(isAdjacent(puzzle.board, { floor: 1, row: 0, col: 0 }, { floor: 0, row: 0, col: 0 })).toBe(true)
    expect(isAdjacent(puzzle.board, { floor: 1, row: 1, col: 0 }, { floor: 0, row: 1, col: 0 })).toBe(false)
  })

  it('judges an exterior wall on the cell own level', () => {
    const puzzle = loadPuzzle(twoStoreyShell())
    expect(isPeripheral(puzzle.board, { floor: 1, row: 1, col: 1 })).toBe(false)
    expect(isPeripheral(puzzle.board, { floor: 1, row: 0, col: 1 })).toBe(true)
  })
})

describe('volumes', () => {
  it('makes one zone of a room drawn on two levels', () => {
    const puzzle = loadPuzzle(mezzanineShell())
    const below = puzzle.board.cellsByKey.get('0:0:0')!
    const above = puzzle.board.cellsByKey.get('1:0:0')!
    expect(above.floor).toBe(1)
    expect(above.zoneId).toBe(below.zoneId)
  })

  it('keeps distinct rooms distinct until a link is discovered', () => {
    const def = {
      ...twoStoreyShell(),
      links: [{ id: 'chute', rooms: ['salon', 'chambre'] as [string, string], nameKey: 'chute' }],
    }

    const before = loadPuzzle(def, { revealedClues: new Set(), unlockedLinks: new Set(), accessibleFloors: new Set([0]) })
    expect(before.board.cellsByKey.get('0:0:0')!.zoneId).not.toBe(before.board.cellsByKey.get('1:0:0')!.zoneId)

    const after = loadPuzzle(def, { revealedClues: new Set(), unlockedLinks: new Set(['chute']), accessibleFloors: new Set([0, 1]) })
    expect(after.board.cellsByKey.get('0:0:0')!.zoneId).toBe(after.board.cellsByKey.get('1:0:0')!.zoneId)
  })
})
