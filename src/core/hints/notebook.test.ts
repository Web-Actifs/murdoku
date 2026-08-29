import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import { propagate } from '../possibility/propagate'
import { cascadeDef } from '../testing/fixtures'
import { getHint } from './getHint'
import {
  annotate,
  candidatesAfter,
  emptyNotebook,
  isStepReflectedInNotebook,
  notebookFrom,
  notebookFrontier,
  toAssignment,
  withExclusion,
  withPlacement,
} from './notebook'
import type { MarkAnnotation, MarkVerdict, PlayerNotebook } from './notebook'

const puzzle = loadPuzzle(cascadeDef)
const { journal, placements } = propagate(puzzle)

function markFor(marks: MarkAnnotation[], personId: string, cell: string, kind: MarkAnnotation['kind'] = 'placement'): MarkAnnotation {
  return marks.find((mark) => mark.personId === personId && mark.cell === cell && mark.kind === kind)!
}

function verdictOf(notebook: PlayerNotebook, personId: string, cell: string, kind: MarkAnnotation['kind'] = 'placement'): MarkVerdict {
  return markFor(annotate(journal, notebook).marks, personId, cell, kind).verdict
}

describe('candidatesAfter — the solver state at an instant, not at the end', () => {
  it('replays before/after rather than reporting the final domains', () => {
    expect(candidatesAfter(journal, 0).get('brycen')).toEqual(['0:0', '0:1'])
    expect(candidatesAfter(journal, 1).get('brycen')).toEqual(['0:1'])
    // Diane is untouched for most of the proof: her cell is still open at step 4.
    expect(candidatesAfter(journal, 4).get('diane')).toEqual(['1:2', '2:2'])
    expect(candidatesAfter(journal, journal.length).get('diane')).toEqual(['2:2'])
  })
})

describe('notebookFrontier — how far the player has honestly got', () => {
  it('starts at zero on an empty notebook', () => {
    expect(notebookFrontier(journal, emptyNotebook())).toBe(0)
  })

  it('advances on the player own negative marks, which an assignment cannot express', () => {
    const crossedOut = withExclusion(emptyNotebook(), 'brycen', '0:0')
    expect(isStepReflectedInNotebook(journal[0], crossedOut)).toBe(true)
    // The elimination is mirrored, the placement that follows from it is not yet.
    expect(notebookFrontier(journal, crossedOut)).toBe(1)
  })

  it('reaches the end of the proof once the whole solution is written down', () => {
    const solved = Object.entries(placements).reduce((book, [personId, cell]) => withPlacement(book, personId, cell), emptyNotebook())
    expect(notebookFrontier(journal, solved)).toBe(journal.length)
  })
})

