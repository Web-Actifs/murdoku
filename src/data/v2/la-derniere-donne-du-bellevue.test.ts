import { describe, expect, it } from 'vitest'
import type { Constraint } from '../../core/constraints/types'
import { findMirroredTestimony } from '../../core/constraints/relations'
import { isPeripheral, unoccupiableCells } from '../../core/model/geometry'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import type { Assignment } from '../../core/model/types'
import { propagate } from '../../core/possibility/propagate'
import { analyzeDifficulty } from '../../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../../core/solve/solver'
import { bellevueDef } from './la-derniere-donne-du-bellevue'

/** The one and only placement — asserted cell by cell, never inferred from the code under test. */
const SOLUTION: Assignment = {
  lucien: '8:6',
  odile: '1:0',
  gaston: '2:4',
  berthe: '5:2',
  marcel: '4:3',
  nina: '7:7',
  theo: '3:5',
  sylvain: '6:1',
}

const puzzle = loadPuzzle(bellevueDef)

describe('La dernière donne du Bellevue — the board itself loads and validates', () => {
  it('parses into a full 9x9 floor, the largest V2 board so far', () => {
    expect(puzzle.board.rows).toBe(9)
    expect(puzzle.board.cols).toBe(9)
    expect(puzzle.board.cells).toHaveLength(81)
  })

  it('carries eight rooms, twice what the earlier cases run', () => {
    expect(puzzle.zones.map((z) => z.id).sort()).toEqual([
      'baccara',
      'bar',
      'caisse',
      'fumoir',
      'galerie',
      'office',
      'roulette',
      'vestiaire',
    ])
  })

  it('furnishes the house with twenty pieces, fifteen of them spanning several cells', () => {
    expect(puzzle.board.objects).toHaveLength(20)
    expect(puzzle.board.objects.filter((o) => o.cells.length > 1)).toHaveLength(15)
    expect(puzzle.board.objects.filter((o) => o.occupiable && o.cells.length > 1).map((o) => o.id).sort()).toEqual([
      'baieDuPerron',
      'bancDuFumoir',
      'bancDuVestiaire',
      'banquetteDesJoueurs',
      'banquetteDuBar',
      'grandesBaies',
      'tapisDeLaGalerie',
      'tapisDeLaRoulette',
    ])
  })

  it('bends the bar counter around a corner — a footprint no straight run can describe', () => {
    const comptoir = puzzle.board.objects.find((o) => o.id === 'comptoirDuBar')!
    expect(comptoir.cells).toEqual([
      { row: 5, col: 0 },
      { row: 6, col: 0 },
      { row: 7, col: 0 },
      { row: 7, col: 1 },
    ])
    // Neither one row nor one column: V2ObjectArt has to draw it in 'plan' mode.
    expect(new Set(comptoir.cells.map((c) => c.row)).size).toBeGreaterThan(1)
    expect(new Set(comptoir.cells.map((c) => c.col)).size).toBeGreaterThan(1)
  })

  it('doubles seven object types across two rooms each, on purpose (§50)', () => {
    const byType = new Map<string, string[]>()
    for (const o of puzzle.board.objects) byType.set(o.type, [...(byType.get(o.type) ?? []), o.id])

    const doubled = [...byType].filter(([, ids]) => ids.length > 1).map(([type, ids]) => [type, ids.sort()])
    expect(doubled.sort()).toEqual([
      ['banc', ['bancDuFumoir', 'bancDuVestiaire']],
      ['banquette', ['banquetteDesJoueurs', 'banquetteDuBar']],
      ['malle', ['coffreDeLaCaisse', 'malleDuVestiaire']],
      ['plante', ['palmierDeLaRoulette', 'palmierDuBaccara']],
      ['table', ['tableDeBaccara', 'tableDeRoulette']],
      ['tapis', ['tapisDeLaGalerie', 'tapisDeLaRoulette']],
      ['window', ['baieDuPerron', 'grandesBaies']],
    ])

    // Every doubled pair straddles two different rooms, which is what makes an
    // object-type clue insufficient to name a room on its own.
    for (const [, ids] of doubled as [string, string[]][]) {
      const zones = ids.map((id) => {
        const cell = puzzle.board.objects.find((o) => o.id === id)!.cells[0]
        return puzzle.board.cellsByKey.get(`${cell.row}:${cell.col}`)!.zoneId
      })
      expect(new Set(zones).size).toBe(2)
    }
  })

  it('has real windows, and validateModel accepted them because they sit on the hull', () => {
    const windows = puzzle.board.objects.filter((o) => o.type === 'window')
    expect(windows.map((o) => o.id).sort()).toEqual(['baieDuPerron', 'grandesBaies'])
    for (const window of windows) {
      // §10/§42: the panes are in the wall — their cells are the floor a person
      // stands on to look out, and stay perfectly occupiable.
      expect(window.occupiable).toBe(true)
      for (const cell of window.cells) expect(isPeripheral(puzzle.board, cell)).toBe(true)
    }
  })

  it('refuses to load if a window is moved off the hull', () => {
    const inland = structuredClone(bellevueDef)
    inland.objects.find((o) => o.id === 'baieDuPerron')!.cells = [{ row: 2, col: 2 }]
    expect(() => loadPuzzle(inland)).toThrow(/exterior/)
  })

  it('blocks the tables, the counter, the safe and the range — never the panes or the rugs', () => {
    const blocked = unoccupiableCells(puzzle.board)
    expect([...blocked].sort()).toEqual(
      [
        '0:4',
        '1:1',
        '1:2',
        '1:3',
        '1:6',
        '1:7',
        '2:5',
        '5:0',
        '5:8',
        '6:0',
        '6:3',
        '6:4',
        '6:5',
        '6:8',
        '7:0',
        '7:1',
        '7:3',
        '7:8',
        '8:3',
        '8:4',
        '8:8',
      ].sort(),
    )
    for (const object of puzzle.board.objects.filter((o) => o.type === 'window' || o.type === 'tapis')) {
      for (const cell of object.cells) expect(blocked.has(`${cell.row}:${cell.col}`)).toBe(false)
    }
  })

  it('leaves capacity to spare: 8 people on a board that could hold 9', () => {
    expect(puzzle.people).toHaveLength(8)
    expect(Math.min(puzzle.board.rows, puzzle.board.cols)).toBe(9)
  })
})

