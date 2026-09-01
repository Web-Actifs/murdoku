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
  personStatus,
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

describe('annotate — never revealing more than the player has earned (Claude/claude.md §30-32)', () => {
  it('calls a mark established when the journal already proves it within the frontier', () => {
    const book = withPlacement(emptyNotebook(), 'brycen', '0:1')
    const report = annotate(journal, book)
    const mark = markFor(report.marks, 'brycen', '0:1')

    expect(mark.verdict).toBe('established')
    expect(mark.decisiveStepId).toBe('d0')
  })

  /**
   * The property the whole redesign hinges on: a placement that happens to be
   * *correct* but sits ahead of the proof must read exactly like an unproven
   * guess, not like a quiet "yes". Anything else turns the notebook into a
   * free, unlimited "check my answer" button.
   */
  it('does not tell a correct-but-unearned placement apart from an open guess', () => {
    // Diane really is on 2:2, but nothing in the journal narrows her down before step 5.
    const book = withPlacement(emptyNotebook(), 'diane', '2:2')
    const report = annotate(journal, book)
    const mark = markFor(report.marks, 'diane', '2:2')

    expect(mark.cell).toBe(placements.diane)
    expect(mark.verdict).toBe('open')
    expect(mark.decisiveStep).toBeUndefined()
    expect(mark.decisiveStepId).toBeUndefined()
  })

  it('calls an exclusion refuted once the journal proves, within reach, that the person is on that very cell', () => {
    // 2:2 is still a live candidate for Diane at this stage — and it is her cell.
    expect(candidatesAfter(journal, 0).get('diane')).toContain('2:2')
    const book = withExclusion(emptyNotebook(), 'diane', '2:2')
    const mark = markFor(annotate(journal, book).marks, 'diane', '2:2', 'exclusion')

    expect(mark.verdict).toBe('open')
    expect(mark.kind).toBe('exclusion')
  })

  it('separates a refutation the player could already see from one still out of reach', () => {
    // Crossing out the very cell the journal has *already* pinned her to, within
    // the frontier this notebook itself reaches: a refutation the player ignored.
    const contradictsItself = withExclusion(withPlacement(emptyNotebook(), 'brycen', '0:1'), 'brycen', '0:1')
    const ignored = markFor(annotate(journal, contradictsItself).marks, 'brycen', '0:1', 'exclusion')
    expect(ignored.verdict).toBe('refuted')
    expect(ignored.decisiveStep).toBeDefined()

    // A wrong placement no step has refuted *within this notebook's own frontier*
    // yet: it stays open, exactly like the correct-but-early guess above — a
    // player cannot tell the two apart until their own reasoning catches up.
    const guessed = markFor(annotate(journal, withPlacement(emptyNotebook(), 'austin', '0:0')).marks, 'austin', '0:0')
    expect(guessed.verdict).toBe('open')
    expect(guessed.decisiveStep).toBeUndefined()
  })

  it('calls a premature exclusion open rather than established', () => {
    expect(verdictOf(withExclusion(emptyNotebook(), 'diane', '1:2'), 'diane', '1:2', 'exclusion')).toBe('open')
  })

  it('treats crossing out a cell that was never possible as trivially established', () => {
    const mark = markFor(annotate(journal, withExclusion(emptyNotebook(), 'diane', '0:0')).marks, 'diane', '0:0', 'exclusion')
    expect(mark.verdict).toBe('established')
    expect(mark.decisiveStep).toBe(0)
    expect(mark.decisiveStepId).toBeUndefined()
  })

  it('leaves a mark open when the journal never touches that person at all', () => {
    expect(verdictOf(withPlacement(emptyNotebook(), 'ghost', '0:0'), 'ghost', '0:0')).toBe('open')
  })

  it('calls a fully self-deduced solution established across the board', () => {
    const solved = Object.entries(placements).reduce((book, [personId, cell]) => withPlacement(book, personId, cell), emptyNotebook())
    const report = annotate(journal, solved)

    expect(report.marks.length).toBeGreaterThan(0)
    expect(report.marks.every((mark) => mark.verdict === 'established')).toBe(true)
  })

  it('leaves an empty notebook with no marks at all', () => {
    const report = annotate(journal, emptyNotebook())
    expect(report.marks).toEqual([])
    expect(report.progress.frontierStep).toBe(0)
  })
})

describe('personStatus — the roster card, one suspect at a time', () => {
  it('mirrors candidatesAfter for someone not yet placed', () => {
    expect(personStatus(journal, emptyNotebook(), 0, 'diane').candidatesNow).toEqual(candidatesAfter(journal, 0).get('diane'))
    expect(personStatus(journal, emptyNotebook(), journal.length, 'diane').candidatesNow).toEqual([placements.diane])
  })

  it('reports an established placement', () => {
    const book = withPlacement(emptyNotebook(), 'brycen', '0:1')
    const status = personStatus(journal, book, notebookFrontier(journal, book), 'brycen')
    expect(status.placement?.verdict).toBe('established')
  })

  it('reports a correct-but-early placement as open, not established', () => {
    const book = withPlacement(emptyNotebook(), 'diane', '2:2')
    const status = personStatus(journal, book, notebookFrontier(journal, book), 'diane')
    expect(status.placement?.verdict).toBe('open')
    expect(status.placement?.decisiveStep).toBeUndefined()
  })

  it('reports a refuted pencil mark among a person’s exclusions', () => {
    const book = withExclusion(withPlacement(emptyNotebook(), 'brycen', '0:1'), 'brycen', '0:1')
    const status = personStatus(journal, book, notebookFrontier(journal, book), 'brycen')
    expect(status.exclusions.map((m) => m.cell)).toContain('0:1')
    expect(status.exclusions.find((m) => m.cell === '0:1')?.verdict).toBe('refuted')
  })

  it('leaves everything empty for someone the journal never touches', () => {
    const status = personStatus(journal, emptyNotebook(), 0, 'ghost')
    expect(status.placement).toBeUndefined()
    expect(status.exclusions).toEqual([])
    expect(status.candidatesNow).toEqual([])
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
    expect(annotate(journal, lifted).marks.every((mark) => mark.verdict === 'established')).toBe(true)
  })

  it('never mutates the notebook it is given', () => {
    const book = emptyNotebook()
    withPlacement(book, 'brycen', '0:1')
    withExclusion(book, 'brycen', '0:0')
    expect(book).toEqual({ placements: {}, exclusions: {} })
  })
})
