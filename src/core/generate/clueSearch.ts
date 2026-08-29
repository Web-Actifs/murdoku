import { staticDomain, staticDomainForConstraint } from '../constraints/domain'
import type { Constraint } from '../constraints/types'
import type { Assignment, PersonDef, Puzzle } from '../model/types'
import { propagate } from '../possibility/propagate'
import type { PuzzleDifficulty } from '../proof/difficulty'
import { weightedPick, type Random } from './random'
import { puzzleWithClues } from './shell'
import { verifyGenerated, type RejectionReason } from './verify'

export interface ClueSearchOptions {
  /** Ceiling on clues added during the growth phase, before pruning. */
  maxClues?: number
  /**
   * How many people may be nailed to a single cell by their own clues alone.
   * Defaults to 0, the standard the hand-written Cormoran sets: every opening
   * move has to come from locked candidates, never from a testimony that hands
   * over a cell on its own — the V1 defect V2 exists to prevent. Raise it to 1
   * or 2 if a tighter shell can't produce anything at 0.
   */
  maxSelfPinned?: number
}

export type ClueSearchResult =
  | { ok: true; clues: Map<string, Constraint[]>; difficulty: PuzzleDifficulty; murdererId: string; clueCount: number }
  | { ok: false; reason: RejectionReason | 'clue-budget-exhausted' | 'too-many-self-pinned' }

/**
 * How eagerly a clue kind is drawn during growth. Relational clues are what turn
 * a pile of independent statements into a chain, but they can't *start* one —
 * arc-consistency only bites once the partner's own domain has shrunk — so the
 * weights keep static grounding and relations roughly balanced in aggregate,
 * rather than favouring either. `alone` now closes a whole zone once its speaker
 * is committed to one, which is worth about as much as a relation; `notAlone`
 * stays lighter because it only bites when a zone has run out of possible
 * company, which is a much rarer state of the board.
 */
const KIND_WEIGHT: Record<Constraint['type'], number> = {
  inZone: 2.5,
  onObjectType: 2.5,
  adjacentToObjectType: 2.5,
  inRow: 1.5,
  inColumn: 1.5,
  withPerson: 1,
  distance: 0.8,
  direction: 0.5,
  alone: 1.2,
  notAlone: 0.5,
  /** Never read: growthWeight unwraps a denial and weighs the clue inside it. */
  not: 0,
}

/**
 * How much lighter a denial draws than the same clue stated plainly. A denial
 * cuts far less on average — it only bites once the partner (or the complement
 * of a room) leaves no way out — and the enumerator proposes one for every
 * candidate, so roughly five sixths of the pool is now denials. Weighing them
 * per-clue at the same rate would hand the growth phase a dossier made almost
 * entirely of things that did *not* happen, which reads as evasion rather than
 * testimony.
 *
 * Measured over 60 seeds of the Cormoran shell (seeds 1-60, confirmed on
 * 101-160): 0.05 keeps a denied *relation* in 6 cases out of 60, 0.10 in 15,
 * 0.15 in 13, 0.20 in 16, 0.30 in 21. Past 0.10 the growth phase starts
 * wandering — 0.20 doubles the search time and 0.30 quadruples it while failing
 * 5 seeds outright — for no reliable gain, so 0.10 is where it sits.
 */
const DENIAL_FACTOR = 0.1

/** "en haut", "à gauche" — reads like testimony, where "en colonne 3" reads like a spreadsheet. */
function isNamedEdge(c: Constraint): boolean {
  return (c.type === 'inRow' && typeof c.row === 'string') || (c.type === 'inColumn' && typeof c.column === 'string')
}

function growthWeight(c: Constraint): number {
  if (c.type === 'not') return growthWeight(c.of) * DENIAL_FACTOR
  return KIND_WEIGHT[c.type] * (isNamedEdge(c) ? 2 : 1)
}

function solvedAs(puzzle: Puzzle, solution: Assignment): boolean {
  const result = propagate(puzzle)
  if (result.status !== 'solved') return false
  return puzzle.people.every((p) => result.placements[p.id] === solution[p.id])
}

/**
 * Which person gets the next clue: whoever still has the widest field of
 * possibilities, weighted so the choice stays varied across seeds. The victim is
 * held back until everyone else is pinned — §14 wants the lightest dossier on
 * the body, and it usually falls out of the others' rows and columns anyway.
 */
function pickTarget(
  people: PersonDef[],
  victimId: string,
  candidates: ReadonlyMap<string, ReadonlySet<string>>,
  remaining: Map<string, Constraint[]>,
  random: Random,
): { personId: string; constraint: Constraint } | null {
  const open = people.filter((p) => (remaining.get(p.id)?.length ?? 0) > 0 && (candidates.get(p.id)?.size ?? 0) > 1)
  if (open.length === 0) return null

  const others = open.filter((p) => p.id !== victimId)
  const person = weightedPick(others.length > 0 ? others : open, (p) => candidates.get(p.id)!.size, random)
  if (!person) return null

  const facts = remaining.get(person.id)!
  const constraint = weightedPick(facts, growthWeight, random)
  if (!constraint) return null

  facts.splice(facts.indexOf(constraint), 1)
  return { personId: person.id, constraint }
}

