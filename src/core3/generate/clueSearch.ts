import { staticDomain, staticDomainForConstraint } from '../constraints/domain'
import type { Constraint } from '../constraints/types'
import { puzzleWithClues } from '../model/loadPuzzle'
import type { Assignment, Board, PersonDef, Puzzle } from '../model/types'
import { propagate } from '../possibility/propagate'
import type { PuzzleDifficulty } from '../proof/difficulty'
import { weightedPick, type Random } from './random'
import { verifyGenerated, type RejectionReason } from './verify'

/**
 * One act of the case: the clues the player is holding between two doors.
 *
 * `visibleFloors` is what makes an act an act. A clue may only mention rooms,
 * levels and furniture the player can actually see, so the dossier never refers
 * to a landing nobody has climbed to. People are exempt: the whole cast is known
 * from the start, and *where they were* is precisely the unknown.
 *
 * `target` is the gate at the end of the act — the placement that has to become
 * entailed by propagation alone once this act's clues are in hand. The last act
 * has no target: what it has to do is finish the building.
 */
export interface Act {
  id: string
  /**
   * The building *as it stands in this act*: the same plans, but with only the
   * links discovered so far welded together. This matters more than it looks.
   * "Ils étaient ensemble" and "elle était seule" are statements about volumes,
   * and a volume changes the day a link is found — so a clue that is true of the
   * finished building can be flatly unsatisfiable two acts earlier and would
   * hand the player a contradiction. Checking each act against its own topology
   * is what rules those clues out at build time instead of at play time.
   */
  base: Puzzle
  visibleFloors: number[]
  target?: { personId: string; cell: string }
  /** Ceiling on clues drawn for this act. */
  maxClues?: number
  /**
   * Clues placed by hand into this act and never offered for removal. The search
   * is good at finding *a* sufficient dossier and indifferent to which one; a
   * case has one or two lines it exists for — the body's room, the niece who
   * says she was with the tenant when the two of them turn out to be a floor
   * apart — and those are written, not drawn.
   */
  fixed?: Draw[]
  /**
   * People this act may not talk about at all, in either direction: no clue
   * carried by them, and no clue carried by anyone else that names them. This is
   * how someone stays *missing* — the cellar's occupant cannot be reasoned about
   * before the cellar exists, or the act that opens it has nothing to reveal.
   */
  excludePeople?: string[]
}

export interface StagedSearchOptions {
  /** How many people may be nailed to a single cell by their own clues alone. */
  maxSelfPinned?: number
  /** The fully-discovered building, used only to read the verdict. Defaults to the last act's. */
  verdictBase?: Puzzle
}

export type StagedResult =
  | {
      ok: true
      /** Clues per act, in act order; each entry is [personId, constraint]. */
      byAct: { actId: string; clues: { personId: string; constraint: Constraint }[] }[]
      difficulty: PuzzleDifficulty
      murdererId: string
      clueCount: number
    }
  | { ok: false; reason: RejectionReason | 'act-target-unreachable' | 'act-already-solved' | 'act-overshoot' | 'too-many-self-pinned'; actId?: string }

/**
 * How eagerly a clue kind is drawn. Carried over from V2 with the vertical
 * vocabulary slotted in by the same reasoning: `onFloor` grounds like a room
 * clue and is drawn like one; `above`/`below` are the strongest relations in the
 * game — an exact one pins two people to a single shaft — so they are drawn
 * sparingly, or every case would be won in three lines.
 */
const KIND_WEIGHT: Record<Constraint['type'], number> = {
  inZone: 2.5,
  onFloor: 2.2,
  onObjectType: 2.5,
  inFrontOfObjectType: 2.5,
  adjacentToObjectType: 2.5,
  inRow: 1.5,
  inColumn: 1.5,
  withPerson: 1,
  distance: 0.35,
  direction: 0.5,
  above: 0.35,
  below: 0.35,
  sameShaft: 0.5,
  alone: 1.2,
  notAlone: 0.5,
  /** Never read: growthWeight unwraps a denial and weighs the clue inside it. */
  not: 0,
}

