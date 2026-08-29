import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { isPeripheral, unoccupiableCells } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { transalpinDef } from './la-nuit-du-transalpin'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  bertrand: '0:2',
  irina: '5:5',
  hugo: '2:4',
  margot: '3:3',
  stefan: '4:0',
}

const puzzle = loadPuzzle(transalpinDef)

describe('Le Transalpin — the board itself loads and validates', () => {
  it('parses into the 6x6 carriage the plan draws, three compartments and a corridor', () => {
    expect(puzzle.board.rows).toBe(6)
    expect(puzzle.board.cols).toBe(6)
    expect(puzzle.board.cells).toHaveLength(36)
    expect(puzzle.zones.map((z) => z.id).sort()).toEqual(['couloir', 'douze', 'onze', 'treize'])
  })

  it('carries multi-cell occupiable furniture, not just one-cell props', () => {
    const multiCell = puzzle.board.objects.filter((o) => o.occupiable && o.cells.length > 1)
    expect(multiCell.map((o) => o.id).sort()).toEqual(['banquetteTreize', 'couchetteDouze', 'couchetteOnze'])
  })

  it('repeats object types across compartments on purpose (§50)', () => {
    // Two couchettes, two windows, two trunks — in different zones. A clue about
    // "a couchette" therefore ranges over both of them, grid-wide, and never
    // designates a compartment on its own.
    const typeCount = (type: string) => puzzle.board.objects.filter((o) => o.type === type).length
    expect(typeCount('couchette')).toBe(2)
    expect(typeCount('window')).toBe(2)
    expect(typeCount('malle')).toBe(2)
    const couchetteZones = puzzle.board.objects
      .filter((o) => o.type === 'couchette')
      .map((o) => puzzle.board.cellsByKey.get(`${o.cells[0].row}:${o.cells[0].col}`)!.zoneId)
    expect(new Set(couchetteZones).size).toBe(2)
  })

  it('has real windows, and validateModel accepted them because they sit on the hull', () => {
    const windows = puzzle.board.objects.filter((o) => o.type === 'window')
    expect(windows.map((o) => o.id).sort()).toEqual(['fenetreOnze', 'fenetreTreize'])
    for (const window of windows) {
      // §10/§42: the pane is in the carriage wall; the cell is the floor in front
      // of it, and a passenger may perfectly well stand there.
      expect(window.occupiable).toBe(true)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
    }
  })

  it('keeps the window cells standable while the trunks and the samovar stay blocked', () => {
    const blocked = unoccupiableCells(puzzle.board)
    expect([...blocked].sort()).toEqual(['0:3', '3:5', '4:1', '4:3', '5:0'])
    expect(blocked.has('0:0')).toBe(false)
    expect(blocked.has('0:5')).toBe(false)
  })

  it('refuses to load if a window is moved off the hull', () => {
    const inland = structuredClone(transalpinDef)
    inland.objects.find((o) => o.id === 'fenetreOnze')!.cells = [{ row: 2, col: 1 }]
    expect(() => loadPuzzle(inland)).toThrow(/exterior/)
  })

  it('leaves capacity to spare: 5 people on a board that could hold 6', () => {
    expect(puzzle.people).toHaveLength(5)
    expect(Math.min(puzzle.board.rows, puzzle.board.cols)).toBe(6)
  })
})

