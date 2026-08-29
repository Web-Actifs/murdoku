import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { cellAt, isPeripheral } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { phareDef } from './le-phare-des-aiguilles'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  gaspard: '1:3',
  soizic: '3:1',
  armel: '0:2',
  noemie: '2:5',
  tanguy: '5:4',
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
    expect(multiCell.map((o) => o.id).sort()).toEqual(['bancDeQuart', 'litDeCamp', 'passerelle', 'tapisTresse'])
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
      expect(window.occupiable).toBe(false)
      expect(window.cells.length).toBe(2)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
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

  it('hangs almost the whole proof on one early step', () => {
    const journal = propagate(puzzle).journal
    const opening = journal.find((s) => s.personId === 'noemie')!
    const keystone = report.keystones.find((k) => k.stepId === opening.id)!
    expect(keystone).toBeDefined()
    // Withdraw the three-row gap between Noémie and Tanguy and nobody is left standing.
    expect(keystone.unprovenPeople.sort()).toEqual(['armel', 'gaspard', 'noemie', 'soizic', 'tanguy'])
    expect(keystone.cascade.length).toBeGreaterThan(journal.length / 2)
  })

  it('closes the oil store to everyone else before Soizic is even located', () => {
    const journal = propagate(puzzle).journal
    const exclusions = journal.filter((s) => s.technique === 'zoneExclusivity')
    expect(exclusions.length).toBeGreaterThan(0)
    for (const step of exclusions) {
      expect(step.reason).toEqual({ type: 'zoneClaimedAlone', by: 'soizic', zoneId: 'reserve' })
    }
    const soizicPlaced = journal.find((s) => s.personId === 'soizic' && s.placed)!
    expect(journal.indexOf(exclusions[0])).toBeLessThan(journal.indexOf(soizicPlaced))
  })

  it('resolves the victim next to last and the culprit dead last (§14)', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['soizic', 'armel', 'gaspard', 'tanguy', 'noemie'])
  })

  it('reaches the victim through Armel, and Armel through Soizic', () => {
    const journal = propagate(puzzle).journal
    const soizicPlaced = journal.find((s) => s.personId === 'soizic' && s.placed)!
    const armelCut = journal.find((s) => s.personId === 'armel' && s.technique === 'rowColElimination')!
    const armelPlaced = journal.find((s) => s.personId === 'armel' && s.placed)!
    const gaspardCut = journal.find((s) => s.personId === 'gaspard' && s.technique === 'rowColElimination')!

    expect(armelCut.premises).toContain(soizicPlaced.id)
    expect(gaspardCut.premises).toContain(armelPlaced.id)
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
    expect(zoneOf('armel')).toBe('veille')
    expect(zoneOf('soizic')).toBe('reserve')
    expect(zoneOf('tanguy')).toBe('machinerie')
  })
})

describe('Le phare des Aiguilles — the clue vocabulary is varied (§7)', () => {
  it('mixes zone, company, solitude, adjacency and two metric gaps', () => {
    const seen = new Set<string>()
    const walk = (c: Constraint) => {
      seen.add(c.type)
      if (c.type === 'not') walk(c.of)
    }
    for (const person of phareDef.people) for (const c of person.constraints) walk(c)

    expect([...seen].sort()).toEqual([
      'adjacentToObjectType',
      'alone',
      'direction',
      'distance',
      'inZone',
      'withPerson',
    ])
  })

  it('gives the victim the lightest dossier of anyone', () => {
    const victim = phareDef.people.find((p) => p.id === phareDef.victimId)!
    expect(victim.isVictim).toBe(true)
    for (const other of phareDef.people.filter((p) => p.id !== phareDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThanOrEqual(victim.constraints.length)
    }
  })
})