describe('annotate — telling a deduction from a lucky guess', () => {
  it('calls a mark justified when the journal already proves it at that point', () => {
    const book = withPlacement(emptyNotebook(), 'brycen', '0:1')
    const report = annotate(journal, book)
    const mark = markFor(report.marks, 'brycen', '0:1')

    expect(mark.verdict).toBe('justified')
    expect(mark.leap).toBe(0)
    expect(mark.decisiveStepId).toBe('d0')
    expect(report.disciplined).toBe(true)
    expect(report.counts).toMatchObject({ justified: 1, premature: 0, contradicted: 0 })
  })

  it('calls a correct-but-unearned placement premature, and says how far ahead it is', () => {
    // Diane really is on 2:2, but nothing in the journal narrows her down before step 5.
    const book = withPlacement(emptyNotebook(), 'diane', '2:2')
    const report = annotate(journal, book)
    const mark = markFor(report.marks, 'diane', '2:2')

    expect(mark.verdict).toBe('premature')
    expect(mark.cell).toBe(placements.diane)
    expect(mark.decisiveStep).toBe(5)
    expect(mark.decisiveStepId).toBe('d4')
    expect(mark.leap).toBe(5)
    expect(report.disciplined).toBe(false)
  })

  it('reports the jump as a gap between the player chain depth and the depth of what they wrote down', () => {
    const { progress } = annotate(journal, withPlacement(emptyNotebook(), 'diane', '2:2'))
    expect(progress.frontierStep).toBe(0)
    expect(progress.frontierStepId).toBe('d0')
    expect(progress.playerDepth).toBe(0)
    expect(progress.reachedDepth).toBe(5)
    expect(progress.solverDepth).toBe(6)
    expect(progress.maxLeap).toBe(5)
  })

  it('calls an exclusion false when the journal proves the person is on that very cell', () => {
    // 2:2 is still a live candidate for Diane at this stage — and it is her cell.
    expect(candidatesAfter(journal, 0).get('diane')).toContain('2:2')
    const book = withExclusion(emptyNotebook(), 'diane', '2:2')
    const mark = markFor(annotate(journal, book).marks, 'diane', '2:2', 'exclusion')

    expect(mark.verdict).toBe('contradicted')
    expect(mark.kind).toBe('exclusion')
    expect(mark.decisiveStep).toBe(5)
    expect(mark.leap).toBe(5)
  })

  it('separates a refutation the player could already see from one they could not', () => {
    // Crossing out the cell the journal has *already* pinned her to: leap 0, evidence ignored.
    const contradictsItself = withExclusion(withPlacement(emptyNotebook(), 'brycen', '0:1'), 'brycen', '0:1')
    const ignored = markFor(annotate(journal, contradictsItself).marks, 'brycen', '0:1', 'exclusion')
    expect(ignored.verdict).toBe('contradicted')
    expect(ignored.leap).toBe(0)

    // A wrong placement no step has refuted yet: same verdict, but it was a guess.
    const guessed = markFor(annotate(journal, withPlacement(emptyNotebook(), 'austin', '0:0')).marks, 'austin', '0:0')
    expect(guessed.verdict).toBe('contradicted')
    expect(guessed.leap).toBeGreaterThan(0)
  })

  it('calls a premature exclusion premature rather than justified', () => {
    expect(verdictOf(withExclusion(emptyNotebook(), 'diane', '1:2'), 'diane', '1:2', 'exclusion')).toBe('premature')
  })

  it('treats crossing out a cell that was never possible as trivially justified', () => {
    const mark = markFor(annotate(journal, withExclusion(emptyNotebook(), 'diane', '0:0')).marks, 'diane', '0:0', 'exclusion')
    expect(mark.verdict).toBe('justified')
    expect(mark.decisiveStep).toBe(0)
    expect(mark.decisiveStepId).toBeUndefined()
  })

  it('says unproven when the journal settles the mark neither way', () => {
    expect(verdictOf(withPlacement(emptyNotebook(), 'ghost', '0:0'), 'ghost', '0:0')).toBe('unproven')
  })

  it('reports a fully deduced solution as disciplined, with no leap at all', () => {
    const solved = Object.entries(placements).reduce((book, [personId, cell]) => withPlacement(book, personId, cell), emptyNotebook())
    const report = annotate(journal, solved)

    expect(report.counts.justified).toBe(3)
    expect(report.disciplined).toBe(true)
    expect(report.progress.maxLeap).toBe(0)
    expect(report.progress.playerDepth).toBe(report.progress.solverDepth)
  })

  it('leaves an empty notebook with no marks and no verdict', () => {
    const report = annotate(journal, emptyNotebook())
    expect(report.marks).toEqual([])
    expect(report.disciplined).toBe(false)
    expect(report.progress.reachedDepth).toBe(0)
  })
})

describe('the notebook layers on top of PlayerAssignment instead of replacing it', () => {
  it('round-trips through the assignment getHint already consumes', () => {
    const book = withExclusion(withPlacement(emptyNotebook(), 'brycen', '0:1'), 'brycen', '0:0')
    expect(toAssignment(book)).toEqual({ brycen: '0:1' })
    expect(getHint(journal, toAssignment(book), 5).apply).toEqual({ personId: 'austin', cell: placements.austin })
  })

  it('lifts an existing player grid without inventing negative marks', () => {
    const lifted = notebookFrom({ brycen: '0:1' })
    expect(lifted.exclusions).toEqual({})
    expect(annotate(journal, lifted).counts.justified).toBe(1)
  })

  it('never mutates the notebook it is given', () => {
    const book = emptyNotebook()
    withPlacement(book, 'brycen', '0:1')
    withExclusion(book, 'brycen', '0:0')
    expect(book).toEqual({ placements: {}, exclusions: {} })
  })
})
