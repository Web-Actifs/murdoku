import type { DeductionStep } from '../possibility/journal'
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
 * How a single player mark stands against the proof, judged only up to the
 * `frontier` the caller hands in — never against the finished solution, and
 * never against reasoning the player has not reached yet. That second rule is
 * what keeps this from being a free "check my answer" oracle: a correct guess
 * placed ahead of the proof reads as `open`, exactly like a wrong one — the
 * player only learns which once their own frontier catches up to it.
 *
 * - `established` — the proof already closes on this, within reach.
 * - `refuted` — the proof already rules this out, within reach.
 * - `open` — neither is true yet at this frontier, whatever happens later.
 */
export type MarkVerdict = 'established' | 'refuted' | 'open'

export interface MarkAnnotation {
  personId: string
  cell: string
  kind: MarkKind
  verdict: MarkVerdict
  /** Steps consumed before the journal settles this mark; unset while it's still `open`. */
  decisiveStep?: number
  /** The step that settles it — undefined when the seed alone already did. */
  decisiveStepId?: string
}

export interface NotebookProgress {
  /** Leading journal steps the notebook already reflects — the player's honest position. */
  frontierStep: number
  /** First step the notebook does not account for; undefined when the proof is fully mirrored. */
  frontierStepId?: string
}

export interface NotebookAnnotation {
  marks: MarkAnnotation[]
  progress: NotebookProgress
}

/**
 * One suspect's status against the proof, for the roster's "faire le point"
 * line — the unit the UI actually renders, one card at a time, rather than the
 * whole-board `marks` list `annotate` produces.
 */
export interface PersonStatus {
  personId: string
  /** The player's own placement, annotated — undefined while unplaced. */
  placement?: MarkAnnotation
  /** The player's own pencil exclusions, annotated. */
  exclusions: MarkAnnotation[]
  /** Candidate cells the proof has narrowed them to as of the frontier — never further. */
  candidatesNow: string[]
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

/**
 * A mark only reads as `established`/`refuted` when the step that settles it
 * sits at or before `frontier` — a refutation the proof reaches *later* stays
 * `open` here, on purpose: revealing it early would make this a solver, not a
 * notebook. `decisiveStep`/`decisiveStepId` follow the same rule, so nothing
 * downstream can accidentally narrate a step the player hasn't earned yet.
 */
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

  const verdict: MarkVerdict =
    refutedAt !== undefined && refutedAt <= frontier
      ? 'refuted'
      : provenAt !== undefined && provenAt <= frontier
        ? 'established'
        : 'open'

  const decisiveStep = verdict === 'open' ? undefined : (refutedAt ?? provenAt)

  return {
    personId,
    cell,
    kind,
    verdict,
    decisiveStep,
    decisiveStepId: decisiveStep !== undefined && decisiveStep > 0 ? journal[decisiveStep - 1].id : undefined,
  }
}

/**
 * Confronts the player's notebook with the solver's proof, mark by mark
 * (Claude/claude.md §30-32). Nothing here re-derives the puzzle: the journal is
 * the only authority.
 */
export function annotate(journal: DeductionStep[], notebook: PlayerNotebook): NotebookAnnotation {
  const timeline = buildTimeline(journal)
  const frontier = notebookFrontier(journal, notebook)
  const marks: MarkAnnotation[] = []

  for (const [personId, cell] of Object.entries(notebook.placements)) {
    if (cell !== undefined) marks.push(annotateMark(timeline, journal, frontier, personId, cell, 'placement'))
  }
  for (const [personId, cells] of Object.entries(notebook.exclusions)) {
    for (const cell of cells) marks.push(annotateMark(timeline, journal, frontier, personId, cell, 'exclusion'))
  }

  return {
    marks,
    progress: { frontierStep: frontier, frontierStepId: journal[frontier]?.id },
  }
}

/**
 * One suspect's line for the roster's "faire le point" view. Takes `frontier`
 * explicitly rather than deriving it, because the honest reading combines
 * `notebookFrontier` with the story's own identification frontier (see
 * `useV2Progress.deriveProgress`) — a caller-supplied frontier keeps this
 * function from silently disagreeing with what the player sees elsewhere.
 */
export function personStatus(journal: DeductionStep[], notebook: PlayerNotebook, frontier: number, personId: string): PersonStatus {
  const timeline = buildTimeline(journal)
  const placedCell = notebook.placements[personId]
  const placement = placedCell !== undefined ? annotateMark(timeline, journal, frontier, personId, placedCell, 'placement') : undefined
  const exclusions = (notebook.exclusions[personId] ?? []).map((cell) => annotateMark(timeline, journal, frontier, personId, cell, 'exclusion'))
  const candidatesNow = domainAt(timeline, personId, frontier) ?? []

  return { personId, placement, exclusions, candidatesNow }
}
