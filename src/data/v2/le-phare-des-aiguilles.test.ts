import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { cellAt, isPeripheral, onObjectCells, unoccupiableCells } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { phareDef } from './le-phare-des-aiguilles'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  gaspard: '0:5',
  soizic: '2:0',
  armel: '5:3',
  noemie: '3:4',
  tanguy: '4:1',
}

const puzzle = loadPuzzle(phareDef)

describe('Le phare des Aiguilles — the board itself loads and validates', () => {
  it('parses into a 6x6 hull with the stairwell punched out of it', () => {
    expect(puzzle.board.rows).toBe(6)
    expect(puzzle.board.cols).toBe(6)
    expect(puzzle.board.cells).toHaveLength(34)
    expect(cellAt(puzzle.board, 2, 3)).toBeUndefined()
    expect(cellAt(puzzle.board, 3, 3)).toBeUndefined()
    expect(puzzle.zones.map((z) => z.id).sort()).toEqual(['logement', 'machinerie', 'reserve', 'veille'])
  })

  it('treats the cells around the void as exterior, the way a real shaft would', () => {
    // isPeripheral is a "has a missing neighbour" test, not a bounding box — so
    // the stairwell makes its own inner edge, in the middle of the grid.
    expect(isPeripheral(puzzle.board, { row: 2, col: 2 })).toBe(true)
    expect(isPeripheral(puzzle.board, { row: 1, col: 1 })).toBe(false)
  })

  it('carries multi-cell occupiable furniture, not just one-cell props', () => {
    const multiCell = puzzle.board.objects.filter((o) => o.occupiable && o.cells.length > 1)
    expect(multiCell.map((o) => o.id).sort()).toEqual([
      'baieDuLevant',
      'bancDeQuart',
      'litDeCamp',
      'lucarneNord',
      'passerelle',
      'tapisTresse',
    ])
    expect(puzzle.board.objects.find((o) => o.id === 'passerelle')!.cells).toHaveLength(3)
  })

  it('puts two objects of type "table" in two different rooms, on purpose (§50)', () => {
    const tables = puzzle.board.objects.filter((o) => o.type === 'table')
    expect(tables.map((o) => o.id).sort()).toEqual(['etabli', 'tableDesCartes'])
    const zones = tables.map((o) => puzzle.board.cellsByKey.get(`${o.cells[0].row}:${o.cells[0].col}`)!.zoneId)
    expect(new Set(zones)).toEqual(new Set(['veille', 'reserve']))
  })

  it('has real windows, and validateModel accepted them because they sit on the hull', () => {
    const windows = puzzle.board.objects.filter((o) => o.type === 'window')
    expect(windows.map((o) => o.id).sort()).toEqual(['baieDuLevant', 'lucarneNord'])
    for (const window of windows) {
      // §10/§42: two panes set in the tower wall — the two cells each names are
      // the floor a keeper stands on to look out, and stay perfectly occupiable.
      expect(window.occupiable).toBe(true)
      expect(window.cells.length).toBe(2)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
    }
  })

  it('lets a person stand in front of a window — the body itself does (§10)', () => {
    const lucarne = puzzle.board.objects.find((o) => o.id === 'lucarneNord')!
    expect(onObjectCells(puzzle.board, lucarne).map((c) => `${c.row}:${c.col}`)).toEqual(['0:4', '0:5'])
    expect(unoccupiableCells(puzzle.board).has(SOLUTION.gaspard)).toBe(false)
    expect(lucarne.cells.some((c) => `${c.row}:${c.col}` === SOLUTION.gaspard)).toBe(true)
  })

  it('blocks the vats, the tables, the stove and the generator — never the panes', () => {
    const blocked = unoccupiableCells(puzzle.board)
    expect([...blocked].sort()).toEqual(['1:2', '1:5', '3:0', '4:0', '4:3', '4:4', '5:2', '2:2'].sort())
    for (const window of puzzle.board.objects.filter((o) => o.type === 'window')) {
      for (const cell of window.cells) expect(blocked.has(`${cell.row}:${cell.col}`)).toBe(false)
    }
  })

  it('refuses to load if a window is moved off the hull', () => {
    const inland = structuredClone(phareDef)
    inland.objects.find((o) => o.id === 'baieDuLevant')!.cells = [{ row: 1, col: 1 }]
    expect(() => loadPuzzle(inland)).toThrow(/exterior/)
  })

  it('leaves capacity to spare: 5 people on a board that could hold 6', () => {
    expect(puzzle.people).toHaveLength(5)
    expect(Math.min(puzzle.board.rows, puzzle.board.cols)).toBe(6)
  })
})

describe('Le phare des Aiguilles — solved by propagation alone (§3)', () => {
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
})