describe('La dernière donne du Bellevue — solved by propagation alone (§3)', () => {
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
    expect(new Set(rows).size).toBe(8)
    expect(new Set(cols).size).toBe(8)
  })
})

describe('La dernière donne du Bellevue — the proof is one long chain (§4)', () => {
  const report = analyzeDifficulty(puzzle)
  const journal = propagate(puzzle).journal

  it('runs sixty deductions, and hangs fifty-two of them on one step', () => {
    expect(journal).toHaveLength(60)
    expect(report.deductionCount).toBe(60)

    const biggest = report.keystones.reduce((a, b) => (b.cascade.length > a.cascade.length ? b : a))
    expect(biggest.cascade).toHaveLength(52)
    // Pull that one step and nobody at all is left with a proven placement.
    expect(biggest.unprovenPeople.sort()).toEqual([
      'berthe',
      'gaston',
      'lucien',
      'marcel',
      'nina',
      'odile',
      'sylvain',
      'theo',
    ])
  })

  it('opens on two locks and puts the cashier down on the second step of sixty', () => {
    expect(journal.findIndex((s) => s.placed)).toBe(2)

    // The two opening cuts, both before anyone is on the board: the doorman's
    // "further north than the inspector" against the inspector's two rugs, then
    // the cashier's own pair closing on a single cell.
    expect(journal[0].personId).toBe('gaston')
    expect(journal[0].technique).toBe('relationalFilter')
    expect([journal[0].before.length, journal[0].after.length]).toEqual([43, 16])
    expect(journal[1].personId).toBe('berthe')
    expect([journal[1].before.length, journal[1].after.length]).toEqual([5, 1])
    expect(journal[2].placed).toBe(SOLUTION.berthe)
  })

  it('empties the roulette room for four people before its only occupant is placed (§13)', () => {
    const theoPlaced = journal.find((s) => s.personId === 'theo' && s.placed)!

    // Gaston is committed to the baccarat room while still spread over sixteen
    // cells; that alone shuts it to Théo, who claims to have been on his own.
    const taken = journal.filter((s) => s.reason.type === 'zoneTaken')
    expect(taken).toHaveLength(1)
    expect(taken[0].personId).toBe('theo')
    expect(taken[0].reason).toEqual({ type: 'zoneTaken', by: 'gaston', zoneId: 'baccara' })

    // Théo is then confined to the roulette room, and his solitude closes it to
    // four other people — the body included — long before he himself is placed.
    const claimed = journal.filter((s) => s.reason.type === 'zoneClaimedAlone')
    expect(claimed.map((s) => s.personId)).toEqual(['lucien', 'odile', 'marcel', 'nina'])
    for (const step of claimed) {
      expect(step.reason).toEqual({ type: 'zoneClaimedAlone', by: 'theo', zoneId: 'roulette' })
      expect(journal.indexOf(step)).toBeLessThan(journal.indexOf(theoPlaced))
    }
  })

  it('lets two unplaced witnesses reserve a column for themselves (lockedCandidates)', () => {
    const locked = journal.filter((s) => s.technique === 'lockedCandidates')
    expect(locked.map((s) => [s.personId, s.reason])).toEqual([
      ['lucien', { type: 'confinedToCol', confinedPerson: 'sylvain', col: 1 }],
      ['gaston', { type: 'confinedToCol', confinedPerson: 'sylvain', col: 1 }],
      ['nina', { type: 'confinedToCol', confinedPerson: 'sylvain', col: 1 }],
      ['lucien', { type: 'confinedToCol', confinedPerson: 'nina', col: 7 }],
    ])
    // Sylvain reserves column 1 and thereby places Gaston, several steps before
    // anything places Sylvain himself.
    const sylvainPlaced = journal.findIndex((s) => s.personId === 'sylvain' && s.placed)
    const gastonPlaced = journal.findIndex((s) => s.personId === 'gaston' && s.placed)
    expect(gastonPlaced).toBeLessThan(sylvainPlaced)
  })

  it('makes the one denied relation bite late, and only once (relationalExclusion)', () => {
    const denied = journal.filter((s) => s.technique === 'relationalExclusion')
    expect(denied).toHaveLength(1)
    expect(denied[0].personId).toBe('nina')
    expect(denied[0].reason).toEqual({
      type: 'relational',
      constraintType: 'distance',
      other: 'odile',
      negated: true,
    })
    // It cannot fire until Odile is down to one cell: a denial only cuts once
    // every position the partner has left would force the relation.
    const odilePlaced = journal.findIndex((s) => s.personId === 'odile' && s.placed)
    expect(journal.indexOf(denied[0])).toBeGreaterThan(odilePlaced)
  })

  it('places people in the order the chain forces, the body dead last (§14)', () => {
    expect(journal.filter((s) => s.placed).map((s) => s.personId)).toEqual([
      'berthe',
      'odile',
      'marcel',
      'theo',
      'gaston',
      'sylvain',
      'nina',
      'lucien',
    ])
  })

  it('narrows the clue-less body from 60 cells to 1, purely by elimination (§14)', () => {
    // Lucien carries no clue at all: nothing can ever filter his domain directly.
    // Nina measures herself against him, but arc-consistency only trims the
    // speaker — so every cell he loses is a row, a column or a room someone else
    // has taken, and the last one falls on the last living placement.
    expect(bellevueDef.people.find((p) => p.id === 'lucien')!.constraints).toEqual([])

    const steps = journal.filter((s) => s.personId === 'lucien')
    expect(steps[0].before).toHaveLength(60)
    expect(steps.map((s) => s.after.length)).toEqual([43, 36, 29, 25, 22, 20, 16, 14, 12, 8, 7, 6, 3, 2, 1, 1])
    expect([...new Set(steps.map((s) => s.technique))].sort()).toEqual([
      'lockedCandidates',
      'nakedSingle',
      'rowColElimination',
      'zoneExclusivity',
    ])

    const ninaPlaced = journal.find((s) => s.personId === 'nina' && s.placed)!
    const closing = steps[steps.length - 2]
    expect(closing.reason).toEqual({ type: 'rowTaken', by: 'nina', row: 7 })
    expect(closing.premises).toContain(ninaPlaced.id)
  })

  it('exercises six of the engine’s seven techniques — more than any earlier case', () => {
    expect(report.techniqueCounts).toEqual({
      rowColElimination: 37,
      lockedCandidates: 4,
      relationalFilter: 5,
      relationalExclusion: 1,
      zoneExclusivity: 5,
      zoneCompany: 0,
      nakedSingle: 8,
    })
    expect(Object.values(report.techniqueCounts).filter((n) => n > 0)).toHaveLength(6)
    expect(report.tier).toBe('intermediate')
  })

  it('lands on the difficulty this case is published at, and tops the scale (§56.9)', () => {
    expect(report.propagationStatus).toBe('solved')
    // 'advanced' is the highest category analyzeDifficulty can honestly award
    // today: propagate emits nothing above the 'intermediate' tier, and
    // categoryOf never sells more than one rung above the tier actually used.
    expect(report.category).toBe('advanced')
    expect(report.score).toBe(100)
    expect(report.maxChainDepth).toBe(16)
    expect(report.articulationCount).toBe(17)
    expect(report.maxCascade).toBe(52)
  })
})

