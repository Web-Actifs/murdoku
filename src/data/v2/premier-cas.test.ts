import { describe, expect, it } from 'vitest'
import { rowColClash, violatedConstraints } from '../../core/constraints/domain'
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
  victoire: '2:1',
  pascal: '5:3',
  oscar: '4:0',
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

  it('holds Armand on a wide domain until the very last placement (§14)', () => {
    // His whole dossier is "found in his cabin" — nine cells. Nothing else is
    // ever said about him, so every cut he takes is somebody else's row or
    // column arriving; the body cannot close before the living do.
    const journal = propagate(puzzle).journal
    const armandSteps = journal.filter((s) => s.personId === 'armand')
    expect(armandSteps.map((s) => s.after.length)).toEqual([6, 3, 2, 1, 1])

    // Since the 2026-08-31 de-mirroring (see the file docstring), Pascal's
    // second-to-last cell isn't taken by his *placed* column but by his domain
    // already being confined to one column (locked candidates) — he isn't
    // individually placed until later still, once Oscar's row also lands.
    const pascalColLock = journal.find((s) => s.personId === 'pascal' && s.technique === 'relationalFilter')!
    const helenePlaced = journal.find((s) => s.personId === 'helene' && s.placed)!
    expect(armandSteps[2].premises).toContain(pascalColLock.id)
    expect(armandSteps[3].premises).toContain(helenePlaced.id)
  })

  it('places people in the order the chain forces, the culprit then the body last (§14)', () => {
    const placed = propagate(puzzle)
      .journal.filter((s) => s.placed)
      .map((s) => s.personId)
    expect(placed).toEqual(['victoire', 'oscar', 'helene', 'pascal', 'armand'])
  })

  it('runs the chain — Victoire and Oscar each resolve off an unplaced partner’s domain, Pascal needs both placed', () => {
    const journal = propagate(puzzle).journal
    // Victoire's own cut needs nobody placed yet: Oscar's window-only domain
    // (two cells, wherever they end up) already rules out every column but one.
    const victoireCut = journal.find((s) => s.personId === 'victoire' && s.technique === 'relationalFilter')!
    expect(victoireCut.premises).toEqual([])
    const victoirePlaced = journal.find((s) => s.personId === 'victoire' && s.placed)!

    // Oscar's cut is symmetric: it needs Hélène's row locked, not Hélène placed.
    const heleneRowLock = journal.find((s) => s.personId === 'helene' && s.technique === 'relationalFilter' && s.reason.type === 'relational' && s.reason.constraintType === 'direction')!
    const oscarCut = journal.find((s) => s.personId === 'oscar' && s.technique === 'lockedCandidates')!
    expect(oscarCut.premises).toContain(heleneRowLock.id)
    const oscarPlaced = journal.find((s) => s.personId === 'oscar' && s.placed)!

    // Pascal is the one who genuinely needs two *placements*: Victoire's, to
    // confine his column; Oscar's, to rule out the row that column still spans.
    const pascalColLock = journal.find((s) => s.personId === 'pascal' && s.technique === 'relationalFilter')!
    const pascalFinalCut = journal.find((s) => s.personId === 'pascal' && s.technique === 'rowColElimination')!
    expect(pascalColLock.premises).toContain(victoirePlaced.id)
    expect(pascalFinalCut.premises).toContain(oscarPlaced.id)

    // Hélène has an earlier `lockedCandidates` step too (the opening row-2
    // reservation, shared with everyone) — her *own* final cut is the later one,
    // confined to Pascal's column specifically.
    const heleneCut = journal.find((s) => s.personId === 'helene' && s.technique === 'lockedCandidates' && s.reason.type === 'confinedToCol')!
    expect(heleneCut.premises).toContain(pascalColLock.id)

    // Strike Victoire's own resolving step and Pascal, Hélène and Armand all
    // lose their proof with her — but not Oscar, who never needed her at all.
    const victoireKeystone = report.keystones.find((k) => k.stepId === victoireCut.id)!
    expect(victoireKeystone.unprovenPeople.sort()).toEqual(['armand', 'helene', 'victoire'])
  })

  it('needs more than one technique, including an intermediate one', () => {
    expect(report.techniqueCounts.lockedCandidates).toBeGreaterThan(0)
    expect(report.techniqueCounts.rowColElimination).toBeGreaterThan(0)
    expect(report.techniqueCounts.relationalFilter).toBeGreaterThan(0)
    expect(report.techniqueCounts.nakedSingle).toBeGreaterThan(0)
    expect(report.tier).toBe('intermediate')
  })
})