describe('Le Transalpin — solved by propagation alone (§3)', () => {
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

describe('Le Transalpin — the proof is a chain, not a flat pile of clues (§4)', () => {
  const report = analyzeDifficulty(puzzle)

  it('has keystones, and they drag other steps down with them', () => {
    expect(report.keystones.length).toBeGreaterThan(0)
    expect(report.articulationCount).toBeGreaterThan(0)
    expect(report.maxCascade).toBeGreaterThan(1)
    expect(report.maxChainDepth).toBeGreaterThan(1)
  })

  it('places nobody until it has already made ten deductions', () => {
    const journal = propagate(puzzle).journal
    expect(journal.findIndex((s) => s.placed)).toBe(10)
  })

  it('hangs almost the whole proof on Hugo’s row, before anyone is placed', () => {
    const journal = propagate(puzzle).journal
    const opening = journal[0]
    expect(opening.reason).toEqual({ type: 'confinedToRow', confinedPerson: 'hugo', row: 2 })
    expect(opening.premises).toEqual([])

    const keystone = report.keystones.find((k) => k.stepId === opening.id)!
    expect(keystone.unprovenPeople.sort()).toEqual(['bertrand', 'hugo', 'irina', 'margot', 'stefan'])
    expect(keystone.cascade.length).toBeGreaterThan(journal.length * 0.8)
  })

  it('lets two witnesses locate themselves off the body without locating the body (§14)', () => {
    // Irina and Stefan both measure themselves against Bertrand. Arc-consistency
    // only ever trims the *speaker*, so those clues never cut the victim's own
    // domain — his cells fall to row/column elimination alone.
    const journal = propagate(puzzle).journal
    const bertrandSteps = journal.filter((s) => s.personId === 'bertrand')
    for (const step of bertrandSteps) {
      expect(['lockedCandidates', 'rowColElimination', 'nakedSingle']).toContain(step.technique)
    }
    expect(journal.some((s) => s.personId === 'irina' && s.reason.type === 'relational' && s.reason.other === 'bertrand')).toBe(true)
    expect(journal.some((s) => s.personId === 'stefan' && s.reason.type === 'relational' && s.reason.other === 'bertrand')).toBe(true)
  })

  it('narrows the body from eight cells to one, closing on the last living placement (§14)', () => {
    const journal = propagate(puzzle).journal
    const bertrandSteps = journal.filter((s) => s.personId === 'bertrand')
    expect(bertrandSteps[0].before).toHaveLength(8)
    expect(bertrandSteps.map((s) => s.after.length)).toEqual([6, 5, 3, 2, 1, 1])

    const stefanPlaced = journal.find((s) => s.personId === 'stefan' && s.placed)!
    const closing = bertrandSteps[bertrandSteps.length - 2]
    expect(closing.reason).toEqual({ type: 'colTaken', by: 'stefan', col: 0 })
    expect(closing.premises).toContain(stefanPlaced.id)
  })

  it('places people in the order the chain forces, the body dead last (§14)', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['margot', 'irina', 'hugo', 'stefan', 'bertrand'])
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
    expect(report.category).toBe('advanced')
  })
})

describe('Le Transalpin — exactly one solution (§6)', () => {
  it('finds one and only one placement, even when asked for two', () => {
    const solutions = solvePuzzle(puzzle, { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual(SOLUTION)
  })

  it('agrees with what propagation derived', () => {
    expect(solvePuzzle(puzzle, { limit: 2 })[0]).toEqual(propagate(puzzle).placements)
  })
})

describe('Le Transalpin — the murderer is derived, never stored (§5)', () => {
  it('names Margot: she is the only other person left in compartment 12', () => {
    const solution = solvePuzzle(puzzle, { limit: 2 })[0]
    expect(deriveMurderer(puzzle, solution)).toBe('margot')
  })

  it('is not stored anywhere in the authored case', () => {
    expect(Object.keys(transalpinDef)).not.toContain('murdererId')
    expect(Object.keys(transalpinDef)).not.toContain('solution')
  })

  it('puts exactly one other person in the victim zone, and the rest elsewhere', () => {
    const zoneOf = (personId: string) => puzzle.board.cellsByKey.get(SOLUTION[personId])!.zoneId
    expect(zoneOf('bertrand')).toBe('douze')
    expect(zoneOf('margot')).toBe('douze')
    expect(zoneOf('irina')).toBe('couloir')
    expect(zoneOf('hugo')).toBe('treize')
    expect(zoneOf('stefan')).toBe('onze')
  })
})

describe('Le Transalpin — the clue vocabulary is varied (§7)', () => {
  it('uses relations, a denial and the furniture, not just coordinates', () => {
    const seen = new Set<string>()
    const walk = (c: Constraint) => {
      seen.add(c.type)
      if (c.type === 'not') walk(c.of)
    }
    for (const person of transalpinDef.people) for (const c of person.constraints) walk(c)

    expect([...seen].sort()).toEqual([
      'adjacentToObjectType',
      'direction',
      'distance',
      'inColumn',
      'inRow',
      'inZone',
      'not',
    ])
  })

  it('gives the victim the lightest dossier of anyone', () => {
    const victim = transalpinDef.people.find((p) => p.id === transalpinDef.victimId)!
    expect(victim.isVictim).toBe(true)
    for (const other of transalpinDef.people.filter((p) => p.id !== transalpinDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThanOrEqual(victim.constraints.length)
    }
  })
})