describe('La dernière donne du Bellevue — exactly one solution (§6)', () => {
  it('finds one and only one placement, even when asked for two', () => {
    const solutions = solvePuzzle(puzzle, { limit: 2 })
    expect(solutions).toHaveLength(1)
    expect(solutions[0]).toEqual(SOLUTION)
  })

  it('agrees with what propagation derived', () => {
    expect(solvePuzzle(puzzle, { limit: 2 })[0]).toEqual(propagate(puzzle).placements)
  })
})

describe('La dernière donne du Bellevue — the murderer is derived, never stored (§5)', () => {
  it('names Nina: she is the only other person left in the cloakroom', () => {
    const solution = solvePuzzle(puzzle, { limit: 2 })[0]
    expect(deriveMurderer(puzzle, solution)).toBe('nina')
  })

  it('is not stored anywhere in the authored case', () => {
    expect(Object.keys(bellevueDef)).not.toContain('murdererId')
    expect(Object.keys(bellevueDef)).not.toContain('solution')
  })

  it('spreads the cast over five of the eight rooms, two of them shared', () => {
    const zoneOf = (personId: string) => puzzle.board.cellsByKey.get(SOLUTION[personId])!.zoneId
    expect(Object.fromEntries(puzzle.people.map((p) => [p.id, zoneOf(p.id)]))).toEqual({
      lucien: 'vestiaire',
      odile: 'baccara',
      gaston: 'baccara',
      berthe: 'bar',
      marcel: 'galerie',
      nina: 'vestiaire',
      theo: 'roulette',
      sylvain: 'bar',
    })
  })
})

