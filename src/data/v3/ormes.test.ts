import { describe, expect, it } from 'vitest'
import { findMirroredTestimony } from '../../core3/constraints/relations'
import { verifyGenerated } from '../../core3/generate/verify'
import { fullDiscovery, loadPuzzle, startDiscovery } from '../../core3/model/loadPuzzle'
import type { Discovery } from '../../core3/model/types'
import { propagate } from '../../core3/possibility/propagate'
import { progressFor } from '../../core3/progress/progress'
import { entailsPlacement } from '../../core3/solve/entail'
import { deriveMurderer, solvePuzzle } from '../../core3/solve/solver'
import { ormesDef, ormesSolution } from './ormes'

/** The state of knowledge after `openedGates` have fallen, links included. */
function after(openedGates: string[]): Discovery {
  const opened = new Set(openedGates)
  return {
    revealedClues: new Set(ormesDef.clues.filter((c) => c.revealedBy === 'start' || opened.has(c.revealedBy)).map((c) => c.id)),
    unlockedLinks: new Set(ormesDef.gates.filter((g) => opened.has(g.id) && g.unlocksLink).map((g) => g.unlocksLink!)),
    accessibleFloors: new Set([
      ...ormesDef.startFloors,
      ...ormesDef.gates.filter((g) => opened.has(g.id) && g.unlocksFloor !== undefined).map((g) => g.unlocksFloor!),
    ]),
  }
}

const ACT_I: string[] = []
const ACT_II = ['gateEscalier']
const ACT_III = ['gateEscalier', 'gateTrappe']
const CLOSED = ['gateEscalier', 'gateTrappe', 'gateGoulotte']

describe('Le 12, rue des Ormes — the finished dossier', () => {
  it('loads, is unique, and comes apart by propagation alone', () => {
    const puzzle = loadPuzzle(ormesDef, fullDiscovery(ormesDef))
    const verdict = verifyGenerated(puzzle, ormesSolution)
    expect(verdict.ok).toBe(true)
    expect(solvePuzzle(puzzle, { limit: 2 })).toHaveLength(1)
  })

  it('closes on the body (§14)', () => {
    const puzzle = loadPuzzle(ormesDef, fullDiscovery(ormesDef))
    const placed = propagate(puzzle).journal.filter((s) => s.placed)
    expect(placed.at(-1)!.personId).toBe(ormesDef.victimId)
  })

  it('never states the same fact twice', () => {
    expect(findMirroredTestimony(loadPuzzle(ormesDef, fullDiscovery(ormesDef)))).toBeNull()
  })
})

/**
 * The property the whole three-act structure rests on. A door has to be
 * *openable* when the player arrives at it — otherwise it is a wall — and it has
 * to be *shut* before that — otherwise the act it ends was a corridor. Both
 * halves are asserted, because only the first one is obvious and only the second
 * one is easy to lose while editing clues.
 */
describe('the three doors', () => {
  const cases = [
    { gate: 'gateEscalier', openedBefore: ACT_I, person: 'mathilde', cell: '1:2:0' },
    { gate: 'gateTrappe', openedBefore: ACT_II, person: 'gaspard', cell: '2:3:0' },
    { gate: 'gateGoulotte', openedBefore: ACT_III, person: 'aubin', cell: '0:4:3' },
  ]

  for (const { gate, openedBefore, person, cell } of cases) {
    it(`${gate} is entailed by the clues in hand when the player reaches it`, () => {
      expect(entailsPlacement(loadPuzzle(ormesDef, after(openedBefore)), person, cell)).toBe(true)
    })

    it(`${gate} is not entailed one act earlier`, () => {
      if (openedBefore.length === 0) return
      const earlier = openedBefore.slice(0, -1)
      expect(entailsPlacement(loadPuzzle(ormesDef, after(earlier)), person, cell)).toBe(false)
    })
  }

  it('cannot be opened out of order', () => {
    // The whole solution dropped on the board at once still only opens the doors
    // in sequence, because each one names the previous as its prerequisite.
    const progress = progressFor({ ...ormesDef, gates: ormesDef.gates.map((g) => ({ ...g })) }, ormesSolution)
    expect(progress.openedGates).toEqual(['gateEscalier', 'gateTrappe', 'gateGoulotte'])
  })

  it('leaves no act able to finish the building on its own', () => {
    for (const opened of [ACT_I, ACT_II]) {
      expect(propagate(loadPuzzle(ormesDef, after(opened))).status).toBe('stuck')
    }
    expect(propagate(loadPuzzle(ormesDef, after(ACT_III))).status).toBe('solved')
  })
})

/**
 * The twist, stated as a pair of assertions rather than as a hope: the chute
 * changes the *verdict* and nothing else. Same building, same fourteen clues,
 * same eight people on the same eight cells — and a culprit where there was
 * none.
 */
describe('the coal chute', () => {
  const sealed = loadPuzzle(ormesDef, after(ACT_III))
  const welded = loadPuzzle(ormesDef, after(CLOSED))

  it('leaves the case with no answer at all until it is found', () => {
    expect(deriveMurderer(sealed, ormesSolution)).toBeNull()
  })

  it('names Aubin once it is found', () => {
    expect(deriveMurderer(welded, ormesSolution)).toBe('aubin')
  })

  it('moves nobody — the placements are identical on both topologies', () => {
    expect(propagate(sealed).placements).toEqual(ormesSolution)
    expect(propagate(welded).placements).toEqual(ormesSolution)
    expect(solvePuzzle(welded, { limit: 2 })).toHaveLength(1)
  })

  it('puts the culprit in a room the body was never in', () => {
    const body = welded.board.cellsByKey.get(ormesSolution.solange)!
    const aubin = welded.board.cellsByKey.get(ormesSolution.aubin)!
    expect(body.roomId).not.toBe(aubin.roomId)
    expect(body.floor).not.toBe(aubin.floor)
    // Different room, different level — and the same volume. That is the case.
    expect(body.zoneId).toBe(aubin.zoneId)
  })
})

describe('the mezzanine', () => {
  const puzzle = loadPuzzle(ormesDef, fullDiscovery(ormesDef))

  it('puts Hortense and Léon in one volume across two levels', () => {
    const leon = puzzle.board.cellsByKey.get(ormesSolution.leon)!
    const hortense = puzzle.board.cellsByKey.get(ormesSolution.hortense)!
    expect(hortense.floor).toBe(leon.floor + 1)
    expect(hortense.row).toBe(leon.row)
    expect(hortense.col).toBe(leon.col)
    expect(hortense.zoneId).toBe(leon.zoneId)
  })

  it('makes "Léon was not alone" true of nobody on his own floor', () => {
    const leon = puzzle.board.cellsByKey.get(ormesSolution.leon)!
    const sameVolume = puzzle.people.filter((p) => puzzle.board.cellsByKey.get(ormesSolution[p.id])!.zoneId === leon.zoneId)
    expect(sameVolume.map((p) => p.id).sort()).toEqual(['hortense', 'leon'])
  })
})

describe('progress', () => {
  it('starts on the ground floor with six testimonies', () => {
    const start = startDiscovery(ormesDef)
    expect([...start.accessibleFloors]).toEqual([1])
    expect(start.revealedClues.size).toBe(6)
  })

  it('refuses to call the house explored until the chute is found', () => {
    const { leon, mathilde, gaspard, hortense, edmond, victorine } = ormesSolution
    const partial = { leon, mathilde, gaspard, hortense, edmond, victorine }
    expect(progressFor(ormesDef, partial).fullyExplored).toBe(false)
    expect(progressFor(ormesDef, ormesSolution).fullyExplored).toBe(true)
  })
})
