import { describe, expect, it } from 'vitest'
import { cormoranDef } from '../../data/v2/premier-cas'
import { loadPuzzle } from '../model/loadPuzzle'
import { asRelation, findMirroredTestimony, isMirrorOf, relationHolds } from './relations'
import type { Constraint } from './types'

const board = loadPuzzle(cormoranDef).board

/** Both clues name a placeholder partner: `isMirrorOf` compares statements, never ids. */
const mirrors = (a: Constraint, b: Constraint) => isMirrorOf(asRelation(a)!, asRelation(b)!, board)

describe('asRelation — reads a clue as a relation, denial included', () => {
  it('peels a `not` and reports the polarity separately', () => {
    expect(asRelation({ type: 'withPerson', other: 'b' })).toEqual({ inner: { type: 'withPerson', other: 'b' }, negated: false })
    expect(asRelation({ type: 'not', of: { type: 'withPerson', other: 'b' } })).toEqual({
      inner: { type: 'withPerson', other: 'b' },
      negated: true,
    })
  })

  it('returns null for everything that is not about another person', () => {
    expect(asRelation({ type: 'inZone', zoneId: 'salon' })).toBeNull()
    expect(asRelation({ type: 'alone' })).toBeNull()
    expect(asRelation({ type: 'not', of: { type: 'inRow', row: 'top' } })).toBeNull()
  })
})

describe('relationHolds — distance is measured from the other person outwards', () => {
  const cell = (row: number, col: number) => board.cellsByKey.get(`${row}:${col}`)!

  it('reads `exact` as other - me, which is what makes a mirrored clue flip its sign', () => {
    // Victoire on 2:2 and Pascal on 5:3 — the published placement.
    expect(relationHolds({ type: 'distance', other: 'p', axis: 'col', exact: 1 }, cell(2, 2), cell(5, 3))).toBe(true)
    expect(relationHolds({ type: 'distance', other: 'v', axis: 'col', exact: -1 }, cell(5, 3), cell(2, 2))).toBe(true)
    expect(relationHolds({ type: 'distance', other: 'p', axis: 'col', exact: -1 }, cell(2, 2), cell(5, 3))).toBe(false)
  })
})

describe('isMirrorOf — two witnesses saying the very same thing', () => {
  it('catches the exact pair the roster showed twice: N columns left against N columns right', () => {
    expect(mirrors({ type: 'distance', other: 'p', axis: 'col', exact: 2 }, { type: 'distance', other: 'v', axis: 'col', exact: -2 })).toBe(
      true,
    )
  })

  it('catches opposite compass points and a shared room, each stated from both sides', () => {
    expect(mirrors({ type: 'direction', other: 'p', dir: 'N' }, { type: 'direction', other: 'v', dir: 'S' })).toBe(true)
    expect(mirrors({ type: 'withPerson', other: 'p' }, { type: 'withPerson', other: 'v' })).toBe(true)
  })

  it('catches a mirrored pair of denials too — a denial repeated is still a repetition', () => {
    expect(mirrors({ type: 'not', of: { type: 'withPerson', other: 'p' } }, { type: 'not', of: { type: 'withPerson', other: 'v' } })).toBe(
      true,
    )
    expect(
      mirrors(
        { type: 'not', of: { type: 'distance', other: 'p', axis: 'col', exact: 2 } },
        { type: 'not', of: { type: 'distance', other: 'v', axis: 'col', exact: -2 } },
      ),
    ).toBe(true)
  })

  it('leaves alone two clues that merely happen to point at each other', () => {
    // Same sign both ways is a contradiction, not a repetition; a different axis,
    // a different compass point, or one side denied are all genuinely two facts.
    expect(mirrors({ type: 'distance', other: 'p', axis: 'col', exact: 2 }, { type: 'distance', other: 'v', axis: 'col', exact: 2 })).toBe(
      false,
    )
    expect(mirrors({ type: 'distance', other: 'p', axis: 'col', exact: 2 }, { type: 'distance', other: 'v', axis: 'row', exact: -2 })).toBe(
      false,
    )
    expect(mirrors({ type: 'direction', other: 'p', dir: 'W' }, { type: 'direction', other: 'v', dir: 'N' })).toBe(false)
    expect(mirrors({ type: 'not', of: { type: 'withPerson', other: 'p' } }, { type: 'withPerson', other: 'v' })).toBe(false)
  })

  it('does not treat a weaker consequence as a repetition', () => {
    // "one row above" implies "north of", but not the other way round: the
    // direction clue still narrows nothing the distance clue has already given.
    expect(mirrors({ type: 'distance', other: 'p', axis: 'row', exact: 1 }, { type: 'direction', other: 'v', dir: 'S' })).toBe(false)
  })
})

describe('findMirroredTestimony — the pair, located in a whole case', () => {
  it('names both sides when a case states one relation twice', () => {
    // The regression this exists for, reproduced exactly: the player read
    // "Victoire was 2 columns left of Pascal" on one card and "Pascal was 2
    // columns right of Victoire" on the next, and learned one fact from two.
    const doctored = structuredClone(cormoranDef)
    doctored.people.find((p) => p.id === 'victoire')!.constraints.push({ type: 'distance', other: 'pascal', axis: 'col', exact: 2 })
    doctored.people.find((p) => p.id === 'pascal')!.constraints.push({ type: 'distance', other: 'victoire', axis: 'col', exact: -2 })

    expect(findMirroredTestimony(loadPuzzle(doctored))).toEqual({
      personId: 'victoire',
      otherId: 'pascal',
      constraint: { type: 'distance', other: 'pascal', axis: 'col', exact: 2 },
      otherConstraint: { type: 'distance', other: 'victoire', axis: 'col', exact: -2 },
    })
  })

  it('stays quiet on a case where each relation is stated once', () => {
    expect(findMirroredTestimony(loadPuzzle(cormoranDef))).toBeNull()
  })
})
