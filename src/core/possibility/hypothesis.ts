import { staticDomain } from '../constraints/domain'
import { cellKey } from '../model/geometry'
import type { Assignment, Puzzle } from '../model/types'
import type { ContradictionStrength } from './contradiction'
import { traceContradiction } from './contradiction'
import type { DeductionStep } from './journal'
import { propagate, propagateFrom } from './propagate'
import type { PropagationResult } from './propagate'

/**
 * What an assumption turned out to be worth. Deliberately four cases rather
 * than a boolean: "no contradiction" is NOT "confirmed", and a contradiction
 * the assumption had no part in proves nothing about the assumption.
 */
export type HypothesisVerdict =
  /** The assumption forces a contradiction. This — and only this — is a proof. */
  | 'refuted'
  /** Propagation completed a valid grid from it. Possible, never proven: another cell may complete too. */
  | 'completes'
  /** Propagation stalled with no contradiction. Nothing refutes it, nothing establishes it. */
  | 'open'
  /** The contradiction reached does not rest on the assumption — the puzzle itself is broken. */
  | 'unsound'

/** How short and direct the reductio is — the difference between "obvious" and "you had to see six moves ahead". */
export type RefutationStrength = ContradictionStrength

/** What the assumption added over what pure propagation already knew. */
export type HypothesisNovelty =
  /** A live candidate: asking is a real bifurcation. */
  | 'genuine'
  /** Pure propagation already pins this person to this cell — nothing was branched. */
  | 'alreadyProven'
  /** Pure propagation had already struck this cell out — the branch was dead before the question. */
  | 'alreadyExcluded'
  /** The person's own clues never allowed the cell at all. */
  | 'offBoard'

/** Where the impossibility came from, since not every refutation has a propagation chain. */
export type RefutationOrigin =
  /** The cell is outside the person's own static domain; no propagation was needed. */
  | 'ownClues'
  /** A candidate set was emptied mid-propagation — the chain below is the demonstration. */
  | 'chain'
  /** Nothing emptied, but the single completion the assumption forces fails full validation. */
  | 'finalCheck'

export interface Refutation {
  origin: RefutationOrigin
  /** Who ran out of places to be. */
  personId: string
  /** Id of the step that emptied their domain — the last line of the demonstration. */
  terminalStepId?: string
  /** Id of the step that states the assumption itself — the first line. */
  assumptionStepId?: string
  /**
   * Every step the contradiction rests on, in journal order. Premises always
   * precede their consumer, so this reads top-to-bottom as the proof itself:
   * each step's premises are satisfied by earlier steps of this same chain, or
   * are empty (grounded in the seed / the assumption).
   */
  chain: DeductionStep[]
  /** False when the contradiction was derivable without the assumption (see 'unsound'). */
  dependsOnAssumption: boolean
  /** chain.length — how many deductions the player must follow. */
  length: number
  /** Longest premise chain inside the refutation; 1 means "straight from the assumption". */
  depth: number
  /** Distinct people the argument had to travel through, in first-appearance order. */
  peopleInvolved: string[]
  strength: RefutationStrength
}

export interface HypothesisResult {
  personId: string
  /** The assumed cell key, "row:col". */
  cell: string
  verdict: HypothesisVerdict
  /** True only for 'refuted'. The absence of a contradiction never establishes an assumption. */
  proved: boolean
  novelty: HypothesisNovelty
  /**
   * The propagation actually performed under the assumption. When the cell is
   * excluded by the person's own clues no propagation is run and this is an
   * empty contradiction record.
   */
  run: PropagationResult
  /** Present for 'refuted' and 'unsound'. */
  refutation?: Refutation
  /**
   * What the assumption would force on everyone else ("if X were here, Y would
   * be there") — every person the run pinned to a single cell, the assumed one
   * included. Empty when the assumption is refuted.
   */
  entailed: Assignment
}

export interface HypothesisOptions {
  /** A `propagate(puzzle)` you already hold, reused for the novelty check instead of recomputing it. */
  baseline?: PropagationResult
}

/**
 * Reductio ad absurdum, instrumented. Forces `personId` onto `cell` as their
 * whole seed domain, runs the ordinary propagation engine on top, and reports
 * honestly which of the four things happened — with, when the assumption
 * collapses, the full ordered chain of deductions that killed it.
 */
