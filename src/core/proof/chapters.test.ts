import { describe, expect, it } from 'vitest'
import commonEn from '../../i18n/en/common.json'
import commonEs from '../../i18n/es/common.json'
import commonFr from '../../i18n/fr/common.json'
import { annotate, emptyNotebook, withExclusion, withPlacement } from '../hints/notebook'
import { loadPuzzle } from '../model/loadPuzzle'
import type { DeductionStep } from '../possibility/journal'
import { propagate } from '../possibility/propagate'
import { cascadeDef } from '../testing/fixtures'
import { buildChapters, chapterProgress } from './chapters'
import { chainDepths, findKeystones } from './difficulty'

const { journal } = propagate(loadPuzzle(cascadeDef))
const depths = chainDepths(journal)

describe('buildChapters — the revelation reading', () => {
  const chapters = buildChapters(journal)

  it('cuts the proof into one chapter per identification', () => {
    expect(chapters.map((chapter) => chapter.stepIds)).toEqual([
      ['d0', 'd1'],
      ['d2', 'd3'],
      ['d4', 'd5'],
    ])
    expect(chapters.map((chapter) => chapter.resolves)).toEqual([['brycen'], ['austin'], ['diane']])
  })

  it('covers the journal exactly once, in order', () => {
    expect(chapters.flatMap((chapter) => chapter.stepIds)).toEqual(journal.map((step) => step.id))
  })

  it('stays coherent with chainDepths — fewer chapters than waves, never deeper than the proof', () => {
    const maxDepth = Math.max(...depths.values())
    expect(chapters.length).toBeLessThanOrEqual(maxDepth)
    expect(Math.max(...chapters.map((chapter) => chapter.depthRange.max))).toBe(maxDepth)
    // Chapters advance through the proof, they never step back into an earlier wave.
    for (let i = 1; i < chapters.length; i++) {
      expect(chapters[i].depthRange.min).toBeGreaterThan(chapters[i - 1].depthRange.max)
    }
  })

  it('opens the first chapter on the lock the whole proof hangs on', () => {
    const keystones = findKeystones(journal)
    const widest = keystones.reduce((best, k) => (k.cascade.length > best.cascade.length ? k : best))

    expect(chapters[0].opensOnKeystone).toBe(true)
    expect(chapters[0].keystoneStepId).toBe(widest.stepId)
    expect(chapters[0].keystoneStepId).toBe(journal[0].id)
  })

  it('exposes the hardest technique of each chapter for the UI to colour it by', () => {
    expect(chapters.map((chapter) => chapter.tier)).toEqual(['intermediate', 'basic', 'basic'])
  })

  it('titles a chapter opened by a lock as a lock', () => {
    expect(chapters[0].i18nKey).toBe('chapter.lock')
    expect(chapters[0].params).toEqual({ index: 1, total: 3, people: 1 })
  })
})

describe('buildChapters — the depth reading', () => {
  it('gives one chapter per wave of chainDepths', () => {
    const chapters = buildChapters(journal, 'depth')
    expect(chapters.length).toBe(new Set(depths.values()).size)
    expect(chapters.map((chapter) => chapter.depthRange)).toEqual(
      [...new Set([...depths.values()].sort((a, b) => a - b))].map((depth) => ({ min: depth, max: depth })),
    )
  })

  it('is a finer cut than the revelation one on a pure chain', () => {
    expect(buildChapters(journal, 'depth').length).toBeGreaterThan(buildChapters(journal).length)
  })
})

