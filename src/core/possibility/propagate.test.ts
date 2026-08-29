import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import type { PuzzleDef } from '../model/types'
import { solvePuzzle } from '../solve/solver'
import { cascadeDef } from '../testing/fixtures'
import { propagate } from './propagate'

describe('propagate — the cascade from the architecture dossier', () => {
  const def: PuzzleDef = {
    id: 'cascade',
    plan: `
      AAA
      AAA
      AAA
    `,
    legend: { A: 'salle' },
    zones: [{ id: 'salle', nameKey: 'salle' }],
    objects: [
      {
        id: 'spotA',
        type: 'spotA',
        occupiable: true,
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
        ],
      },
      {
        id: 'spotB',
        type: 'spotB',
        occupiable: true,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
      },
      {
        id: 'spotD',
        type: 'spotD',
        occupiable: true,
        cells: [
          { row: 1, col: 2 },
          { row: 2, col: 2 },
        ],
      },
    ],
    people: [
      { id: 'austin', nameKey: 'austin', constraints: [{ type: 'onObjectType', objectType: 'spotA' }] },
      { id: 'brycen', nameKey: 'brycen', constraints: [{ type: 'onObjectType', objectType: 'spotB' }] },
      { id: 'diane', nameKey: 'diane', constraints: [{ type: 'onObjectType', objectType: 'spotD' }] },
    ],
    victimId: 'austin',
  }

  it('solves entirely by locked-candidates + naked singles, no search needed', () => {
    const result = propagate(loadPuzzle(def))
    expect(result.status).toBe('solved')
    expect(result.placements).toEqual({ austin: '1:0', brycen: '0:1', diane: '2:2' })
  })

  it('agrees with the backtracking solver', () => {
    const puzzle = loadPuzzle(def)
    const [searched] = solvePuzzle(puzzle)
    expect(propagate(puzzle).placements).toEqual(searched)
  })

  it('records the locked-candidates step before the naked single it causes', () => {
    const { journal } = propagate(loadPuzzle(def))
    const lockStep = journal.find((s) => s.technique === 'lockedCandidates' && s.personId === 'brycen')
    const singleStep = journal.find((s) => s.technique === 'nakedSingle' && s.personId === 'brycen')
    expect(lockStep).toBeDefined()
    expect(singleStep).toBeDefined()
    expect(singleStep!.premises).toContain(lockStep!.id)
    // before/after must be brycen's real domain either side of this one step —
    // this is what makes a literal "these are your only two cells" hint possible.
    expect(lockStep!.before.sort()).toEqual(['0:0', '0:1'])
    expect(lockStep!.after).toEqual(['0:1'])
  })
})

describe('propagate — relational constraints narrow candidates', () => {
  it('combines a relational filter with row/column elimination', () => {
    const def: PuzzleDef = {
      id: 'relational',
      plan: `
        AAA
        AAA
        AAA
      `,
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [{ id: 'anchor', type: 'anchor', occupiable: true, cells: [{ row: 1, col: 1 }] }],
      people: [
        { id: 'fixed', nameKey: 'fixed', constraints: [{ type: 'onObjectType', objectType: 'anchor' }] },
        { id: 'follower', nameKey: 'follower', constraints: [{ type: 'direction', other: 'fixed', dir: 'S' }] },
      ],
      victimId: 'fixed',
    }

    const { candidates, journal } = propagate(loadPuzzle(def))
    // direction 'S' alone only requires row > 1 (row 2); row/col elimination then
    // also strips column 1 (fixed's column), leaving (2,0) and (2,2).
    expect([...candidates.get('follower')!].sort()).toEqual(['2:0', '2:2'])
    expect(journal.some((s) => s.technique === 'relationalFilter' && s.personId === 'follower')).toBe(true)
    expect(journal.some((s) => s.technique === 'rowColElimination' && s.personId === 'follower')).toBe(true)
  })
})

/**
 * Two rooms side by side, three cells each, nothing but the zone split:
 *
 *   col     0    1    2  |  3    4    5
 *   row 0 [ kitchen ..... | hall ....... ]
 *   row 1 [ kitchen ..... | hall ....... ]
 *   row 2 [ kitchen ..... | hall ....... ]
 */
const twoRoomsPlan = `
  KKKHHH
  KKKHHH
  KKKHHH
`
const twoRoomsScene = {
  plan: twoRoomsPlan,
  legend: { K: 'kitchen', H: 'hall' },
  zones: [
    { id: 'kitchen', nameKey: 'kitchen' },
    { id: 'hall', nameKey: 'hall' },
  ],
}