const DENIAL_FACTOR = 0.1

function isNamedEdge(c: Constraint): boolean {
  return (c.type === 'inRow' && typeof c.row === 'string') || (c.type === 'inColumn' && typeof c.column === 'string')
}

function growthWeight(c: Constraint): number {
  if (c.type === 'not') return growthWeight(c.of) * DENIAL_FACTOR
  return KIND_WEIGHT[c.type] * (isNamedEdge(c) ? 2 : 1)
}

/**
 * Could this clue be shown to a player who has only seen `visibleFloors`? Rooms
 * and furniture have to be on a level they have reached; a room counts as
 * visible as soon as any part of it is, which is what lets an act-I dossier talk
 * about "le salon" while its mezzanine is still behind a locked door.
 */
export function isEligible(constraint: Constraint, board: Board, visibleFloors: ReadonlySet<number>): boolean {
  switch (constraint.type) {
    case 'not':
      return isEligible(constraint.of, board, visibleFloors)
    case 'inZone':
      return board.cells.some((c) => c.roomId === constraint.zoneId && visibleFloors.has(c.floor))
    case 'onFloor':
      return visibleFloors.has(constraint.floor)
    case 'onObjectType':
    case 'adjacentToObjectType':
    case 'inFrontOfObjectType':
      // Every object of that type, not just one: the clue's domain is their
      // union (§50), so a single unseen sideboard would point at cells the
      // player has no way to consider.
      return board.objects
        .filter((o) => o.type === constraint.objectType)
        .every((o) => o.cells.every((cell) => visibleFloors.has(cell.floor)))
    default:
      return true
  }
}

export type Draw = { personId: string; constraint: Constraint }

/** Every person a clue talks about, including the one carrying it. */
function mentions(draw: Draw): string[] {
  const names: string[] = [draw.personId]
  const walk = (c: Constraint): void => {
    if (c.type === 'not') return walk(c.of)
    if ('other' in c) names.push(c.other)
  }
  walk(draw.constraint)
  return names
}

/**
 * Which person gets the next clue: whoever still has the widest field, weighted
 * so the choice stays varied across seeds, with a heavy thumb on the scale for
 * the person the act's door is waiting on. The victim is held back until
 * everyone else is pinned — §14 wants the lightest dossier on the body.
 */
function pickDraw(
  people: PersonDef[],
  victimId: string,
  focusId: string | undefined,
  candidates: ReadonlyMap<string, ReadonlySet<string>>,
  remaining: Map<string, Constraint[]>,
  random: Random,
): Draw | null {
  const open = people.filter((p) => (remaining.get(p.id)?.length ?? 0) > 0 && (candidates.get(p.id)?.size ?? 0) > 1)
  if (open.length === 0) return null

  const others = open.filter((p) => p.id !== victimId)
  const pool = others.length > 0 ? others : open
  const person = weightedPick(pool, (p) => (candidates.get(p.id)!.size || 1) * (p.id === focusId ? 4 : 1), random)
  if (!person) return null

  const facts = remaining.get(person.id)!
  const constraint = weightedPick(facts, growthWeight, random)
  if (!constraint) return null

  facts.splice(facts.indexOf(constraint), 1)
  return { personId: person.id, constraint }
}

function toClueMap(draws: Draw[]): Map<string, Constraint[]> {
  const map = new Map<string, Constraint[]>()
  for (const draw of draws) {
    const list = map.get(draw.personId)
    if (list) list.push(draw.constraint)
    else map.set(draw.personId, [draw.constraint])
  }
  return map
}

function entailed(puzzle: Puzzle, target: { personId: string; cell: string }): boolean {
  const result = propagate(puzzle)
  if (result.status === 'contradiction') return false
  const set = result.candidates.get(target.personId)
  return set !== undefined && set.size === 1 && set.has(target.cell)
}