describe('buildChapters — the givens are one chapter, not one per name', () => {
  const seeded: DeductionStep[] = [
    {
      id: 's0',
      technique: 'nakedSingle',
      tier: 'basic',
      personId: 'x',
      before: ['0:0'],
      after: ['0:0'],
      removed: [],
      placed: '0:0',
      reason: { type: 'onlyOptionLeft' },
      premises: [],
    },
    {
      id: 's1',
      technique: 'nakedSingle',
      tier: 'basic',
      personId: 'y',
      before: ['1:1'],
      after: ['1:1'],
      removed: [],
      placed: '1:1',
      reason: { type: 'onlyOptionLeft' },
      premises: [],
    },
    {
      id: 's2',
      technique: 'rowColElimination',
      tier: 'basic',
      personId: 'z',
      before: ['0:2', '2:2'],
      after: ['2:2'],
      removed: ['0:2'],
      reason: { type: 'rowTaken', by: 'x', row: 0 },
      premises: ['s0'],
    },
    {
      id: 's3',
      technique: 'nakedSingle',
      tier: 'basic',
      personId: 'z',
      before: ['2:2'],
      after: ['2:2'],
      removed: [],
      placed: '2:2',
      reason: { type: 'onlyOptionLeft' },
      premises: ['s2'],
    },
  ]

  it('keeps a whole wave of seed placements inside a single opening chapter', () => {
    const chapters = buildChapters(seeded)
    expect(chapters.map((chapter) => chapter.stepIds)).toEqual([
      ['s0', 's1'],
      ['s2', 's3'],
    ])
    expect(chapters[0].resolves).toEqual(['x', 'y'])
  })

  it('names a premise-free opening chapter after what the player was handed', () => {
    expect(buildChapters(seeded)[0].i18nKey).toBe('chapter.givens')
    // s2 is the lock the rest of the proof hangs on, so its chapter is titled as one.
    expect(buildChapters(seeded)[1].i18nKey).toBe('chapter.lock')
  })

  it('titles a chapter as a plain thread when nothing in it is load-bearing', () => {
    // Two independent routes to the same conclusion: no keystone anywhere, which
    // is precisely the V1 feel — chapters exist, but none of them is a turn.
    const route = (id: string, technique: DeductionStep['technique']): DeductionStep => ({
      id,
      technique,
      tier: 'basic',
      personId: 'x',
      before: ['0:0', '0:1'],
      after: ['0:0'],
      removed: ['0:1'],
      reason: { type: 'rowTaken', by: 'y', row: 0 },
      premises: [],
    })
    const via = (id: string, premise: string): DeductionStep => ({
      id,
      technique: 'nakedSingle',
      tier: 'basic',
      personId: 'x',
      before: ['0:0'],
      after: ['0:0'],
      removed: [],
      placed: '0:0',
      reason: { type: 'onlyOptionLeft' },
      premises: [premise],
    })
    const redundant = [route('routeA', 'rowColElimination'), route('routeB', 'relationalFilter'), via('viaA', 'routeA'), via('viaB', 'routeB')]

    const chapters = buildChapters(redundant)
    expect(chapters[0].opensOnKeystone).toBe(false)
    expect(chapters[0].i18nKey).toBe('chapter.thread')
    expect(chapters.every((chapter) => !chapter.opensOnKeystone)).toBe(true)
  })

  it('returns nothing at all for an empty journal', () => {
    expect(buildChapters([])).toEqual([])
    expect(chapterProgress([], 0)).toMatchObject({ total: 0, current: 0, done: true, ratio: 1 })
  })
})

describe('chapterProgress — a position in a story, not a count of pins', () => {
  const chapters = buildChapters(journal)

  it('reads chapter 1 of 3 before anything is deduced', () => {
    expect(chapterProgress(chapters, 0)).toMatchObject({ total: 3, current: 1, completed: 0, stepsDone: 0, ratio: 0, done: false })
  })

  it('closes a chapter only once every step of it is mirrored', () => {
    expect(chapterProgress(chapters, 1)).toMatchObject({ current: 1, completed: 0 })
    expect(chapterProgress(chapters, 2)).toMatchObject({ current: 2, completed: 1 })
    expect(chapterProgress(chapters, journal.length)).toMatchObject({ current: 3, completed: 3, done: true, ratio: 1 })
  })

  it('does not advance for a suspect the player pinned without deducing them', () => {
    // The V1 counter would already say "1 of 3 suspects placed" here.
    const guessed = withPlacement(emptyNotebook(), 'diane', '2:2')
    const guessedProgress = chapterProgress(chapters, annotate(journal, guessed).progress.frontierStep)
    expect(guessedProgress).toMatchObject({ current: 1, completed: 0 })

    const earned = withExclusion(withPlacement(emptyNotebook(), 'brycen', '0:1'), 'austin', '0:0')
    const earnedProgress = chapterProgress(chapters, annotate(journal, earned).progress.frontierStep)
    expect(earnedProgress).toMatchObject({ current: 2, completed: 1 })
  })

  it('works the same way on the depth reading', () => {
    const waves = buildChapters(journal, 'depth')
    expect(chapterProgress(waves, 2)).toMatchObject({ total: 6, current: 3, completed: 2 })
  })
})

describe('chapter i18n coverage', () => {
  const keys = ['chapter.givens', 'chapter.lock', 'chapter.thread', 'chapter.progress']

  function lookup(bundle: unknown, key: string): unknown {
    return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle)
  }

  for (const [language, bundle] of [
    ['fr', commonFr],
    ['en', commonEn],
    ['es', commonEs],
  ] as const) {
    it(`resolves every chapter title in ${language}`, () => {
      expect(keys.filter((key) => typeof lookup(bundle, key) !== 'string')).toEqual([])
    })
  }

  it('only ever emits keys that exist', () => {
    const emitted = new Set([...buildChapters(journal), ...buildChapters(journal, 'depth')].map((chapter) => chapter.i18nKey))
    for (const key of emitted) expect(keys).toContain(key)
  })
})