describe('propagate — `alone` closes a zone (zoneExclusivity)', () => {
  const def: PuzzleDef = {
    id: 'alone',
    ...twoRoomsScene,
    objects: [{ id: 'stove', type: 'stove', occupiable: true, cells: [{ row: 1, col: 1 }] }],
    people: [
      // Pinned to the stove by his own clue, and he swears he was on his own.
      { id: 'cook', nameKey: 'cook', constraints: [{ type: 'onObjectType', objectType: 'stove' }, { type: 'alone' }] },
      { id: 'guest', nameKey: 'guest', constraints: [] },
    ],
    victimId: 'guest',
  }

  const { candidates, journal } = propagate(loadPuzzle(def))

  it('empties the kitchen of everyone else, not just its rows and columns', () => {
    // Row/column elimination alone would leave (0,0) (0,2) (2,0) (2,2) in the
    // kitchen open to the guest; `alone` is what takes the whole room away.
    for (const key of candidates.get('guest')!) expect(key.split(':')[1]).not.toMatch(/^[012]$/)
    expect([...candidates.get('guest')!].sort()).toEqual(['0:3', '0:4', '0:5', '2:3', '2:4', '2:5'])
  })

  it('records the zone step with the room, the claimant, and the domain either side of it', () => {
    const step = journal.find((s) => s.technique === 'zoneExclusivity')!
    expect(step).toBeDefined()
    expect(step.personId).toBe('guest')
    expect(step.reason).toEqual({ type: 'zoneClaimedAlone', by: 'cook', zoneId: 'kitchen' })
    expect(step.tier).toBe('basic')
    expect(step.removed.sort()).toEqual(['0:0', '0:2', '2:0', '2:2'])
    expect(step.after.sort()).toEqual(['0:3', '0:4', '0:5', '2:3', '2:4', '2:5'])
    expect(step.premises).toContain(journal.find((s) => s.personId === 'cook' && s.placed)!.id)
  })
})

describe('propagate — `alone` also keeps its speaker out of an occupied room', () => {
  const def: PuzzleDef = {
    id: 'aloneOther',
    ...twoRoomsScene,
    objects: [{ id: 'stove', type: 'stove', occupiable: true, cells: [{ row: 1, col: 1 }] }],
    people: [
      { id: 'cook', nameKey: 'cook', constraints: [{ type: 'onObjectType', objectType: 'stove' }] },
      // No clue about where — only that wherever it was, nobody else was there.
      { id: 'loner', nameKey: 'loner', constraints: [{ type: 'alone' }] },
    ],
    victimId: 'cook',
  }

  it('reads the constraint from the subject rather than from the occupant', () => {
    const { candidates, journal } = propagate(loadPuzzle(def))
    expect([...candidates.get('loner')!].sort()).toEqual(['0:3', '0:4', '0:5', '2:3', '2:4', '2:5'])

    const step = journal.find((s) => s.technique === 'zoneExclusivity' && s.personId === 'loner')!
    expect(step.reason).toEqual({ type: 'zoneTaken', by: 'cook', zoneId: 'kitchen' })
  })
})

describe('propagate — `notAlone` needs somebody left to keep you company (zoneCompany)', () => {
  const def: PuzzleDef = {
    id: 'notAlone',
    ...twoRoomsScene,
    objects: [
      { id: 'stove', type: 'stove', occupiable: true, cells: [{ row: 1, col: 1 }] },
      { id: 'bench', type: 'bench', occupiable: true, cells: [{ row: 0, col: 3 }, { row: 1, col: 3 }] },
    ],
    people: [
      // The only other person on the board can never leave the hall...
      { id: 'porter', nameKey: 'porter', constraints: [{ type: 'onObjectType', objectType: 'bench' }] },
      // ...so the kitchen is a room where this one would be on their own.
      { id: 'talker', nameKey: 'talker', constraints: [{ type: 'notAlone' }] },
    ],
    victimId: 'porter',
  }

  const { candidates, journal } = propagate(loadPuzzle(def))

  it('drops the room nobody could have shared', () => {
    for (const key of candidates.get('talker')!) expect(Number(key.split(':')[1])).toBeGreaterThan(2)
  })

  it('names the room in the journal, without pinning the blame on one person', () => {
    const step = journal.find((s) => s.technique === 'zoneCompany')!
    expect(step).toBeDefined()
    expect(step.personId).toBe('talker')
    expect(step.reason).toEqual({ type: 'zoneNeedsCompany', zoneId: 'kitchen' })
    expect(step.tier).toBe('intermediate')
    expect(step.before.filter((k) => Number(k.split(':')[1]) < 3).sort()).toEqual(step.removed.sort())
    expect(step.after.every((k) => Number(k.split(':')[1]) > 2)).toBe(true)
  })

  it('leaves the hall alone: the porter can still be company there', () => {
    // A cell is only struck when *no* companion fits beside it — same row or
    // same column as the porter's own cells does not count as company (§2).
    expect([...candidates.get('talker')!].length).toBeGreaterThan(0)
    expect([...candidates.get('talker')!].every((k) => Number(k.split(':')[1]) > 2)).toBe(true)
  })
})