describe('Le phare des Aiguilles — the proof is one long chain (§4)', () => {
  const report = analyzeDifficulty(puzzle)

  it('has keystones, and they drag other steps down with them', () => {
    expect(report.keystones.length).toBeGreaterThan(0)
    expect(report.articulationCount).toBeGreaterThan(0)
    expect(report.maxCascade).toBeGreaterThan(1)
    expect(report.maxChainDepth).toBeGreaterThan(1)
  })

  it('hangs almost the whole proof on the three opening locks, before anyone is placed', () => {
    const journal = propagate(puzzle).journal
    expect(journal.findIndex((s) => s.placed)).toBe(11)
    for (const step of journal.slice(0, 4)) {
      expect(step.reason).toEqual({ type: 'confinedToRow', confinedPerson: 'armel', row: 5 })
    }

    const biggest = report.keystones.reduce((a, b) => (b.cascade.length > a.cascade.length ? b : a))
    expect(biggest.unprovenPeople.sort()).toEqual(['armel', 'gaspard', 'noemie', 'soizic', 'tanguy'])
    expect(biggest.cascade.length).toBeGreaterThan(journal.length * 0.75)
  })

  it('empties three rooms for Soizic before she is located, then closes hers (§13)', () => {
    const journal = propagate(puzzle).journal
    const soizicPlaced = journal.find((s) => s.personId === 'soizic' && s.placed)!

    const taken = journal.filter((s) => s.reason.type === 'zoneTaken')
    expect(taken.map((s) => (s.reason as { zoneId: string }).zoneId)).toEqual(['logement', 'reserve', 'machinerie'])
    for (const step of taken) {
      expect(step.personId).toBe('soizic')
      expect(journal.indexOf(step)).toBeLessThan(journal.indexOf(soizicPlaced))
    }

    const claimed = journal.find((s) => s.reason.type === 'zoneClaimedAlone')!
    expect(claimed.reason).toEqual({ type: 'zoneClaimedAlone', by: 'soizic', zoneId: 'veille' })
    expect(journal.indexOf(claimed)).toBeGreaterThan(journal.indexOf(soizicPlaced))
  })

  it('places people in the order the chain forces, the body dead last (§14)', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['armel', 'soizic', 'noemie', 'tanguy', 'gaspard'])
  })

  it('narrows the clue-less body from 26 cells to 1, purely by elimination (§14)', () => {
    // Gaspard carries no clue at all: nothing can ever filter his domain directly.
    // Two witnesses measure themselves against him, but arc-consistency only trims
    // the speaker — so every cell he loses is a row, a column or a room someone
    // else has taken, and the last one falls on the last living placement.
    const journal = propagate(puzzle).journal
    expect(phareDef.people.find((p) => p.id === 'gaspard')!.constraints).toEqual([])

    const steps = journal.filter((s) => s.personId === 'gaspard')
    expect(steps[0].before).toHaveLength(26)
    expect(steps.map((s) => s.after.length)).toEqual([21, 17, 12, 8, 7, 5, 3, 1, 1])
    for (const step of steps) {
      expect(['lockedCandidates', 'rowColElimination', 'zoneExclusivity', 'nakedSingle']).toContain(step.technique)
    }

    const tanguyPlaced = journal.find((s) => s.personId === 'tanguy' && s.placed)!
    const closing = steps[steps.length - 2]
    expect(closing.reason).toEqual({ type: 'rowTaken', by: 'tanguy', row: 4 })
    expect(closing.premises).toContain(tanguyPlaced.id)
  })

  it('needs four techniques, two of them above the basic tier', () => {
    expect(report.techniqueCounts.rowColElimination).toBeGreaterThan(0)
    expect(report.techniqueCounts.lockedCandidates).toBeGreaterThan(0)
    expect(report.techniqueCounts.relationalFilter).toBeGreaterThan(0)
    expect(report.techniqueCounts.zoneExclusivity).toBeGreaterThan(0)
    expect(report.techniqueCounts.nakedSingle).toBeGreaterThan(0)
    expect(report.tier).toBe('intermediate')
  })

  it('lands on the difficulty this case is published at (§56.9)', () => {
    expect(report.propagationStatus).toBe('solved')
    expect(report.category).toBe('advanced')
  })

  it('is the deepest of the V2 cases so far', () => {
    expect(report.maxChainDepth).toBeGreaterThanOrEqual(10)
  })
})

describe('Le phare des Aiguilles — exactly one solution (§6)', () => {
  it('finds one and only one placement, even when asked for two', () => {
    const solutions = solvePuzzle(puzzle, { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual(SOLUTION)
  })

  it('agrees with what propagation derived', () => {
    expect(solvePuzzle(puzzle, { limit: 2 })[0]).toEqual(propagate(puzzle).placements)
  })
})

describe('Le phare des Aiguilles — the murderer is derived, never stored (§5)', () => {
  it('names Noémie: she is the only other person left in the keeper’s quarters', () => {
    const solution = solvePuzzle(puzzle, { limit: 2 })[0]
    expect(deriveMurderer(puzzle, solution)).toBe('noemie')
  })

  it('is not stored anywhere in the authored case', () => {
    expect(Object.keys(phareDef)).not.toContain('murdererId')
    expect(Object.keys(phareDef)).not.toContain('solution')
  })

  it('puts exactly one other person in the victim zone, and the rest elsewhere', () => {
    const zoneOf = (personId: string) => puzzle.board.cellsByKey.get(SOLUTION[personId])!.zoneId
    expect(zoneOf('gaspard')).toBe('logement')
    expect(zoneOf('noemie')).toBe('logement')
    expect(zoneOf('armel')).toBe('machinerie')
    expect(zoneOf('soizic')).toBe('veille')
    expect(zoneOf('tanguy')).toBe('reserve')
  })
})

describe('Le phare des Aiguilles — the clue vocabulary is varied (§7)', () => {
  it('mixes solitude, a denied room, a landmark and two metric gaps', () => {
    const seen = new Set<string>()
    const walk = (c: Constraint) => {
      seen.add(c.type)
      if (c.type === 'not') walk(c.of)
    }
    for (const person of phareDef.people) for (const c of person.constraints) walk(c)

    expect([...seen].sort()).toEqual(['alone', 'distance', 'inColumn', 'inZone', 'not', 'onObjectType'])
  })

  it('gives the victim no dossier at all — the purest reading of §14', () => {
    const victim = phareDef.people.find((p) => p.id === phareDef.victimId)!
    expect(victim.isVictim).toBe(true)
    expect(victim.constraints).toEqual([])
    for (const other of phareDef.people.filter((p) => p.id !== phareDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThan(0)
    }
  })
})