export function hypothesize(puzzle: Puzzle, personId: string, cell: string, options: HypothesisOptions = {}): HypothesisResult {
  const person = puzzle.people.find((p) => p.id === personId)
  if (!person) throw new Error(`hypothesize: unknown person "${personId}"`)
  if (!puzzle.board.cellsByKey.has(cell)) throw new Error(`hypothesize: cell "${cell}" is not on the board`)

  const allowed = new Set(staticDomain(person.constraints, puzzle.board).map(cellKey))
  const baseline = options.baseline ?? propagate(puzzle)
  const novelty = noveltyOf(allowed, baseline, personId, cell)

  // The propagator bakes a person's own clues into their seed and never rechecks
  // them afterwards, so an assumption outside that seed has to be caught here —
  // otherwise it would propagate happily and look "consistent".
  if (!allowed.has(cell)) {
    return {
      personId,
      cell,
      verdict: 'refuted',
      proved: true,
      novelty,
      run: { status: 'contradiction', candidates: new Map(), journal: [], placements: {}, contradictionPersonId: personId },
      refutation: {
        origin: 'ownClues',
        personId,
        chain: [],
        dependsOnAssumption: true,
        length: 0,
        depth: 0,
        peopleInvolved: [personId],
        strength: 'immediate',
      },
      entailed: {},
    }
  }

  const run = propagateFrom(puzzle, new Map([[personId, new Set([cell])]]))
  const assumptionStepId = run.journal.find(
    (step) => step.personId === personId && step.premises.length === 0 && step.placed === cell,
  )?.id

  if (run.status === 'contradiction') {
    const refutation = buildRefutation(run, assumptionStepId)
    return {
      personId,
      cell,
      verdict: refutation.dependsOnAssumption ? 'refuted' : 'unsound',
      proved: refutation.dependsOnAssumption,
      novelty,
      run,
      refutation,
      entailed: {},
    }
  }

  // `propagateFrom` fills `placements` even when it reports 'stuck', which for a
  // fully determined grid means exactly one thing: every person is pinned yet the
  // completion fails validation (a denied `alone`/`notAlone` is the last family
  // propagation cannot see, and arc-consistency on the others only rules out what
  // *every* remaining partner cell forbids, so a doomed pair can still survive to
  // the final check). That is a refutation too, just one with no chain to show.
  if (run.status === 'stuck' && Object.keys(run.placements).length > 0) {
    return {
      personId,
      cell,
      verdict: 'refuted',
      proved: true,
      novelty,
      run,
      refutation: {
        origin: 'finalCheck',
        personId,
        assumptionStepId,
        chain: [],
        dependsOnAssumption: true,
        length: 0,
        depth: 0,
        peopleInvolved: puzzle.people.map((p) => p.id),
        strength: 'immediate',
      },
      entailed: {},
    }
  }

  return {
    personId,
    cell,
    verdict: run.status === 'solved' ? 'completes' : 'open',
    proved: false,
    novelty,
    run,
    entailed: pinnedPeople(run),
  }
}

export interface AlternativeSurvey {
  personId: string
  /** One result per cell the person's own clues allow, in domain order. */
  tested: HypothesisResult[]
  refutedCells: string[]
  survivingCells: string[]
  /** Set only when exactly one cell survives — the one case where hypothesis mode proves a placement. */
  provenCell?: string
}

/**
 * The honest counterpart to a single hypothesis: an assumption is only ever
 * *established* by refuting every alternative. Tests each cell the person's own
 * clues allow; if exactly one survives, that one is proven by exhaustion.
 * Costs one propagation per allowed cell — a deliberate tool, not something to
 * run on every keystroke.
 */
export function surveyAlternatives(puzzle: Puzzle, personId: string): AlternativeSurvey {
  const person = puzzle.people.find((p) => p.id === personId)
  if (!person) throw new Error(`surveyAlternatives: unknown person "${personId}"`)

  const baseline = propagate(puzzle)
  const cells = staticDomain(person.constraints, puzzle.board).map(cellKey)
  const tested = cells.map((cell) => hypothesize(puzzle, personId, cell, { baseline }))

  const refutedCells = tested.filter((t) => t.verdict === 'refuted').map((t) => t.cell)
  const survivingCells = tested.filter((t) => t.verdict !== 'refuted').map((t) => t.cell)

  return {
    personId,
    tested,
    refutedCells,
    survivingCells,
    provenCell: survivingCells.length === 1 ? survivingCells[0] : undefined,
  }
}

function noveltyOf(allowed: ReadonlySet<string>, baseline: PropagationResult, personId: string, cell: string): HypothesisNovelty {
  if (!allowed.has(cell)) return 'offBoard'
  const known = baseline.candidates.get(personId)
  if (!known || !known.has(cell)) return 'alreadyExcluded'
  return known.size === 1 ? 'alreadyProven' : 'genuine'
}

/** Everyone the run has narrowed to a single cell — what the assumption entails downstream. */
function pinnedPeople(run: PropagationResult): Assignment {
  const entailed: Assignment = {}
  for (const [id, set] of run.candidates) {
    if (set.size === 1) entailed[id] = [...set][0]
  }
  return entailed
}

/** Adds the assumption-specific reading (does the trace actually rest on it?) on top of the generic trace. */
function buildRefutation(run: PropagationResult, assumptionStepId: string | undefined): Refutation {
  const trace = traceContradiction(run)!
  const chainIds = new Set(trace.chain.map((step) => step.id))

  return {
    origin: 'chain',
    personId: trace.personId,
    terminalStepId: trace.terminalStepId,
    assumptionStepId,
    chain: trace.chain,
    dependsOnAssumption: trace.chain.length === 0 ? assumptionStepId === undefined : assumptionStepId !== undefined && chainIds.has(assumptionStepId),
    length: trace.length,
    depth: trace.depth,
    peopleInvolved: trace.peopleInvolved,
    strength: trace.strength,
  }
}