describe('La dernière donne du Bellevue — the dossier is minimal and varied (§7)', () => {
  it('mixes six clue families over twelve statements, only three of them metric', () => {
    const seen = new Set<string>()
    const walk = (c: Constraint) => {
      seen.add(c.type)
      if (c.type === 'not') walk(c.of)
    }
    for (const person of bellevueDef.people) for (const c of person.constraints) walk(c)

    expect([...seen].sort()).toEqual([
      'adjacentToObjectType',
      'alone',
      'direction',
      'distance',
      'inZone',
      'not',
      'onObjectType',
    ])

    const all = bellevueDef.people.flatMap((p) => p.constraints)
    expect(all).toHaveLength(12)
    const inner = (c: Constraint) => (c.type === 'not' ? c.of.type : c.type)
    expect(all.filter((c) => inner(c) === 'distance')).toHaveLength(3)
  })

  it('gives the victim no dossier at all — the purest reading of §14', () => {
    const victim = bellevueDef.people.find((p) => p.id === bellevueDef.victimId)!
    expect(victim.isVictim).toBe(true)
    expect(victim.constraints).toEqual([])
    for (const other of bellevueDef.people.filter((p) => p.id !== bellevueDef.victimId)) {
      expect(other.constraints.length).toBeGreaterThan(0)
    }
  })

  it('carries no clue the proof could do without: drop any one and the case breaks', () => {
    const droppable: string[] = []
    for (const person of bellevueDef.people) {
      for (const [index] of person.constraints.entries()) {
        const doctored = structuredClone(bellevueDef)
        doctored.people.find((p) => p.id === person.id)!.constraints.splice(index, 1)
        const weakened = loadPuzzle(doctored)

        const result = propagate(weakened)
        const reproduces =
          result.status === 'solved' && puzzle.people.every((p) => result.placements[p.id] === SOLUTION[p.id])
        const stillUnique = solvePuzzle(weakened, { limit: 2 }).length === 1
        if (reproduces && stillUnique) droppable.push(`${person.id}[${index}]`)
      }
    }
    expect(droppable).toEqual([])
  })

  it('has no witness repeating another one’s statement back at them', () => {
    expect(findMirroredTestimony(puzzle)).toBeNull()
  })
})
