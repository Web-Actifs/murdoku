import type { DeductionStep } from '../possibility/journal'
import { chainDepths } from '../proof/difficulty'
import type { PlayerAssignment } from './types'

/**
 * The player's own possibility state, kept alongside the solver's
 * (Claude/claude.md §30): the engine holds two parallel views of the same grid
 * and the interesting information lives in the gap between them.
 *
 * `PlayerAssignment` cannot express "I have ruled this cell out for her" — only
 * "she is here" — so it cannot tell a deduction apart from a lucky guess. This
 * adds the player's own negative marks, which is what makes the distinction
 * possible. It is additive: `toAssignment` bridges back to everything that
 * already consumes `PlayerAssignment`, `getHint` included.
 */
export interface PlayerNotebook {
  /** personId -> the cell the player has committed them to. */
  placements: Record<string, string | undefined>
  /** personId -> cells the player has crossed out themselves. */
  exclusions: Record<string, string[]>
}

export type MarkKind = 'placement' | 'exclusion'

/**
 * How a single player mark stands against the proof *at the point the player has
 * actually reached*, not against the finished solution:
 *
 * - `justified` — the journal already establishes it; the player deduced it.
 * - `premature` — the journal does establish it, but only further down the
 *   chain than the player has got: right answer, guessed. This is the case V1
 *   could not see at all, and the one the whole V2 investigation feel hinges on.
 * - `contradicted` — the journal refutes it. When `leap` is above zero the
 *   refutation was not yet available either, so it was a wrong guess rather than
 *   evidence ignored.
 * - `unproven` — propagation never settles this mark either way (a stuck puzzle,
 *   or a mark about someone the journal never touches).
 */
export type MarkVerdict = 'justified' | 'premature' | 'contradicted' | 'unproven'

export interface MarkAnnotation {
  personId: string
  cell: string
  kind: MarkKind
  verdict: MarkVerdict
  /** Steps consumed before the journal settles this mark; undefined when it never does. */
  decisiveStep?: number
  /** The step that settles it — undefined when the seed alone already did. */
  decisiveStepId?: string
  /** How far past the player's own frontier that decisive step sits; 0 means "reachable now". */
  leap: number
}

export interface NotebookProgress {
  /** Leading journal steps the notebook already reflects — the player's honest position. */
  frontierStep: number
  /** First step the notebook does not account for; undefined when the proof is fully mirrored. */
  frontierStepId?: string
  /** Chain depth the player has genuinely worked through. */
  playerDepth: number
  /** Chain depth of the deepest conclusion the player has written down, leaps included. */
  reachedDepth: number
  /** Chain depth of the whole proof, for the "5 of 6" reading. */
  solverDepth: number
  /** Largest gap between a written-down conclusion and the reasoning that supports it. */
  maxLeap: number
}

export interface NotebookAnnotation {
  marks: MarkAnnotation[]
  counts: Record<MarkVerdict, number>
  progress: NotebookProgress
  /** Every mark is earned: the player is deducing, not probing. */
  disciplined: boolean
}

export function emptyNotebook(): PlayerNotebook {
  return { placements: {}, exclusions: {} }
}

/** Lifts the existing player grid into a notebook; it simply has no negative marks yet. */
export function notebookFrom(player: PlayerAssignment): PlayerNotebook {
  return { placements: { ...player }, exclusions: {} }
}

/** Bridge back to the `PlayerAssignment` layer — `getHint` keeps working unchanged. */
export function toAssignment(notebook: PlayerNotebook): PlayerAssignment {
  return { ...notebook.placements }
}

export function withPlacement(notebook: PlayerNotebook, personId: string, cell: string): PlayerNotebook {
  return { ...notebook, placements: { ...notebook.placements, [personId]: cell } }
}

export function withExclusion(notebook: PlayerNotebook, personId: string, cell: string): PlayerNotebook {
  const current = notebook.exclusions[personId] ?? []
  if (current.includes(cell)) return notebook
  return { ...notebook, exclusions: { ...notebook.exclusions, [personId]: [...current, cell] } }
}

/**
 * Like `isStepReflected`, but a notebook can also mirror an elimination *as* an
 * elimination: crossing out every cell the step removes counts, where the
 * assignment-only version had to wait for a placement to infer it.
 */
export function isStepReflectedInNotebook(step: DeductionStep, notebook: PlayerNotebook): boolean {
  const placed = notebook.placements[step.personId]
  if (step.placed !== undefined) return placed === step.placed
  if (placed !== undefined && !step.removed.includes(placed)) return true
  const crossed = notebook.exclusions[step.personId]
  if (!crossed || step.removed.length === 0) return false
  return step.removed.every((cell) => crossed.includes(cell))
}

/**
 * How far into the proof the player legitimately stands: the longest *prefix* of
 * the journal their notebook accounts for. Deliberately a prefix and not a count
 * of reflected steps — a conclusion copied from further down the chain does not
 * move the frontier, which is exactly how a leap becomes visible.
 */
export function notebookFrontier(journal: DeductionStep[], notebook: PlayerNotebook): number {
  const first = journal.findIndex((step) => !isStepReflectedInNotebook(step, notebook))
  return first === -1 ? journal.length : first
}

interface DomainChange {
  /** Number of journal steps consumed for this state to hold. */
  at: number
  domain: string[]
}

interface Timeline {
  initial: Map<string, string[]>
  changes: Map<string, DomainChange[]>
}