describe('Le Cormoran — every clue is load-bearing', () => {
  /**
   * The regression this file exists to prevent. The hand-written version of this
   * case carried fifteen clues, six of which the proof never used: the player
   * read them, re-read them, and nothing they did with them moved the grid. The
   * generated cases are minimal by construction (grow, then prune); this asserts
   * the hand-kept one is held to the same standard.
   */
  const withoutClue = (personId: string, index: number) => {
    const trimmed = structuredClone(cormoranDef)
    trimmed.people.find((p) => p.id === personId)!.constraints.splice(index, 1)
    return loadPuzzle(trimmed)
  }

  it.each(cormoranDef.people.flatMap((p) => p.constraints.map((_, index) => [p.id, index] as const)))(
    'breaks when %s drops clue %i',
    (personId, index) => {
      const weakened = withoutClue(personId, index)
      const stillSolves = propagate(weakened).status === 'solved'
      const stillUnique = solvePuzzle(weakened, { limit: 2 }).length === 1
      expect(stillSolves && stillUnique).toBe(false)
    },
  )

  it('carries nine clues in all, and the victim only one of them', () => {
    expect(cormoranDef.people.reduce((n, p) => n + p.constraints.length, 0)).toBe(9)
    expect(cormoranDef.people.find((p) => p.id === 'armand')!.constraints).toHaveLength(1)
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

describe('Le Cormoran — explaining a wrong guess (playtest report, 2026-08-31)', () => {
  /**
   * The original report: a player placed Oscar next to a window and was told
   * "wrong" with no explanation — confusing, since "adjacentToObjectType:
   * window" was grid-wide (any window's neighbour) and *did* look satisfied.
   * The follow-up report showed the deeper issue: the player's own reading of
   * "at the window" (Oscar's own cell, not a neighbouring one) was the more
   * natural one, and matched what claude.md actually specifies as a distinct
   * relation (§10/§52, `inFrontOfObjectType`) — Oscar now carries that instead,
   * and it alone. Its own gotcha survives the fix: it is still grid-wide across
   * *both* windows (constraints/types.ts), so the other one is still a
   * plausible-looking wrong guess — one his single clue never rules out at all,
   * which is exactly why the row/column fallback exists.
   */
  it('does not blame the window clue for a guess that still satisfies it — the clash is a row/column collision instead', () => {
    const guess = { ...SOLUTION, oscar: '1:5' } // in front of hublotTribord, the other window — shares Armand's column and Hélène's row
    const oscar = puzzle.people.find((p) => p.id === 'oscar')!
    const cell = puzzle.board.cellsByKey.get('1:5')!
    expect(violatedConstraints(oscar.constraints, cell, guess, puzzle.board, puzzle.people)).toEqual([])
    expect(rowColClash('oscar', cell, guess, puzzle.board)).toEqual({ axis: 'col', with: 'armand' })
  })

  it('blames the table-basse clue directly when Victoire is off the table entirely', () => {
    const guess = { ...SOLUTION, victoire: '0:1' } // salon, but not on tableBasse
    const victoire = puzzle.people.find((p) => p.id === 'victoire')!
    const cell = puzzle.board.cellsByKey.get('0:1')!
    const broken = violatedConstraints(victoire.constraints, cell, guess, puzzle.board, puzzle.people)
    expect(broken.map((c) => c.type)).toEqual(['onObjectType'])
  })

  it('falls back to a row/column clash when a guess satisfies its own clues but collides with someone else', () => {
    // Hélène's own clues (with Armand, south of him, not rightmost) still hold
    // at 2:3 — the only thing wrong is that Victoire's real cell already owns row 2.
    const guess = { ...SOLUTION, helene: '2:3' }
    const cell = puzzle.board.cellsByKey.get('2:3')!
    const helene = puzzle.people.find((p) => p.id === 'helene')!
    expect(violatedConstraints(helene.constraints, cell, guess, puzzle.board, puzzle.people)).toEqual([])
    expect(rowColClash('helene', cell, guess, puzzle.board)).toEqual({ axis: 'row', with: 'victoire' })
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

    expect([...seen].sort()).toEqual(['direction', 'distance', 'inColumn', 'inFrontOfObjectType', 'inZone', 'not', 'onObjectType', 'withPerson'])
  })

  it('never repeats a clue kind inside one dossier', () => {
    // Two clues of the same shape on the same witness is what reads as filler,
    // even when both are load-bearing.
    for (const person of cormoranDef.people) {
      const kinds = person.constraints.map((c) => (c.type === 'not' ? `not.${c.of.type}` : c.type))
      expect(new Set(kinds).size).toBe(kinds.length)
    }
  })

  it('gives the victim the lightest dossier of anyone', () => {
    const victim = cormoranDef.people.find((p) => p.id === cormoranDef.victimId)!
    expect(victim.isVictim).toBe(true)
    for (const other of cormoranDef.people.filter((p) => p.id !== cormoranDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThanOrEqual(victim.constraints.length)
    }
  })
})