/**
 * A denied relation bites when *every* cell the partner has left would force the
 * relation — so the partner never has to be placed for it to work, only cornered.
 */
describe('propagate — a denied relation cuts a domain too (relationalExclusion)', () => {
  it('`not(withPerson)`: the whole room the partner can no longer leave', () => {
    const def: PuzzleDef = {
      id: 'notWith',
      ...twoRoomsScene,
      objects: [{ id: 'bench', type: 'bench', occupiable: true, cells: [{ row: 0, col: 3 }, { row: 1, col: 3 }] }],
      people: [
        // Two cells left, both in the hall: cornered into a room without being placed.
        { id: 'porter', nameKey: 'porter', constraints: [{ type: 'onObjectType', objectType: 'bench' }] },
        { id: 'dodger', nameKey: 'dodger', constraints: [{ type: 'not', of: { type: 'withPerson', other: 'porter' } }] },
      ],
      victimId: 'porter',
    }

    const { candidates, journal } = propagate(loadPuzzle(def))
    expect([...candidates.get('dodger')!].every((k) => Number(k.split(':')[1]) < 3)).toBe(true)

    const step = journal.find((s) => s.technique === 'relationalExclusion')!
    expect(step).toBeDefined()
    expect(step.personId).toBe('dodger')
    expect(step.reason).toEqual({ type: 'relational', constraintType: 'withPerson', other: 'porter', negated: true })
    // The partner is cornered but not placed, so this is not a beginner's read.
    expect(step.tier).toBe('intermediate')
    // Column 3 is already gone by then — the porter reserves it (locked candidates).
    expect(step.removed.sort()).toEqual(['0:4', '0:5', '1:4', '1:5', '2:4', '2:5'])
    expect(step.after.sort()).toEqual(['0:0', '0:1', '0:2', '1:0', '1:1', '1:2', '2:0', '2:1', '2:2'])
    // The porter's own domain came straight from the seed, so there is no earlier
    // step to lean on — the denial rests on his clue alone.
    expect(step.premises).toEqual([])
  })

  const threeByThree = {
    plan: `
      AAA
      AAA
      AAA
    `,
    legend: { A: 'salle' },
    zones: [{ id: 'salle', nameKey: 'salle' }],
  }

  it('`not(direction)`: the rows from which the partner would always lie south', () => {
    const def: PuzzleDef = {
      id: 'notDirection',
      ...threeByThree,
      // Two separate ledges of the same type: the union-by-type domain is what
      // corners the anchor on rows 1 and 2 without placing it.
      objects: [
        { id: 'ledgeA', type: 'ledge', occupiable: true, cells: [{ row: 1, col: 0 }] },
        { id: 'ledgeB', type: 'ledge', occupiable: true, cells: [{ row: 2, col: 1 }] },
      ],
      people: [
        { id: 'anchor', nameKey: 'anchor', constraints: [{ type: 'onObjectType', objectType: 'ledge' }] },
        { id: 'denier', nameKey: 'denier', constraints: [{ type: 'not', of: { type: 'direction', other: 'anchor', dir: 'N' } }] },
      ],
      victimId: 'anchor',
    }

    const { journal } = propagate(loadPuzzle(def))
    const step = journal.find((s) => s.technique === 'relationalExclusion')!
    expect(step.personId).toBe('denier')
    expect(step.reason).toEqual({ type: 'relational', constraintType: 'direction', other: 'anchor', negated: true })
    // From row 0 the anchor is north of the denier whichever of its two cells it
    // takes, so the denial is impossible there — rows 1 and 2 still allow it.
    expect(step.before).toHaveLength(9)
    expect(step.removed.sort()).toEqual(['0:0', '0:1', '0:2'])
  })

  it('`not(distance)`: the row that would sit exactly one below the partner', () => {
    const def: PuzzleDef = {
      id: 'notDistance',
      ...threeByThree,
      objects: [
        { id: 'ledgeA', type: 'ledge', occupiable: true, cells: [{ row: 2, col: 0 }] },
        { id: 'ledgeB', type: 'ledge', occupiable: true, cells: [{ row: 2, col: 2 }] },
      ],
      people: [
        { id: 'anchor', nameKey: 'anchor', constraints: [{ type: 'onObjectType', objectType: 'ledge' }] },
        { id: 'denier', nameKey: 'denier', constraints: [{ type: 'not', of: { type: 'distance', other: 'anchor', axis: 'row', exact: 1 } }] },
      ],
      victimId: 'anchor',
    }

    const { candidates, journal } = propagate(loadPuzzle(def))
    const step = journal.find((s) => s.technique === 'relationalExclusion')!
    expect(step.personId).toBe('denier')
    expect(step.reason).toEqual({ type: 'relational', constraintType: 'distance', other: 'anchor', negated: true })
    // Row 2 is already the anchor's own (locked candidates); row 1 is the one the
    // denial forbids, since the gap would be exactly 1 wherever the anchor sits.
    expect(step.before.sort()).toEqual(['0:0', '0:1', '0:2', '1:0', '1:1', '1:2'])
    expect(step.removed.sort()).toEqual(['1:0', '1:1', '1:2'])
    expect([...candidates.get('denier')!].sort()).toEqual(['0:0', '0:1', '0:2'])
  })

  it('keeps a cell the partner could still make the denial true from', () => {
    const def: PuzzleDef = {
      id: 'notDistanceMixed',
      ...threeByThree,
      // Rows 1 and 2: from row 0 the gap is 1 or 2 depending on where the anchor
      // lands, so the denial survives there — only a *forced* relation may cut.
      objects: [
        { id: 'ledgeA', type: 'ledge', occupiable: true, cells: [{ row: 1, col: 0 }] },
        { id: 'ledgeB', type: 'ledge', occupiable: true, cells: [{ row: 2, col: 1 }] },
      ],
      people: [
        { id: 'anchor', nameKey: 'anchor', constraints: [{ type: 'onObjectType', objectType: 'ledge' }] },
        { id: 'denier', nameKey: 'denier', constraints: [{ type: 'not', of: { type: 'distance', other: 'anchor', axis: 'row', exact: 1 } }] },
      ],
      victimId: 'anchor',
    }

    const { candidates, journal } = propagate(loadPuzzle(def))
    expect(journal.some((s) => s.technique === 'relationalExclusion')).toBe(false)
    expect(candidates.get('denier')!.size).toBe(9)
  })
})

