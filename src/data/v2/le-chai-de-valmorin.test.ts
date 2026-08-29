import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { isPeripheral, unoccupiableCells } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { valmorinDef } from './le-chai-de-valmorin'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  edmond: '2:0',
  blanche: '3:3',
  raymond: '1:2',
  lucie: '4:4',
}

const puzzle = loadPuzzle(valmorinDef)

describe('Le chai de Valmorin — the board itself loads and validates', () => {
  it('parses into the 5x5 hull the plan draws, with four zones', () => {
    expect(puzzle.board.rows).toBe(5)
    expect(puzzle.board.cols).toBe(5)
    expect(puzzle.board.cells).toHaveLength(25)
    expect(puzzle.zones.map((z) => z.id).sort()).toEqual(['bureau', 'chai', 'cuverie', 'serre'])
  })

  it('carries multi-cell occupiable furniture, not just one-cell props', () => {
    const multiCell = puzzle.board.objects.filter((o) => o.occupiable && o.cells.length > 1)
    expect(multiCell.map((o) => o.id).sort()).toEqual(['banc', 'passerelle'])
    expect(puzzle.board.objects.find((o) => o.id === 'passerelle')!.cells).toHaveLength(2)
  })

  it('has real windows, and validateModel accepted them because they sit on the hull', () => {
    const windows = puzzle.board.objects.filter((o) => o.type === 'window')
    expect(windows.map((o) => o.id).sort()).toEqual(['fenetreBureau', 'lucarneDuChai'])
    for (const window of windows) {
      // §10/§42: an opening in the wall, not a piece of furniture — the cells it
      // names are the ordinary floor a person stands on to face it.
      expect(window.occupiable).toBe(true)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
    }
  })

  it('blocks only the vats, barrels, desk and planter — never the windows', () => {
    const blocked = unoccupiableCells(puzzle.board)
    expect([...blocked].sort()).toEqual(['0:0', '0:3', '1:0', '1:3', '3:0', '3:4'])
    expect(blocked.has('0:4')).toBe(false)
    expect(blocked.has('4:0')).toBe(false)
  })

  it('refuses to load if a window is moved off the hull', () => {
    const inland = structuredClone(valmorinDef)
    inland.objects.find((o) => o.id === 'lucarneDuChai')!.cells = [{ row: 2, col: 3 }]
    expect(() => loadPuzzle(inland)).toThrow(/exterior/)
  })

  it('leaves capacity to spare: 4 people on a board that could hold 5', () => {
    expect(puzzle.people).toHaveLength(4)
    expect(Math.min(puzzle.board.rows, puzzle.board.cols)).toBe(5)
  })
})

describe('Le chai de Valmorin — solved by propagation alone (§3)', () => {
  const result = propagate(puzzle)

  it('reaches a solved fixed point without a single guess', () => {
    expect(result.status).toBe('solved')
    expect(result.placements).toEqual(SOLUTION)
  })

  it('leaves every person on exactly one candidate cell', () => {
    for (const person of puzzle.people) {
      expect([...result.candidates.get(person.id)!]).toEqual([SOLUTION[person.id]])
    }
  })

  it('respects the fundamental rule: no shared row, no shared column', () => {
    const rows = Object.values(SOLUTION).map((k) => k.split(':')[0])
    const cols = Object.values(SOLUTION).map((k) => k.split(':')[1])
    expect(new Set(rows).size).toBe(4)
    expect(new Set(cols).size).toBe(4)
  })
})

