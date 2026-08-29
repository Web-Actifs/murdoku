import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { isPeripheral, unoccupiableCells } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { cormoranDef } from './premier-cas'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  armand: '0:5',
  helene: '1:4',
  victoire: '2:2',
  pascal: '5:3',
  oscar: '4:1',
}

const puzzle = loadPuzzle(cormoranDef)

describe('Le Cormoran — the board itself loads and validates', () => {
  it('parses into the 6x6 hull the plan draws, with four zones', () => {
    expect(puzzle.board.rows).toBe(6)
    expect(puzzle.board.cols).toBe(6)
    expect(puzzle.board.cells).toHaveLength(36)
    expect(puzzle.zones.map((z) => z.id).sort()).toEqual(['cabine', 'cuisine', 'pont', 'salon'])
  })

  it('carries multi-cell occupiable furniture, not just one-cell props', () => {
    const multiCell = puzzle.board.objects.filter((o) => o.occupiable && o.cells.length > 1)
    expect(multiCell.map((o) => o.id).sort()).toEqual(['banquette', 'barre', 'couchette', 'tableBasse'])
    expect(puzzle.board.objects.find((o) => o.id === 'couchette')!.cells).toHaveLength(2)
    expect(puzzle.board.objects.find((o) => o.id === 'barre')!.cells).toHaveLength(3)
  })

  it('has real windows, and validateModel accepted them because they sit on the hull', () => {
    const windows = puzzle.board.objects.filter((o) => o.type === 'window')
    expect(windows.map((o) => o.id).sort()).toEqual(['hublotBabord', 'hublotTribord'])
    for (const window of windows) {
      // §10/§42: the opening is in the hull, the cell in front of it is ordinary
      // floor — a window costs no standing room, unlike the stove next to it.
      expect(window.occupiable).toBe(true)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
    }
  })

  it('leaves window cells standable, and only the stove blocked', () => {
    expect([...unoccupiableCells(puzzle.board)]).toEqual(['3:1'])
    expect(unoccupiableCells(puzzle.board).has('1:5')).toBe(false)
    expect(unoccupiableCells(puzzle.board).has('4:0')).toBe(false)
  })

  it('refuses to load if a window is moved off the hull', () => {
    const inland = structuredClone(cormoranDef)
    inland.objects.find((o) => o.id === 'hublotTribord')!.cells = [{ row: 1, col: 4 }]
    expect(() => loadPuzzle(inland)).toThrow(/exterior/)
  })

  it('leaves capacity to spare: 5 people on a board that could hold 6', () => {
    expect(puzzle.people).toHaveLength(5)
    expect(Math.min(puzzle.board.rows, puzzle.board.cols)).toBe(6)
  })
})

describe('Le Cormoran — solved by propagation alone (§3)', () => {
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
    expect(new Set(rows).size).toBe(5)
    expect(new Set(cols).size).toBe(5)
  })

  it('reports it as solved through analyzeDifficulty too', () => {
    expect(analyzeDifficulty(puzzle).propagationStatus).toBe('solved')
  })
})

