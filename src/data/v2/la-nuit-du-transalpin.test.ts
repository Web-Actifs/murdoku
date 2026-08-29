import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { isPeripheral } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { transalpinDef } from './la-nuit-du-transalpin'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  bertrand: '3:3',
  irina: '4:4',
  hugo: '1:5',
  margot: '0:2',
  stefan: '2:1',
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
      expect(window.occupiable).toBe(false)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
    }
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

  it('places nobody until it has already made half a dozen deductions', () => {
    const journal = propagate(puzzle).journal
    expect(journal.findIndex((s) => s.placed)).toBeGreaterThanOrEqual(6)
  })

  it('pins the victim through the journalist, while she herself is still floating (§33)', () => {
    const journal = propagate(puzzle).journal
    // Margot is squeezed twice — once by Hugo's row, once by Stefan's — before
    // what is left of her fits in a single column.
    const margotConfinements = journal
      .filter((s) => s.personId === 'margot' && s.technique === 'lockedCandidates')
      .map((s) => s.id)
    const bertrandCut = journal.find((s) => s.personId === 'bertrand' && s.reason.type === 'confinedToCol')!
    const bertrandPlaced = journal.find((s) => s.personId === 'bertrand' && s.placed)!
    const margotPlaced = journal.find((s) => s.personId === 'margot' && s.placed)!

    expect(margotConfinements.length).toBeGreaterThanOrEqual(2)
    expect(bertrandCut.reason).toEqual({ type: 'confinedToCol', confinedPerson: 'margot', col: 2 })
    expect(margotConfinements.some((id) => bertrandCut.premises.includes(id))).toBe(true)
    expect(bertrandPlaced.premises).toContain(bertrandCut.id)
    // The victim resolves off a suspect who is only placed afterwards.
    expect(journal.indexOf(bertrandPlaced)).toBeLessThan(journal.indexOf(margotPlaced))
  })

  it('runs Irina -> Hugo: "with Hugo" locks a column before Hugo is known', () => {
    const journal = propagate(puzzle).journal
    const irinaWith = journal.find(
      (s) => s.personId === 'irina' && s.reason.type === 'relational' && s.reason.constraintType === 'withPerson',
    )!
    const hugoCut = journal.find((s) => s.personId === 'hugo' && s.technique === 'lockedCandidates')!
    expect(hugoCut.premises).toContain(irinaWith.id)

    const hugoPlaced = journal.find((s) => s.personId === 'hugo' && s.placed)!
    const hugoKeystone = report.keystones.find((k) => k.stepId === hugoPlaced.id)
    expect(hugoKeystone).toBeDefined()
  })

  it('places people in the order the chain forces, not the order they are written', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['hugo', 'bertrand', 'margot', 'stefan', 'irina'])
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
    expect(zoneOf('irina')).toBe('treize')
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
      'inRow',
      'inZone',
      'not',
      'onObjectType',
      'withPerson',
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
