import { describe, expect, it } from 'vitest'
import { cellKey, unoccupiableCells } from '../model/geometry'
import { loadPuzzle } from '../model/loadPuzzle'
import type { Assignment, Puzzle } from '../model/types'
import { cormoranDef } from '../../data/v2/premier-cas'
import { makeRandom } from './random'
import { generateSolution } from './solution'

const puzzle: Puzzle = loadPuzzle(cormoranDef)
const peopleIds = cormoranDef.people.map((p) => p.id)

function expectValid(solution: Assignment): void {
  const blocked = unoccupiableCells(puzzle.board)
  const rows = new Set<number>()
  const cols = new Set<number>()

  expect(Object.keys(solution).sort()).toEqual([...peopleIds].sort())
  for (const key of Object.values(solution)) {
    const cell = puzzle.board.cellsByKey.get(key)
    expect(cell, `${key} is on the board`).toBeDefined()
    expect(blocked.has(cellKey(cell!)), `${key} is occupiable`).toBe(false)
    rows.add(cell!.row)
    cols.add(cell!.col)
  }
  expect(rows.size).toBe(peopleIds.length)
  expect(cols.size).toBe(peopleIds.length)
}

describe('generateSolution', () => {
  it('places everyone on a distinct row, a distinct column and an occupiable cell', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const solution = generateSolution(puzzle.board, peopleIds, makeRandom(seed))
      expect(solution, `seed ${seed}`).not.toBeNull()
      expectValid(solution!)
    }
  })

  it('is reproducible: the same seed always yields the same placement', () => {
    const first = generateSolution(puzzle.board, peopleIds, makeRandom(7))
    const second = generateSolution(puzzle.board, peopleIds, makeRandom(7))
    expect(second).toEqual(first)
  })

  it('varies with the seed rather than returning one canonical placement', () => {
    const seen = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      seen.add(JSON.stringify(generateSolution(puzzle.board, peopleIds, makeRandom(seed))))
    }
    expect(seen.size).toBeGreaterThan(15)
  })

  it('never seats anyone on the stove or a porthole', () => {
    const forbidden = new Set(['3:1', '1:5', '4:0'])
    for (let seed = 1; seed <= 25; seed++) {
      const solution = generateSolution(puzzle.board, peopleIds, makeRandom(seed))!
      for (const key of Object.values(solution)) expect(forbidden.has(key)).toBe(false)
    }
  })

  it('returns null instead of throwing when the cast cannot fit', () => {
    const narrow = loadPuzzle({
      id: 'corridor',
      plan: 'AA\nAA',
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [],
      people: [{ id: 'a', nameKey: 'a', constraints: [] }],
      victimId: 'a',
    })
    expect(generateSolution(narrow.board, ['a', 'b', 'c'], makeRandom(1))).toBeNull()
  })
})
