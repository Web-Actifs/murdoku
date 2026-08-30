import { useMemo } from 'react'
import { hintForStep } from '../../core/hints/getHint'
import type { PlayerNotebook } from '../../core/hints/notebook'
import type { Hint } from '../../core/hints/types'
import type { DeductionStep } from '../../core/possibility/journal'
import { buildChapters, chapterProgress, type Chapter, type ChapterProgress } from '../../core/proof/chapters'
import { useV2Session } from '../../store/v2Session'

export interface V2ChapterState {
  chapter: Chapter
  done: boolean
  current: boolean
  /** Who this chapter identified — empty until it is done, so it never spoils. */
  revealed: string[]
}

export interface V2Progress {
  chapters: V2ChapterState[]
  progress: ChapterProgress
  current: Chapter | undefined
  /** Last step the player's own marks account for, narrated back at full detail. */
  latest: { step: DeductionStep; hint: Hint } | undefined
  /** Identifications still to come, the body's included. */
  revealsLeft: number
}

/**
 * How far down the proof's own list of identifications the player has got,
 * in the proof's order.
 *
 * `notebookFrontier` alone cannot carry this surface. It needs *every* step of
 * its prefix mirrored, and the journal interleaves eliminations for people who
 * are not named for a long time yet — so a player who places suspects without
 * pencil-marking every ruled-out cell leaves those unreflected, and their trail
 * sits at zero until the very last placement lands, then jumps to full. Naming a
 * suspect is what the player actually experiences as progress, so it advances
 * the trail too. Order still has to hold: identifying someone the proof only
 * reaches later counts for nothing until the ones before them are named.
 */
function identificationFrontier(journal: DeductionStep[], placements: PlayerNotebook['placements']): number {
  let frontier = 0
  for (const [index, step] of journal.entries()) {
    if (step.placed === undefined) continue
    if (placements[step.personId] !== step.placed) break
    frontier = index + 1
  }
  return frontier
}

/**
 * Where the player stands in the story. `honestFrontier` is the audit's own
 * `notebookFrontier` — it wins wherever it reaches further, so working the grid
 * with the pencil is never worth less than placing people outright.
 *
 * Split from the hook so it can be exercised against a simulated notebook
 * without a renderer.
 */
export function deriveProgress(
  journal: DeductionStep[],
  chapters: Chapter[],
  notebook: PlayerNotebook,
  honestFrontier: number,
): V2Progress {
  const frontier = Math.max(honestFrontier, identificationFrontier(journal, notebook.placements))
  const progress = chapterProgress(chapters, frontier)

  const chapterStates = chapters.map((chapter, index) => {
    const done = chapter.stepIndices.every((step) => step < frontier)
    return { chapter, done, current: !done && index === progress.current - 1, revealed: done ? chapter.resolves : [] }
  })

  const step = frontier > 0 ? journal[frontier - 1] : undefined
  return {
    chapters: chapterStates,
    progress,
    current: chapters[progress.current - 1],
    latest: step ? { step, hint: hintForStep(step, 4) } : undefined,
    revealsLeft: chapterStates.filter((s) => !s.done).reduce((left, s) => left + s.chapter.resolves.length, 0),
  }
}

/**
 * The player's real position in the proof, read off their own notebook rather
 * than a replay cursor: nothing here advances on reasoning the player has not
 * done (Claude/claude.md §30-32).
 */
export function useV2Progress(): V2Progress {
  const { journal, state, audit } = useV2Session()
  const chapters = useMemo(() => buildChapters(journal), [journal])
  const honest = audit.progress.frontierStep

  return useMemo(() => deriveProgress(journal, chapters, state.notebook, honest), [journal, chapters, state.notebook, honest])
}