describe('Le Cormoran — the proof is a chain, not a flat pile of clues (§4)', () => {
  const report = analyzeDifficulty(puzzle)

  it('has keystones — steps the proof cannot survive without', () => {
    expect(report.keystones.length).toBeGreaterThan(0)
  })

  it('is genuinely chained: keystones drag other steps down with them', () => {
    // A flat puzzle (every clue self-resolving) still yields keystones, but each
    // cascade is a lone step. These two numbers are what actually separate a
    // chain from a pile: articulations exist, and the biggest cascade is deep.
    expect(report.articulationCount).toBeGreaterThan(0)
    expect(report.maxCascade).toBeGreaterThan(1)
    expect(report.maxChainDepth).toBeGreaterThan(1)
  })

  it('keeps Armand on three cells until the very last placement (§14)', () => {
    // "In his cabin, against the forward bulkhead" is three cells wide — the two
    // of the bunk plus one. Saying "on the bunk" would have pinned him the moment
    // Hélène landed; the spare cell is what holds the body back to the end.
    const journal = propagate(puzzle).journal
    const armandSteps = journal.filter((s) => s.personId === 'armand')
    expect(armandSteps.map((s) => s.after.length)).toEqual([2, 1, 1])

    const helenePlaced = journal.find((s) => s.personId === 'helene' && s.placed)!
    const pascalPlaced = journal.find((s) => s.personId === 'pascal' && s.placed)!
    expect(armandSteps[0].premises).toContain(helenePlaced.id)
    expect(armandSteps[1].premises).toContain(pascalPlaced.id)
  })

  it('places people in the order the chain forces, the body dead last (§14)', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['helene', 'oscar', 'victoire', 'pascal', 'armand'])
  })

  it('runs the chain Oscar -> Victoire -> Pascal -> Armand, each unlocked by the previous', () => {
    const journal = propagate(puzzle).journal
    const oscarPlaced = journal.find((s) => s.personId === 'oscar' && s.placed)!
    const victoireCut = journal.find((s) => s.personId === 'victoire' && s.technique === 'rowColElimination')!
    const victoirePlaced = journal.find((s) => s.personId === 'victoire' && s.placed)!
    const pascalCut = journal.find((s) => s.personId === 'pascal' && s.technique === 'rowColElimination')!

    expect(victoireCut.premises).toContain(oscarPlaced.id)
    expect(pascalCut.premises).toContain(victoirePlaced.id)

    // Strike Oscar's placement and three *other* people lose their proof with him.
    const oscarKeystone = report.keystones.find((k) => k.stepId === oscarPlaced.id)!
    expect(oscarKeystone.unprovenPeople.sort()).toEqual(['armand', 'oscar', 'pascal', 'victoire'])
  })

  it('needs more than one technique, including an intermediate one', () => {
    expect(report.techniqueCounts.lockedCandidates).toBeGreaterThan(0)
    expect(report.techniqueCounts.rowColElimination).toBeGreaterThan(0)
    expect(report.techniqueCounts.relationalFilter).toBeGreaterThan(0)
    expect(report.techniqueCounts.nakedSingle).toBeGreaterThan(0)
    expect(report.tier).toBe('intermediate')
  })
})

describe('Le Cormoran — exactly one solution (§6)', () => {
  it('finds one and only one placement, even when asked for two', () => {
    const solutions = solvePuzzle(puzzle, { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual(SOLUTION)
  })

  it('agrees with what propagation derived', () => {
    expect(solvePuzzle(puzzle, { limit: 2 })[0]).toEqual(propagate(puzzle).placements)
  })
})

describe('Le Cormoran — the murderer is derived, never stored (§5)', () => {
  it('names Hélène: she is the only other person left in the cabin', () => {
    const solution = solvePuzzle(puzzle, { limit: 2 })[0]
    expect(deriveMurderer(puzzle, solution)).toBe('helene')
  })

  it('is not stored anywhere in the authored case', () => {
    expect(Object.keys(cormoranDef)).not.toContain('murdererId')
    expect(Object.keys(cormoranDef)).not.toContain('solution')
  })

  it('puts exactly one other person in the victim zone, and the rest elsewhere', () => {
    const zoneOf = (personId: string) => {
      const [row, col] = SOLUTION[personId].split(':').map(Number)
      return puzzle.board.cellsByKey.get(`${row}:${col}`)!.zoneId
    }
    expect(zoneOf('armand')).toBe('cabine')
    expect(zoneOf('helene')).toBe('cabine')
    expect(zoneOf('victoire')).toBe('salon')
    expect(zoneOf('oscar')).toBe('cuisine')
    expect(zoneOf('pascal')).toBe('pont')
  })
})

describe('Le Cormoran — the clue vocabulary is varied (§7)', () => {
  it('uses far more than onObjectType', () => {
    const seen = new Set<string>()
    const walk = (c: Constraint) => {
      seen.add(c.type)
      if (c.type === 'not') walk(c.of)
    }
    for (const person of cormoranDef.people) for (const c of person.constraints) walk(c)

    expect([...seen].sort()).toEqual([
      'adjacentToObjectType',
      'alone',
      'direction',
      'distance',
      'inColumn',
      'inRow',
      'inZone',
      'not',
      'onObjectType',
      'withPerson',
    ])
  })

  it('gives the victim the lightest dossier of anyone', () => {
    const victim = cormoranDef.people.find((p) => p.id === cormoranDef.victimId)!
    expect(victim.isVictim).toBe(true)
    for (const other of cormoranDef.people.filter((p) => p.id !== cormoranDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThanOrEqual(victim.constraints.length)
    }
  })
})