/**
 * Which clues get offered for removal first — the ones we'd rather the puzzle
 * did *not* keep. The victim's dossier goes first (§14). Then `distance`, which
 * is the single most mechanical clue in the vocabulary: it fixes an exact offset
 * on an axis, so a set made mostly of those reads like a system of equations
 * instead of an investigation. Then the narrowest static clues, the ones that
 * pin a person on their own. Weak relations (`direction`, `withPerson`) are
 * offered last, so what survives skews towards clues that only pay off in
 * combination — which is where the chaining comes from.
 */
function removalOrder(
  clues: ReadonlyMap<string, Constraint[]>,
  base: Puzzle,
  random: Random,
): { personId: string; constraint: Constraint }[] {
  const width = (c: Constraint) => staticDomainForConstraint(c, base.board)?.length ?? Number.POSITIVE_INFINITY
  // A denied exact offset is every bit as mechanical as the offset itself, so it
  // is offered up for removal just as early — the denial has to earn its place.
  const kindOf = (c: Constraint) => (c.type === 'not' ? c.of.type : c.type)
  const rank = (c: Constraint) => (kindOf(c) === 'distance' ? 0 : Number.isFinite(width(c)) ? 1 : 2)

  const entries = [...clues].flatMap(([personId, list]) =>
    list.map((constraint) => ({ personId, constraint, jitter: random() })),
  )

  return entries.sort((a, b) => {
    const victimFirst = Number(b.personId === base.victimId) - Number(a.personId === base.victimId)
    if (victimFirst !== 0) return victimFirst

    const byRank = rank(a.constraint) - rank(b.constraint)
    if (byRank !== 0) return byRank

    const byWidth = width(a.constraint) - width(b.constraint)
    if (Number.isFinite(byWidth) && byWidth !== 0) return byWidth

    const namedLast = Number(isNamedEdge(a.constraint)) - Number(isNamedEdge(b.constraint))
    return namedLast !== 0 ? namedLast : a.jitter - b.jitter
  })
}

/** Drops every clue the proof can do without, one at a time — the result is locally minimal. */
function prune(base: Puzzle, clues: Map<string, Constraint[]>, solution: Assignment, random: Random): void {
  for (const entry of removalOrder(clues, base, random)) {
    const list = clues.get(entry.personId)!
    const index = list.indexOf(entry.constraint)
    if (index < 0) continue

    list.splice(index, 1)
    if (!solvedAs(puzzleWithClues(base, clues), solution)) list.splice(index, 0, entry.constraint)
  }
}

/**
 * Grow, then prune. Clues are added one at a time — always drawn from facts
 * *true of this solution*, so a contradiction is impossible and propagation can
 * only ever converge on this very placement — until propagation finishes the
 * grid on its own; then every clue that turns out to be superfluous is removed.
 *
 * Growth alone would hand the player a redundant, flat pile: pruning is what
 * forces each surviving clue to be load-bearing, and it is what makes
 * articulation points appear in the proof.
 */
export function searchClues(
  base: Puzzle,
  solution: Assignment,
  pool: ReadonlyMap<string, Constraint[]>,
  random: Random,
  options: ClueSearchOptions = {},
): ClueSearchResult {
  const maxClues = options.maxClues ?? base.people.length * 6
  const remaining = new Map([...pool].map(([id, list]) => [id, [...list]]))
  const clues = new Map<string, Constraint[]>(base.people.map((p) => [p.id, []]))

  let grown = false
  for (let added = 0; added <= maxClues; added++) {
    const result = propagate(puzzleWithClues(base, clues))
    if (result.status === 'solved') {
      grown = true
      break
    }
    // Unreachable while every clue is true of the solution (propagation is sound,
    // so the solution's own cells always survive) — bailing beats looping on it.
    if (result.status === 'contradiction' || added === maxClues) break

    const target = pickTarget(base.people, base.victimId, result.candidates, remaining, random)
    if (!target) break
    clues.get(target.personId)!.push(target.constraint)
  }

  if (!grown) return { ok: false, reason: 'clue-budget-exhausted' }

  prune(base, clues, solution, random)

  const selfPinned = base.people.filter((p) => staticDomain(clues.get(p.id) ?? [], base.board).length === 1).length
  if (selfPinned > (options.maxSelfPinned ?? 0)) return { ok: false, reason: 'too-many-self-pinned' }

  const verdict = verifyGenerated(puzzleWithClues(base, clues), solution)
  if (!verdict.ok) return { ok: false, reason: verdict.reason }

  const clueCount = [...clues.values()].reduce((n, list) => n + list.length, 0)
  return { ok: true, clues, difficulty: verdict.difficulty, murdererId: verdict.murdererId, clueCount }
}