describe('Le chai de Valmorin — the proof is a chain, not a flat pile of clues (§4)', () => {
  const report = analyzeDifficulty(puzzle)

  it('has keystones, and they drag other steps down with them', () => {
    expect(report.keystones.length).toBeGreaterThan(0)
    expect(report.articulationCount).toBeGreaterThan(0)
    expect(report.maxCascade).toBeGreaterThan(1)
    expect(report.maxChainDepth).toBeGreaterThan(1)
  })

  it('opens on locked candidate sets, before anyone at all is placed', () => {
    const journal = propagate(puzzle).journal
    const firstPlacement = journal.findIndex((s) => s.placed)
    expect(firstPlacement).toBe(5)
    expect(journal.slice(0, 2).map((s) => s.technique)).toEqual(['lockedCandidates', 'lockedCandidates'])
  })

  it('reserves the west wall for the body before the body is located (§33)', () => {
    // "Along the west wall" pins nothing on its own — but it does confine Edmond
    // to column 0, and that alone starts eating Blanche's options.
    const journal = propagate(puzzle).journal
    const opening = journal[0]
    expect(opening.personId).toBe('blanche')
    expect(opening.reason).toEqual({ type: 'confinedToCol', confinedPerson: 'edmond', col: 0 })
    expect(opening.premises).toEqual([])
  })

  it('places Lucie off a Blanche who is still floating (§33)', () => {
    const journal = propagate(puzzle).journal
    const blancheWith = journal.find(
      (s) => s.personId === 'blanche' && s.reason.type === 'relational' && s.reason.constraintType === 'withPerson',
    )!
    const lucieCut = journal.find((s) => s.personId === 'lucie' && s.technique === 'lockedCandidates')!
    const luciePlaced = journal.find((s) => s.personId === 'lucie' && s.placed)!
    const blanchePlaced = journal.find((s) => s.personId === 'blanche' && s.placed)!

    expect(lucieCut.reason).toEqual({ type: 'confinedToRow', confinedPerson: 'blanche', row: 3 })
    expect(lucieCut.premises).toContain(blancheWith.id)
    expect(journal.indexOf(luciePlaced)).toBeLessThan(journal.indexOf(blanchePlaced))
  })

  it('places people in the order the chain forces, the body dead last (§14)', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['raymond', 'lucie', 'blanche', 'edmond'])
  })

  it('closes the body’s two remaining planks with the last living placement (§14)', () => {
    const journal = propagate(puzzle).journal
    const luciePlaced = journal.find((s) => s.personId === 'lucie' && s.placed)!
    const edmondCut = journal.find((s) => s.personId === 'edmond' && s.technique === 'rowColElimination')!
    expect(edmondCut.before).toHaveLength(2)
    expect(edmondCut.reason).toEqual({ type: 'rowTaken', by: 'lucie', row: 4 })
    expect(edmondCut.premises).toContain(luciePlaced.id)
  })

  it('needs more than one technique, including an intermediate one', () => {
    expect(report.techniqueCounts.lockedCandidates).toBeGreaterThan(0)
    expect(report.techniqueCounts.rowColElimination).toBeGreaterThan(0)
    expect(report.techniqueCounts.relationalFilter).toBeGreaterThan(0)
    expect(report.techniqueCounts.nakedSingle).toBeGreaterThan(0)
    expect(report.tier).toBe('intermediate')
  })

  it('lands on the difficulty this case is published at (§56.9)', () => {
    expect(report.propagationStatus).toBe('solved')
    expect(report.category).toBe('intermediate')
  })
})

describe('Le chai de Valmorin — exactly one solution (§6)', () => {
  it('finds one and only one placement, even when asked for two', () => {
    const solutions = solvePuzzle(puzzle, { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual(SOLUTION)
  })

  it('agrees with what propagation derived', () => {
    expect(solvePuzzle(puzzle, { limit: 2 })[0]).toEqual(propagate(puzzle).placements)
  })
})

describe('Le chai de Valmorin — the murderer is derived, never stored (§5)', () => {
  it('names Raymond: he is the only other person left in the vat room', () => {
    const solution = solvePuzzle(puzzle, { limit: 2 })[0]
    expect(deriveMurderer(puzzle, solution)).toBe('raymond')
  })

  it('is not stored anywhere in the authored case', () => {
    expect(Object.keys(valmorinDef)).not.toContain('murdererId')
    expect(Object.keys(valmorinDef)).not.toContain('solution')
  })

  it('puts exactly one other person in the victim zone, and the rest elsewhere', () => {
    const zoneOf = (personId: string) => puzzle.board.cellsByKey.get(SOLUTION[personId])!.zoneId
    expect(zoneOf('edmond')).toBe('cuverie')
    expect(zoneOf('raymond')).toBe('cuverie')
    expect(zoneOf('blanche')).toBe('serre')
    expect(zoneOf('lucie')).toBe('serre')
  })
})

describe('Le chai de Valmorin — the clue vocabulary (§7)', () => {
  it('mixes company, direction, a metric gap and the furniture', () => {
    const seen = new Set<string>()
    const walk = (c: Constraint) => {
      seen.add(c.type)
      if (c.type === 'not') walk(c.of)
    }
    for (const person of valmorinDef.people) for (const c of person.constraints) walk(c)

    expect([...seen].sort()).toEqual(['adjacentToObjectType', 'direction', 'distance', 'inColumn', 'inRow', 'withPerson'])
  })

  it('gives the victim the lightest dossier of anyone', () => {
    const victim = valmorinDef.people.find((p) => p.id === valmorinDef.victimId)!
    expect(victim.isVictim).toBe(true)
    for (const other of valmorinDef.people.filter((p) => p.id !== valmorinDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThanOrEqual(victim.constraints.length)
    }
  })
})
