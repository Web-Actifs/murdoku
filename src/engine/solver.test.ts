import { describe, expect, it } from 'vitest'
import { staticDomain } from './clues'
import { isDirection, isOrthogonallyAdjacent } from './grid'
import { solveCase } from './solver'
import type { CaseDef, GridCell } from './types'
import { validateCase } from './validate'

// 2x2-rooms test fixture: roomA = {A1(0,0), A2(1,0)}, roomB = {B1(0,1) has a plant, B2(1,1)}.
const grid: GridCell[] = [
  { id: 'A1', x: 0, y: 0, roomId: 'roomA' },
  { id: 'A2', x: 1, y: 0, roomId: 'roomA' },
  { id: 'B1', x: 0, y: 1, roomId: 'roomB', decor: ['plant'] },
  { id: 'B2', x: 1, y: 1, roomId: 'roomB' },
]

function baseCase(): CaseDef {
  return {
    id: 'test-case',
    titleKey: 'test',
    difficulty: 1,
    hintsAllowed: 1,
    grid,
    rooms: [
      { id: 'roomA', nameKey: 'roomA' },
      { id: 'roomB', nameKey: 'roomB' },
    ],
    characters: [
      { id: 'vic', nameKey: 'vic', avatarColor: '#000', clues: [{ type: 'inRoom', roomId: 'roomA' }], isVictim: true },
      { id: 'killer', nameKey: 'killer', avatarColor: '#000', clues: [{ type: 'relativeTo', target: 'vic', direction: 'E' }] },
      { id: 'other1', nameKey: 'other1', avatarColor: '#000', clues: [{ type: 'inColumn', column: 'left' }] },
      { id: 'other2', nameKey: 'other2', avatarColor: '#000', clues: [{ type: 'inColumn', column: 'right' }] },
    ],
    victimId: 'vic',
    murdererId: 'killer',
    solution: { vic: 'A1', killer: 'A2', other1: 'B1', other2: 'B2' },
  }
}

describe('grid helpers', () => {
  it('isDirection identifies cardinal relationships', () => {
    const west = grid[0] // A1 (0,0)
    const east = grid[1] // A2 (1,0)
    expect(isDirection(east, west, 'E')).toBe(true)
    expect(isDirection(west, east, 'E')).toBe(false)
    expect(isDirection(west, east, 'W')).toBe(true)
  })

  it('isOrthogonallyAdjacent rejects diagonals', () => {
    const a1 = grid[0]
    const b2 = grid[3] // diagonal from A1
    const b1 = grid[2] // directly below A1
    expect(isOrthogonallyAdjacent(a1, b2)).toBe(false)
    expect(isOrthogonallyAdjacent(a1, b1)).toBe(true)
  })
})

describe('clues', () => {
  it('staticDomain(adjacentToDecor) only includes same-room neighbors of the decor, not the decorated cell itself', () => {
    const domain = staticDomain([{ type: 'adjacentToDecor', decor: 'plant' }], grid)
    // A1 is geometrically adjacent to B1 but in a different room, so a wall blocks it.
    expect(domain.map((c) => c.id).sort()).toEqual(['B2'])
  })

  it('staticDomain intersects multiple clues on the same character', () => {
    const domain = staticDomain([{ type: 'inRoom', roomId: 'roomA' }, { type: 'inColumn', column: 'right' }], grid)
    expect(domain.map((c) => c.id)).toEqual(['A2'])
  })
})

describe('solveCase', () => {
  it('finds exactly one solution for a well-constrained case', () => {
    const solutions = solveCase(baseCase())
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual({ vic: 'A1', killer: 'A2', other1: 'B1', other2: 'B2' })
  })

  it('finds multiple solutions when a case is under-constrained', () => {
    const ambiguous = baseCase()
    ambiguous.characters[1] = { ...ambiguous.characters[1], clues: [{ type: 'inRoom', roomId: 'roomA' }] }
    const solutions = solveCase(ambiguous, { limit: 5 })
    expect(solutions.length).toBeGreaterThan(1)
  })

  it('finds no solution when a clue is impossible to satisfy', () => {
    const impossible = baseCase()
    impossible.characters[3] = { ...impossible.characters[3], clues: [{ type: 'inColumn', column: 99 }] }
    expect(solveCase(impossible)).toHaveLength(0)
  })
})

describe('validateCase', () => {
  it('accepts a well-formed unique-solution case matching the authored solution', () => {
    const result = validateCase(baseCase())
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects an ambiguous case', () => {
    const ambiguous = baseCase()
    ambiguous.characters[1] = { ...ambiguous.characters[1], clues: [{ type: 'inRoom', roomId: 'roomA' }] }
    const result = validateCase(ambiguous)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('ambiguous'))).toBe(true)
  })

  it('rejects an unsolvable case', () => {
    const impossible = baseCase()
    impossible.characters[3] = { ...impossible.characters[3], clues: [{ type: 'inColumn', column: 99 }] }
    const result = validateCase(impossible)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('unsolvable'))).toBe(true)
  })

  it('rejects a case where the murderer is not the sole occupant of the victim room', () => {
    const bad = baseCase()
    bad.murdererId = 'other1'
    const result = validateCase(bad)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('does not match murdererId'))).toBe(true)
  })
})
