import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import type { DeductionStep } from '../possibility/journal'
import { propagate } from '../possibility/propagate'
import { cascadeDef } from '../testing/fixtures'
import { analyzeDifficulty, analyzeJournal, chainDepths, findKeystones, removalClosure } from './difficulty'

describe('analyzeJournal — the cascade fixture', () => {
  const journal = propagate(loadPuzzle(cascadeDef)).journal

  it('reports the highest tier actually exercised, not the lowest', () => {
    // Solved by lockedCandidates (intermediate) + naked singles (basic).
    expect(analyzeJournal(journal).tier).toBe('intermediate')
    expect(analyzeJournal(journal).techniqueCounts.lockedCandidates).toBeGreaterThan(0)
    expect(analyzeJournal(journal).techniqueCounts.nakedSingle).toBeGreaterThan(0)
  })

  it('measures the chain depth through premises, not the step count alone', () => {
    const report = analyzeJournal(journal)
    expect(report.maxChainDepth).toBe(journal.length)
  })

  it('finds a keystone, and the very first lock is the one everything hangs on', () => {
    const report = analyzeJournal(journal)
    expect(report.keystones.length).toBeGreaterThan(0)

    const first = journal[0]
    const keystone = report.keystones.find((k) => k.stepId === first.id)
    expect(keystone).toBeDefined()
    // Removing the opening lock invalidates the whole proof after it.
    expect(keystone!.cascade.length).toBe(journal.length)
    expect([...keystone!.unprovenPeople].sort()).toEqual(['austin', 'brycen', 'diane'])
    expect(report.maxCascade).toBe(journal.length)
    expect(report.articulationCount).toBeGreaterThan(0)
  })

  it('scores it as a genuine chain rather than a flat pile of clues', () => {
    const report = analyzeJournal(journal)
    expect(report.score).toBeGreaterThan(25)
    expect(report.category).toBe('intermediate')
  })

  it('is reachable straight from a puzzle', () => {
    const report = analyzeDifficulty(loadPuzzle(cascadeDef))
    expect(report.propagationStatus).toBe('solved')
    expect(report.keystones.length).toBeGreaterThan(0)
  })
})

describe('findKeystones — redundant reasoning has no lock', () => {
  // Two independent routes, each on its own enough to place `x` on the same cell.
  const redundant: DeductionStep[] = [
    {
      id: 'routeA',
      technique: 'rowColElimination',
      tier: 'basic',
      personId: 'x',
      before: ['0:0', '0:1'],
      after: ['0:0'],
      removed: ['0:1'],
      reason: { type: 'rowTaken', by: 'y', row: 0 },
      premises: [],
    },
    {
      id: 'routeB',
      technique: 'relationalFilter',
      tier: 'basic',
      personId: 'x',
      before: ['0:0', '0:1'],
      after: ['0:0'],
      removed: ['0:1'],
      reason: { type: 'relational', constraintType: 'withPerson', other: 'z' },
      premises: [],
    },
    {
      id: 'viaA',
      technique: 'nakedSingle',
      tier: 'basic',
      personId: 'x',
      before: ['0:0'],
      after: ['0:0'],
      removed: [],
      placed: '0:0',
      reason: { type: 'onlyOptionLeft' },
      premises: ['routeA'],
    },
    {
      id: 'viaB',
      technique: 'nakedSingle',
      tier: 'basic',
      personId: 'x',
      before: ['0:0'],
      after: ['0:0'],
      removed: [],
      placed: '0:0',
      reason: { type: 'onlyOptionLeft' },
      premises: ['routeB'],
    },
  ]

  it('reports no keystone at all when every conclusion has a second route', () => {
    expect(findKeystones(redundant)).toEqual([])
  })

  it('still cascades correctly within a single route', () => {
    expect([...removalClosure(redundant, 'routeA')].sort()).toEqual(['routeA', 'viaA'])
  })

  it('scores below the equally short but fully load-bearing cascade', () => {
    const flat = analyzeJournal(redundant)
    const chained = analyzeJournal(propagate(loadPuzzle(cascadeDef)).journal)
    expect(flat.maxCascade).toBe(0)
    expect(flat.articulationCount).toBe(0)
    expect(flat.score).toBeLessThan(chained.score)
  })
})

describe('chainDepths — defensive about malformed journals', () => {
  it('treats a premise pointing outside the journal as seed-grounded', () => {
    const sliced: DeductionStep[] = [
      {
        id: 'only',
        technique: 'nakedSingle',
        tier: 'basic',
        personId: 'x',
        before: ['0:0'],
        after: ['0:0'],
        removed: [],
        placed: '0:0',
        reason: { type: 'onlyOptionLeft' },
        premises: ['gone'],
      },
    ]
    expect(chainDepths(sliced).get('only')).toBe(1)
    expect(analyzeJournal(sliced).maxChainDepth).toBe(1)
  })

  it('returns an empty report on an empty journal', () => {
    const report = analyzeJournal([])
    expect(report.deductionCount).toBe(0)
    expect(report.maxChainDepth).toBe(0)
    expect(report.keystones).toEqual([])
    expect(report.category).toBe('beginner')
  })
})