describe('propagate — the zone passes leave a puzzle that uses neither exactly as it was', () => {
  it('reproduces the cascade fixture step for step', () => {
    const result = propagate(loadPuzzle(cascadeDef))
    expect(result.status).toBe('solved')
    expect(result.placements).toEqual({ austin: '1:0', brycen: '0:1', diane: '2:2' })
    expect(
      result.journal.some((s) => s.technique === 'zoneExclusivity' || s.technique === 'zoneCompany' || s.technique === 'relationalExclusion'),
    ).toBe(false)
    expect(result.journal.map((s) => `${s.id}|${s.technique}|${s.personId}|${s.removed.join(',')}`)).toEqual([
      'd0|lockedCandidates|brycen|0:0',
      'd1|nakedSingle|brycen|',
      'd2|rowColElimination|austin|0:0',
      'd3|nakedSingle|austin|',
      'd4|rowColElimination|diane|1:2',
      'd5|nakedSingle|diane|',
    ])
  })
})

describe('propagate — honest about its own limits', () => {
  it('reports "stuck" rather than guessing when propagation alone cannot finish', () => {
    const def: PuzzleDef = {
      id: 'ambiguous',
      plan: `
        AA
        AA
      `,
      legend: { A: 'salle' },
      zones: [{ id: 'salle', nameKey: 'salle' }],
      objects: [],
      people: [
        { id: 'a', nameKey: 'a', constraints: [] },
        { id: 'b', nameKey: 'b', constraints: [] },
      ],
      victimId: 'a',
    }

    const result = propagate(loadPuzzle(def))
    expect(result.status).toBe('stuck')
    // ...but the backtracking solver still finds every solution search can reach.
    expect(solvePuzzle(loadPuzzle(def), { limit: 10 }).length).toBeGreaterThan(0)
  })
})
