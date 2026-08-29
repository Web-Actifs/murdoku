import { describe, expect, it } from 'vitest'
import commonEn from '../../i18n/en/common.json'
import commonEs from '../../i18n/es/common.json'
import commonFr from '../../i18n/fr/common.json'
import type { DeductionStep, Reason, Technique } from '../possibility/journal'
import { getHint } from './getHint'
import type { HintLevel } from './types'

const LEVELS: HintLevel[] = [1, 2, 3, 4, 5]

/** One step per (technique, reason) pair the propagator can currently emit. */
const SHAPES: { technique: Technique; reason: Reason; placed?: string }[] = [
  { technique: 'rowColElimination', reason: { type: 'rowTaken', by: 'y', row: 0 } },
  { technique: 'rowColElimination', reason: { type: 'colTaken', by: 'y', col: 0 } },
  { technique: 'lockedCandidates', reason: { type: 'confinedToRow', confinedPerson: 'y', row: 1 } },
  { technique: 'lockedCandidates', reason: { type: 'confinedToCol', confinedPerson: 'y', col: 1 } },
  { technique: 'relationalFilter', reason: { type: 'relational', constraintType: 'withPerson', other: 'y' } },
  { technique: 'relationalFilter', reason: { type: 'relational', constraintType: 'direction', other: 'y' } },
  { technique: 'relationalFilter', reason: { type: 'relational', constraintType: 'distance', other: 'y' } },
  // A constraint type with no dedicated wording must still land on a real key.
  { technique: 'relationalFilter', reason: { type: 'relational', constraintType: 'futureMechanism', other: 'y' } },
  { technique: 'relationalExclusion', reason: { type: 'relational', constraintType: 'withPerson', other: 'y', negated: true } },
  { technique: 'relationalExclusion', reason: { type: 'relational', constraintType: 'direction', other: 'y', negated: true } },
  { technique: 'relationalExclusion', reason: { type: 'relational', constraintType: 'distance', other: 'y', negated: true } },
  { technique: 'relationalExclusion', reason: { type: 'relational', constraintType: 'futureMechanism', other: 'y', negated: true } },
  { technique: 'zoneExclusivity', reason: { type: 'zoneTaken', by: 'y', zoneId: 'cuisine' } },
  { technique: 'zoneExclusivity', reason: { type: 'zoneClaimedAlone', by: 'y', zoneId: 'cuisine' } },
  { technique: 'zoneCompany', reason: { type: 'zoneNeedsCompany', zoneId: 'cuisine' } },
  { technique: 'nakedSingle', reason: { type: 'onlyOptionLeft' }, placed: '0:0' },
]

function stepFor(shape: (typeof SHAPES)[number], index: number): DeductionStep {
  return {
    id: `s${index}`,
    technique: shape.technique,
    tier: 'basic',
    personId: 'x',
    before: shape.placed ? [shape.placed] : ['0:0', '0:1'],
    after: shape.placed ? [shape.placed] : ['0:0'],
    removed: shape.placed ? [] : ['0:1'],
    ...(shape.placed ? { placed: shape.placed } : {}),
    reason: shape.reason,
    premises: [],
  }
}

function lookup(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle)
}

describe('hint i18n coverage', () => {
  const keys = new Set<string>([getHint([], {}, 1).i18nKey])
  for (const [index, shape] of SHAPES.entries()) {
    const journal = [stepFor(shape, index)]
    for (const level of LEVELS) keys.add(getHint(journal, {}, level).i18nKey)
  }

  it('exercises every level of every technique the propagator emits', () => {
    expect(keys.size).toBeGreaterThanOrEqual(36)
    expect(keys.has('hint.none')).toBe(true)
    expect(keys.has('hint.l5.place')).toBe(true)
    expect(keys.has('hint.l5.nothingToPlace')).toBe(true)
    expect(keys.has('hint.l3.relational')).toBe(true)
    // A denied relation must never borrow the plain one's sentence: "he was with
    // her" and "wherever she is, he was not with her" are opposite statements.
    expect(keys.has('hint.l3.relationalNot')).toBe(true)
    expect(keys.has('hint.l3.relationalNotWithPerson')).toBe(true)
    expect(keys.has('hint.l4.relationalExclusion')).toBe(true)
    // The two zone reasons of the same technique must not collapse onto one key:
    // "you cannot be alone there" and "someone else is alone there" are different sentences.
    expect(keys.has('hint.l4.zoneExclusivityTaken')).toBe(true)
    expect(keys.has('hint.l4.zoneExclusivityClaimedAlone')).toBe(true)
  })

  for (const [language, bundle] of [
    ['fr', commonFr],
    ['en', commonEn],
    ['es', commonEs],
  ] as const) {
    it(`resolves every emitted key in ${language}`, () => {
      const missing = [...keys].filter((key) => typeof lookup(bundle, key) !== 'string')
      expect(missing).toEqual([])
    })
  }
})
