import { describe, expect, it } from 'vitest'
import { emptyNotebook, withPlacement } from '../core/hints/notebook'
import type { PlayerNotebook } from '../core/hints/notebook'
import { loadPuzzle } from '../core/model/loadPuzzle'
import { deriveMurderer, solvePuzzle } from '../core/solve/solver'
import { cormoranDef } from '../data/v2/premier-cas'
import { evaluateGrid } from './v2Outcome'

const puzzle = loadPuzzle(cormoranDef)
const solution = solvePuzzle(puzzle, { limit: 2 })

function notebookOf(entries: Record<string, string>): PlayerNotebook {
  return Object.entries(entries).reduce((notebook, [personId, cell]) => withPlacement(notebook, personId, cell), emptyNotebook())
}

describe('evaluateGrid', () => {
  it('is the reference the play screen grades against: exactly one solution', () => {
    expect(solution).toHaveLength(1)
  })

  it('reports an empty grid as incomplete and unsolved', () => {
    const outcome = evaluateGrid(puzzle, emptyNotebook(), solution[0])
    expect(outcome).toMatchObject({ total: 5, placed: 0, correct: 0, complete: false, solved: false })
    expect(outcome.missing).toHaveLength(5)
  })

  it('closes the case only on the exact solution', () => {
    const outcome = evaluateGrid(puzzle, notebookOf(solution[0]), solution[0])
    expect(outcome).toMatchObject({ placed: 5, correct: 5, complete: true, solved: true })
    expect(outcome.misplaced).toEqual([])
  })

  it('names who is on the wrong cell without leaking where they belong', () => {
    const wrong = { ...solution[0], helene: '9:9' }
    const outcome = evaluateGrid(puzzle, notebookOf(wrong), solution[0])
    expect(outcome).toMatchObject({ correct: 4, complete: true, solved: false })
    expect(outcome.misplaced).toEqual(['helene'])
  })

  it('refuses to call a grid complete while anyone is still off the board', () => {
    const partial = { ...solution[0] }
    delete partial.oscar
    const outcome = evaluateGrid(puzzle, notebookOf(partial), solution[0])
    expect(outcome).toMatchObject({ placed: 4, correct: 4, complete: false, solved: false })
    expect(outcome.missing).toEqual(['oscar'])
  })

  it('has a derivable murderer once the grid is solved — the payoff of a correct plan', () => {
    expect(deriveMurderer(puzzle, solution[0])).toBe('helene')
  })
})
