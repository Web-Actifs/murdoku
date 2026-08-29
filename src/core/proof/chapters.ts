import type { DeductionStep, Tier } from '../possibility/journal'
import { chainDepths, findKeystones, highestTier } from './difficulty'

/**
 * How the proof is cut into chapters.
 *
 * - `revelation` (default) — a chapter builds up to one identification and stops
 *   there, the way a chapter of a detective novel does. The build-up is allowed
 *   to hold several people at once as long as the reasoning stays in the wave it
 *   opened in, so the givens handed to the player at the start read as one
 *   chapter instead of one per name.
 * - `depth` — the literal reading of `chainDepths`: one chapter per wave of the
 *   proof, whether or not it names anybody. Useful to visualise the shape of the
 *   reasoning; less useful as a progress bar, since a long chain of dependent
 *   eliminations turns into a long row of one-step chapters.
 */
export type ChapterStrategy = 'revelation' | 'depth'

export interface Chapter {
  index: number
  strategy: ChapterStrategy
  steps: DeductionStep[]
  stepIds: string[]
  /** Journal positions of `steps` — a `depth` chapter is a wave, not always a contiguous run. */
  stepIndices: number[]
  /** Journal position of the chapter's first step, for ordering and highlighting. */
  startStep: number
  /** The chapter opens on a step the rest of the proof cannot do without (§37). */
  opensOnKeystone: boolean
  keystoneStepId?: string
  depthRange: { min: number; max: number }
  /** Hardest technique the chapter asks for — the UI can colour the chapter by it. */
  tier: Tier
  /** People this chapter settles: its payoff, and what to title it with. */
  resolves: string[]
  i18nKey: string
  params: Record<string, string | number>
}

/** Where the player stands in the story, for a "chapter 2 of 4" bar. */
export interface ChapterProgress {
  total: number
  /** 1-based chapter currently being written; equals `total` once the case is closed. */
  current: number
  completed: number
  stepsDone: number
  stepsTotal: number
  /** 0 to 1, over steps rather than chapters, so a long chapter doesn't stall the bar. */
  ratio: number
  done: boolean
}

function groupByRevelation(journal: DeductionStep[], depths: Map<string, number>): number[][] {
  const groups: number[][] = []
  let current: number[] = []
  let openedAt = Number.POSITIVE_INFINITY

  for (const [index, step] of journal.entries()) {
    current.push(index)
    openedAt = Math.min(openedAt, depths.get(step.id) ?? 0)
    if (step.placed === undefined) continue

    // Close on the identification, unless what follows is still part of the wave
    // this chapter opened in — those steps belong to the same beat of the story.
    const next = journal[index + 1]
    if (next && (depths.get(next.id) ?? 0) === openedAt) continue

    groups.push(current)
    current = []
    openedAt = Number.POSITIVE_INFINITY
  }
  if (current.length > 0) groups.push(current)
  return groups
}

function groupByDepth(journal: DeductionStep[], depths: Map<string, number>): number[][] {
  const waves = new Map<number, number[]>()
  for (const [index, step] of journal.entries()) {
    const depth = depths.get(step.id) ?? 0
    waves.set(depth, [...(waves.get(depth) ?? []), index])
  }
  return [...waves.entries()].sort((a, b) => a[0] - b[0]).map(([, indices]) => indices)
}

function titleKeyOf(steps: DeductionStep[], opensOnKeystone: boolean): string {
  // Steps with no premises are handed to the player, not deduced by them.
  if (steps.every((step) => step.premises.length === 0)) return 'chapter.givens'
  return opensOnKeystone ? 'chapter.lock' : 'chapter.thread'
}

/**
 * Cuts the journal into narrative chapters. The proof itself is untouched: a
 * chapter is only a reading of the order propagation already fixed, which is
 * what lets the UI replace "3 of 5 people placed" — a count V1 could satisfy in
 * any order — with a position in a story that has one order.
 */
export function buildChapters(journal: DeductionStep[], strategy: ChapterStrategy = 'revelation'): Chapter[] {
  const depths = chainDepths(journal)
  const keystones = new Set(findKeystones(journal).map((k) => k.stepId))
  const groups = strategy === 'depth' ? groupByDepth(journal, depths) : groupByRevelation(journal, depths)

  return groups.map((indices, index) => {
    const steps = indices.map((i) => journal[i])
    const stepDepths = steps.map((step) => depths.get(step.id) ?? 0)
    const opensOnKeystone = keystones.has(steps[0].id)
    const resolves = steps.filter((step) => step.placed !== undefined).map((step) => step.personId)
    const i18nKey = titleKeyOf(steps, opensOnKeystone)

    return {
      index,
      strategy,
      steps,
      stepIds: steps.map((step) => step.id),
      stepIndices: indices,
      startStep: indices[0],
      opensOnKeystone,
      keystoneStepId: opensOnKeystone ? steps[0].id : undefined,
      depthRange: { min: Math.min(...stepDepths), max: Math.max(...stepDepths) },
      tier: highestTier(steps),
      resolves,
      i18nKey,
      params: { index: index + 1, total: groups.length, people: resolves.length },
    }
  })
}

/**
 * Position of a player who has honestly worked through `frontierStep` steps —
 * take it from `notebookFrontier`/`annotate().progress.frontierStep` so a
 * conclusion guessed ahead of the proof does not advance the bar.
 */
export function chapterProgress(chapters: Chapter[], frontierStep: number): ChapterProgress {
  const stepsTotal = chapters.reduce((total, chapter) => total + chapter.steps.length, 0)
  const isDone = (chapter: Chapter): boolean => chapter.stepIndices.every((index) => index < frontierStep)
  const completed = chapters.filter(isDone).length
  const pending = chapters.findIndex((chapter) => !isDone(chapter))
  const stepsDone = Math.min(frontierStep, stepsTotal)

  return {
    total: chapters.length,
    current: pending === -1 ? chapters.length : pending + 1,
    completed,
    stepsDone,
    stepsTotal,
    ratio: stepsTotal === 0 ? 1 : stepsDone / stepsTotal,
    done: pending === -1,
  }
}