function solvedAs(puzzle: Puzzle, solution: Assignment): boolean {
  const result = propagate(puzzle)
  if (result.status !== 'solved') return false
  return puzzle.people.every((p) => result.placements[p.id] === solution[p.id])
}

/**
 * Every staging invariant at once, which is what pruning has to preserve:
 *
 * 1. each act's door is entailed by the clues available when the player reaches it;
 * 2. and *not before* — an act whose door was already open when it began is an
 *    act the player walks straight through, which is how a three-act case
 *    collapses into a one-act case with two formalities;
 * 3. no act before the last one already finishes the building;
 * 4. the full dossier lands on exactly the intended placement.
 *
 * (2) is the one that has to be stated, because nothing else implies it: growth
 * stops at the *first* door, and a clue drawn for one person routinely settles
 * another. Without it the search happily hands act I the proof act II exists to
 * make you earn.
 */
function stagesHold(acts: Act[], perAct: Draw[][], solution: Assignment): boolean {
  const cumulative: Draw[] = []
  for (let i = 0; i < acts.length; i++) {
    cumulative.push(...perAct[i])
    const puzzle = puzzleWithClues(acts[i].base, toClueMap(cumulative))
    const isLast = i === acts.length - 1

    if (isLast) {
      if (!solvedAs(puzzle, solution)) return false
      continue
    }

    const result = propagate(puzzle)
    if (result.status !== 'stuck') return false

    const target = acts[i].target
    if (target) {
      const set = result.candidates.get(target.personId)
      if (!set || set.size !== 1 || !set.has(target.cell)) return false
    }

    const next = acts[i + 1].target
    if (next) {
      const set = result.candidates.get(next.personId)
      if (set && set.size === 1 && set.has(next.cell)) return false
    }
  }
  return true
}

/**
 * Which clues get offered for removal first — the ones we would rather the case
 * did *not* keep. Same ordering as V2, with `above`/`below` treated as
 * mechanically as `distance`: an exact vertical offset fixes two people at once,
 * so a dossier made of them reads like a system of equations.
 */
function removalOrder(perAct: Draw[][], base: Puzzle, random: Random): { act: number; draw: Draw }[] {
  const width = (c: Constraint) => staticDomainForConstraint(c, base.board)?.length ?? Number.POSITIVE_INFINITY
  const kindOf = (c: Constraint) => (c.type === 'not' ? c.of.type : c.type)
  const mechanical = new Set(['distance', 'above', 'below', 'sameShaft'])
  const rank = (c: Constraint) => (mechanical.has(kindOf(c)) ? 0 : Number.isFinite(width(c)) ? 1 : 2)

  const entries = perAct.flatMap((draws, act) => draws.map((draw) => ({ act, draw, jitter: random() })))

  return entries.sort((a, b) => {
    const victimFirst = Number(b.draw.personId === base.victimId) - Number(a.draw.personId === base.victimId)
    if (victimFirst !== 0) return victimFirst

    const byRank = rank(a.draw.constraint) - rank(b.draw.constraint)
    if (byRank !== 0) return byRank

    const byWidth = width(a.draw.constraint) - width(b.draw.constraint)
    if (Number.isFinite(byWidth) && byWidth !== 0) return byWidth

    const namedLast = Number(isNamedEdge(a.draw.constraint)) - Number(isNamedEdge(b.draw.constraint))
    return namedLast !== 0 ? namedLast : a.jitter - b.jitter
  })
}

/**
 * Grow act by act, then prune across all of them.
 *
 * The growth is V2's, run once per act against that act's eligible facts and
 * stopped on that act's door rather than on a finished grid. The pruning is what
 * differs: a clue is only droppable if *every* staging invariant survives its
 * removal, so the minimality it produces is minimality of the whole staircase,
 * not of one puzzle. That is what stops act I from quietly carrying act III.
 */