/**
 * Replays the journal into a per-person candidate history out of `before`/`after`
 * alone, so any point in the proof can be queried — the final candidate sets
 * would collapse "proved at step 1" and "proved at step 12" into one answer.
 */
function buildTimeline(journal: DeductionStep[]): Timeline {
  const initial = new Map<string, string[]>()
  const changes = new Map<string, DomainChange[]>()

  for (const [index, step] of journal.entries()) {
    if (!initial.has(step.personId)) initial.set(step.personId, step.before)
    const list = changes.get(step.personId) ?? []
    list.push({ at: index + 1, domain: step.after })
    changes.set(step.personId, list)
  }
  return { initial, changes }
}

/** The person's candidate set once `steps` steps of the journal have run. */
function domainAt(timeline: Timeline, personId: string, steps: number): string[] | undefined {
  const seed = timeline.initial.get(personId)
  if (!seed) return undefined
  let domain = seed
  for (const change of timeline.changes.get(personId) ?? []) {
    if (change.at > steps) break
    domain = change.domain
  }
  return domain
}

/**
 * Everyone's candidate set once `steps` steps of the journal have run — the
 * solver's side of the mirror, frozen at an arbitrary point of the proof.
 * People the journal never touches are absent rather than guessed at.
 */
export function candidatesAfter(journal: DeductionStep[], steps: number): Map<string, string[]> {
  const timeline = buildTimeline(journal)
  const snapshot = new Map<string, string[]>()
  for (const personId of timeline.initial.keys()) {
    snapshot.set(personId, domainAt(timeline, personId, steps) ?? [])
  }
  return snapshot
}

/**
 * The two moments that can settle a mark, found by walking the person's domain
 * only where it actually changes. Candidate sets never grow, so for a given cell
 * only one of the two can happen: the domain either closes down onto that cell
 * or drops it, never both.
 */
function settlementOf(timeline: Timeline, personId: string, cell: string): { singletonAt?: number; absentAt?: number } {
  const seed = timeline.initial.get(personId)
  if (!seed) return {}

  let singletonAt: number | undefined
  let absentAt: number | undefined

  const states: DomainChange[] = [{ at: 0, domain: seed }, ...(timeline.changes.get(personId) ?? [])]
  for (const { at, domain } of states) {
    if (singletonAt === undefined && domain.length === 1 && domain[0] === cell) singletonAt = at
    if (absentAt === undefined && !domain.includes(cell)) absentAt = at
  }
  return { singletonAt, absentAt }
}

function annotateMark(
  timeline: Timeline,
  journal: DeductionStep[],
  frontier: number,
  personId: string,
  cell: string,
  kind: MarkKind,
): MarkAnnotation {
  const { singletonAt, absentAt } = settlementOf(timeline, personId, cell)
  // A placement is proven by the domain closing onto the cell and refuted by the
  // cell leaving the domain; an exclusion is the mirror image of both.
  const provenAt = kind === 'placement' ? singletonAt : absentAt
  const refutedAt = kind === 'placement' ? absentAt : singletonAt

  const decisiveStep = refutedAt ?? provenAt
  const verdict: MarkVerdict =
    refutedAt !== undefined ? 'contradicted' : provenAt === undefined ? 'unproven' : provenAt <= frontier ? 'justified' : 'premature'

  return {
    personId,
    cell,
    kind,
    verdict,
    decisiveStep,
    decisiveStepId: decisiveStep !== undefined && decisiveStep > 0 ? journal[decisiveStep - 1].id : undefined,
    leap: decisiveStep === undefined ? 0 : Math.max(0, decisiveStep - frontier),
  }
}

/**
 * Confronts the player's notebook with the solver's proof, mark by mark
 * (Claude/claude.md §30-32). Nothing here re-derives the puzzle: the journal is
 * the only authority, which is why a mark can be *right* and still be reported
 * as premature.
 */
export function annotate(journal: DeductionStep[], notebook: PlayerNotebook): NotebookAnnotation {
  const timeline = buildTimeline(journal)
  const frontier = notebookFrontier(journal, notebook)
  const depths = chainDepths(journal)
  const marks: MarkAnnotation[] = []

  for (const [personId, cell] of Object.entries(notebook.placements)) {
    if (cell !== undefined) marks.push(annotateMark(timeline, journal, frontier, personId, cell, 'placement'))
  }
  for (const [personId, cells] of Object.entries(notebook.exclusions)) {
    for (const cell of cells) marks.push(annotateMark(timeline, journal, frontier, personId, cell, 'exclusion'))
  }

  const counts: Record<MarkVerdict, number> = { justified: 0, premature: 0, contradicted: 0, unproven: 0 }
  for (const mark of marks) counts[mark.verdict] += 1

  const depthOf = (steps: number): number => (steps > 0 ? (depths.get(journal[steps - 1].id) ?? 0) : 0)
  const playerDepth = depthOf(frontier)
  const reachedDepth = marks
    .filter((mark) => mark.verdict === 'justified' || mark.verdict === 'premature')
    .reduce((deepest, mark) => Math.max(deepest, depthOf(mark.decisiveStep ?? 0)), playerDepth)

  return {
    marks,
    counts,
    progress: {
      frontierStep: frontier,
      frontierStepId: journal[frontier]?.id,
      playerDepth,
      reachedDepth,
      solverDepth: journal.length === 0 ? 0 : Math.max(...depths.values()),
      maxLeap: marks.reduce((widest, mark) => Math.max(widest, mark.leap), 0),
    },
    disciplined: marks.length > 0 && counts.justified === marks.length,
  }
}
