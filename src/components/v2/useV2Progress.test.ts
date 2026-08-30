import { describe, expect, it } from 'vitest'
import { emptyNotebook, notebookFrontier, withExclusion, type PlayerNotebook } from '../../core/hints/notebook'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import { propagate } from '../../core/possibility/propagate'
import { buildChapters } from '../../core/proof/chapters'
import { cormoranDef } from '../../data/v2/premier-cas'
import { deriveProgress } from './useV2Progress'

const SOLUTION: Record<string, string> = {
  oscar: '4:1',
  victoire: '2:2',
  pascal: '5:3',
  helene: '1:4',
  armand: '0:5',
}

const puzzle = loadPuzzle(cormoranDef)
const journal = propagate(puzzle).journal
const chapters = buildChapters(journal)

function notebookWith(...people: string[]): PlayerNotebook {
  return { placements: Object.fromEntries(people.map((id) => [id, SOLUTION[id]])), exclusions: {} }
}

function progressFor(notebook: PlayerNotebook) {
  return deriveProgress(journal, chapters, notebook, notebookFrontier(journal, notebook))
}

describe('the investigation trail follows the player, not a replay cursor', () => {
  it('starts with nothing established and every chapter still to come', () => {
    const state = progressFor(emptyNotebook())

    expect(state.progress.stepsDone).toBe(0)
    expect(state.progress.ratio).toBe(0)
    expect(state.progress.done).toBe(false)
    expect(state.latest).toBeUndefined()
    expect(state.chapters.every((c) => !c.done)).toBe(true)
    expect(state.chapters[0].current).toBe(true)
    expect(state.revealsLeft).toBe(puzzle.people.length)
  })

  it('never reveals who a chapter identifies before the player has got there', () => {
    const state = progressFor(notebookWith('oscar'))
    for (const chapter of state.chapters) {
      if (!chapter.done) expect(chapter.revealed).toEqual([])
    }
  })

  it('closes the opening chapter once the player has genuinely placed Oscar', () => {
    const state = progressFor(notebookWith('oscar'))

    expect(state.chapters[0].done).toBe(true)
    expect(state.chapters[0].revealed).toEqual(['oscar'])
    expect(state.progress.stepsDone).toBeGreaterThan(0)
    expect(state.latest?.step.personId).toBe('oscar')
    expect(state.latest?.hint.i18nKey).toBe('hint.l4.nakedSingle')
    expect(state.revealsLeft).toBe(4)
  })

  it('advances chapter by chapter as the chain is followed in the order the proof forces', () => {
    const closed = ['oscar', 'victoire', 'pascal', 'helene', 'armand'].map((_, i) =>
      progressFor(notebookWith(...['oscar', 'victoire', 'pascal', 'helene', 'armand'].slice(0, i + 1))),
    )
    expect(closed.map((s) => s.progress.completed)).toEqual([1, 2, 3, 4, 5])
    expect(closed.map((s) => s.revealsLeft)).toEqual([4, 3, 2, 1, 0])
    expect(closed.at(-1)!.progress.done).toBe(true)
    expect(closed.at(-1)!.progress.ratio).toBe(1)
  })

  it('gives a conclusion reached out of order no chapter of its own (§30: proof, not luck)', () => {
    // The body's cell is right, but he is the last name the proof reaches: with
    // nobody else identified, guessing him closes nothing and reveals nobody.
    const guessed = progressFor(notebookWith('armand'))
    expect(guessed.chapters.every((c) => !c.done)).toBe(true)
    expect(guessed.revealsLeft).toBe(puzzle.people.length)
    expect(guessed.progress.stepsDone).toBeLessThan(progressFor(notebookWith('oscar')).progress.stepsDone)
  })

  it('advances on crossings-out alone, before anyone at all is placed', () => {
    const first = journal[0]
    let notebook = emptyNotebook()
    for (const cell of first.removed) notebook = withExclusion(notebook, first.personId, cell)

    expect(progressFor(notebook).progress.stepsDone).toBeGreaterThan(0)
    expect(progressFor(notebook).latest?.step.id).toBe(first.id)
  })

  it('stalls at the step that refutes a wrong placement rather than skipping past it', () => {
    const wrong = progressFor({ placements: { oscar: '3:0' }, exclusions: {} })
    expect(wrong.progress.done).toBe(false)
    expect(wrong.progress.stepsDone).toBeLessThan(journal.length)
  })
})