export function searchStagedClues(
  solution: Assignment,
  pool: ReadonlyMap<string, Constraint[]>,
  acts: Act[],
  random: Random,
  options: StagedSearchOptions = {},
): StagedResult {
  const base = acts[acts.length - 1].base
  const remaining = new Map([...pool].map(([id, list]) => [id, [...list]]))
  const perAct: Draw[][] = acts.map(() => [])
  const cumulative: Draw[] = []

  for (let i = 0; i < acts.length; i++) {
    const act = acts[i]
    const visible = new Set(act.visibleFloors)
    const silent = new Set(act.excludePeople ?? [])
    const eligibleNow = new Map(
      [...remaining].map(([id, list]) => [
        id,
        silent.has(id) ? [] : list.filter((c) => isEligible(c, act.base.board, visible) && !mentions({ personId: id, constraint: c }).some((p) => silent.has(p))),
      ] as const),
    )
    const budget = act.maxClues ?? base.people.length * 3
    const isLast = i === acts.length - 1

    for (const draw of act.fixed ?? []) {
      perAct[i].push(draw)
      cumulative.push(draw)
    }

    let reached = false
    for (let added = 0; added <= budget; added++) {
      const puzzle = puzzleWithClues(act.base, toClueMap(cumulative))
      const result = propagate(puzzle)

      if (isLast) {
        if (result.status === 'solved') {
          reached = true
          break
        }
      } else if (act.target && entailed(puzzle, act.target)) {
        // An act that has already solved the whole building has nothing left to gate.
        if (result.status === 'solved') return { ok: false, reason: 'act-already-solved' }
        reached = true
        break
      }

      if (result.status === 'contradiction' || added === budget) break

      const draw = pickDraw(act.base.people, act.base.victimId, act.target?.personId, result.candidates, eligibleNow as Map<string, Constraint[]>, random)
      if (!draw) break

      // Drawn from the act's eligible view, removed from the global pool too.
      const global = remaining.get(draw.personId)
      const at = global?.indexOf(draw.constraint) ?? -1
      if (at >= 0) global!.splice(at, 1)

      perAct[i].push(draw)
      cumulative.push(draw)
    }

    if (!reached) return { ok: false, reason: isLast ? 'not-solvable-by-propagation' : 'act-target-unreachable', actId: act.id }
  }

  // Growth stops at each door in turn and cannot see that it has opened the next
  // one on the way past; that is only visible once every act is grown.
  if (!stagesHold(acts, perAct, solution)) return { ok: false, reason: 'act-overshoot' }

  const authored = new Set(acts.flatMap((act) => act.fixed ?? []))
  for (const entry of removalOrder(perAct, base, random)) {
    if (authored.has(entry.draw)) continue
    const list = perAct[entry.act]
    const index = list.indexOf(entry.draw)
    if (index < 0) continue

    list.splice(index, 1)
    if (!stagesHold(acts, perAct, solution)) list.splice(index, 0, entry.draw)
  }

  const finalClues = toClueMap(perAct.flat())

  const selfPinned = base.people.filter((p) => staticDomain(finalClues.get(p.id) ?? [], base.board).length === 1).length
  if (selfPinned > (options.maxSelfPinned ?? 0)) return { ok: false, reason: 'too-many-self-pinned' }

  // The verdict is read off the *finished* building — every link welded — while
  // solvability was checked act by act on the topology of the day. The two
  // boards must agree on the placements and disagree on the culprit: that gap is
  // the case.
  const verdict = verifyGenerated(puzzleWithClues(options.verdictBase ?? base, finalClues), solution)
  if (!verdict.ok) return { ok: false, reason: verdict.reason }

  return {
    ok: true,
    byAct: acts.map((act, i) => ({ actId: act.id, clues: perAct[i] })),
    difficulty: verdict.difficulty,
    murdererId: verdict.murdererId,
    clueCount: perAct.reduce((n, list) => n + list.length, 0),
  }
}
