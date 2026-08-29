import { isCompleteAssignmentValid, staticDomain } from '../constraints/domain'
import type { Constraint } from '../constraints/types'
import { cellAt, cellKey, isDirection, parseCellKey } from '../model/geometry'
import type { Assignment, Board, Cell, Puzzle } from '../model/types'
import type { DeductionStep, Reason } from './journal'

export interface PropagationResult {
  /** 'solved' only once every person is down to one candidate AND that assignment is fully valid. */
  status: 'solved' | 'stuck' | 'contradiction'
  candidates: Map<string, Set<string>>
  journal: DeductionStep[]
  placements: Assignment
  /** Set only when status is 'contradiction'. */
  contradictionPersonId?: string
}

const RELATIONAL_TYPES = new Set(['withPerson', 'direction', 'distance'])

/**
 * Reduces every person's candidates to a fixed point using only techniques a
 * player could apply by hand: row/column locking from a confirmed placement,
 * locked-candidates (a person confined to one row/column reserves it, even
 * before they're confirmed), arc-consistency against a relational constraint's
 * partner — in both its positive and its negated form — and zone-occupancy
 * reasoning from `alone`/`notAlone`. Never guesses — that's `search`'s job, not
 * this one's.
 *
 * The one family left out is now the negation of a zone-occupancy clue
 * (`not(alone)`, `not(notAlone)`): unlike every other `not`, those two are
 * statements about how many people a room holds rather than about where one
 * person can be, so they stay enforced by the backtracking solver's final
 * validity check alone. Nothing else in the vocabulary is invisible to
 * propagation any more.
 */
export function propagate(puzzle: Puzzle): PropagationResult {
  return propagateFrom(puzzle)
}

/**
 * The same fixed point as `propagate`, except that anyone listed in
 * `seedOverrides` starts from exactly that domain instead of
 * `staticDomain(...)`. Hypothesis mode is built on this rather than on a second
 * copy of the loop: an assumption is nothing more than a seed of size one, so
 * the journal it produces is made of the very same steps a player would follow.
 */
export function propagateFrom(puzzle: Puzzle, seedOverrides?: ReadonlyMap<string, ReadonlySet<string>>): PropagationResult {
  const { board, people } = puzzle
  const candidates = new Map<string, Set<string>>()
  const cellsByZone = groupCellsByZone(board)
  const lastStepForPerson = new Map<string, string>()
  const journal: DeductionStep[] = []
  let stepCounter = 0
  let contradictionPersonId: string | undefined

  for (const person of people) {
    const override = seedOverrides?.get(person.id)
    const seeded = override ? new Set(override) : new Set(staticDomain(person.constraints, board).map(cellKey))
    candidates.set(person.id, seeded)
    // Own clues alone can already be unsatisfiable (e.g. two zone constraints that
    // never overlap) — nothing ever gets *removed* in that case, so the usual
    // `removeCandidates` contradiction check never fires. Catch it here instead of
    // reporting a silent 'stuck' with an empty domain and no explanation.
    if (seeded.size === 0 && contradictionPersonId === undefined) contradictionPersonId = person.id
  }

  function emit(step: Omit<DeductionStep, 'id'>): void {
    const full: DeductionStep = { ...step, id: `d${stepCounter++}` }
    journal.push(full)
    lastStepForPerson.set(step.personId, full.id)
  }

  function premisesFor(personId: string): string[] {
    const step = lastStepForPerson.get(personId)
    return step ? [step] : []
  }

  function removeCandidates(
    personId: string,
    toRemove: Set<string>,
    reason: Reason,
    technique: DeductionStep['technique'],
    tier: DeductionStep['tier'],
    premises: string[],
  ): boolean {
    const set = candidates.get(personId)!
    const removed = [...toRemove].filter((key) => set.has(key))
    if (removed.length === 0) return false

    const before = [...set]
    for (const key of removed) set.delete(key)
    const after = [...set]
    emit({ technique, tier, personId, before, after, removed, reason, premises })

    if (set.size === 0) {
      contradictionPersonId = personId
    } else if (set.size === 1) {
      const lastId = lastStepForPerson.get(personId)!
      emit({
        technique: 'nakedSingle',
        tier: 'basic',
        personId,
        before: after,
        after,
        removed: [],
        placed: after[0],
        reason: { type: 'onlyOptionLeft' },
        premises: [lastId],
      })
    }
    return true
  }

  /** The zone a person is already committed to, read off their candidates as they stand right now. */
  function liveLockedZone(personId: string): string | undefined {
    return uniformZone(board, candidates.get(personId)!)
  }

  /**
   * `alone`, both ways round. A person counts as committed to a zone as soon as
   * every candidate they have left sits in it — being pinned to a single cell is
   * only the extreme case of that, so this bites earlier than a placement would.
   *
   * 1. The subject cannot join a zone somebody else is already committed to:
   *    they would not be alone there.
   * 2. Once the subject is themselves committed to the zone their clue speaks
   *    about, nobody else may set foot in it.
   */
  function applyAlone(personId: string, zoneId: string | undefined, committedZones: ReadonlyMap<string, string>): boolean {
    if (contradictionPersonId !== undefined) return false
    let touched = false

    const groups = new Map<string, { by: string; keys: Set<string> }>()
    for (const key of candidates.get(personId)!) {
      const cellZone = board.cellsByKey.get(key)!.zoneId
      // Without an explicit zone the clue speaks about wherever the subject ends
      // up, so the zone under test changes from one candidate cell to the next.
      const zone = zoneId ?? cellZone
      const committed = people.filter((p) => p.id !== personId && committedZones.get(p.id) === zone)
      if (committed.length + (cellZone === zone ? 1 : 0) <= 1) continue

      const group = groups.get(zone) ?? { by: committed[0].id, keys: new Set<string>() }
      group.keys.add(key)
      groups.set(zone, group)
    }

    for (const [zone, group] of groups) {
      const reason: Reason = { type: 'zoneTaken', by: group.by, zoneId: zone }
      if (removeCandidates(personId, group.keys, reason, 'zoneExclusivity', tierOf(group.by), premisesFor(group.by))) {
        touched = true
      }
    }

    const myZone = liveLockedZone(personId)
    // With an explicit zone the subject may not even be in it; the clue then only
    // caps that zone's occupancy at one, which is a counting fact rather than a
    // cut anyone's domain can absorb — nothing to propagate in that case.
    if (myZone !== undefined && (zoneId ?? myZone) === myZone) {
      const tier = tierOf(personId)
      const zoneKeys = cellsByZone.get(myZone) ?? new Set<string>()
      for (const other of people) {
        if (other.id === personId) continue
        const reason: Reason = { type: 'zoneClaimedAlone', by: personId, zoneId: myZone }
        if (removeCandidates(other.id, zoneKeys, reason, 'zoneExclusivity', tier, premisesFor(personId))) touched = true
      }
    }

    return touched
  }

  /**
   * `notAlone`: a zone nobody else could stand in alongside the subject would
   * leave them alone there, so it drops out of their domain. With an explicit
   * zone the subject may be elsewhere, and the clue then asks for two other
   * people in it rather than one.
   */
  function applyNotAlone(personId: string, zoneId: string | undefined): boolean {
    if (contradictionPersonId !== undefined) return false
    let touched = false

    const groups = new Map<string, Set<string>>()
    for (const key of candidates.get(personId)!) {
      const cellZone = board.cellsByKey.get(key)!.zoneId
      const zone = zoneId ?? cellZone
      const needed = cellZone === zone ? 1 : 2
      const companions = people.filter((p) => p.id !== personId && canJoin(board, candidates.get(p.id)!, zone, key)).length
      if (companions >= needed) continue

      const group = groups.get(zone) ?? new Set<string>()
      group.add(key)
      groups.set(zone, group)
    }

    // This rests on how far *everyone else's* domains have already shrunk, so the
    // premises are everyone else's latest step — there is no single culprit to name.
    const premises = [...new Set(people.filter((p) => p.id !== personId).flatMap((p) => premisesFor(p.id)))]
    for (const [zone, keys] of groups) {
      if (removeCandidates(personId, keys, { type: 'zoneNeedsCompany', zoneId: zone }, 'zoneCompany', 'intermediate', premises)) {
        touched = true
      }
    }

    return touched
  }

  /** Reading a placed person off the grid is basic; reading a zone off a still-open domain is not. */
  function tierOf(personId: string): DeductionStep['tier'] {
    return candidates.get(personId)!.size === 1 ? 'basic' : 'intermediate'
  }

  // Seed-time singles and axioms: anyone already confined to one cell by their
  // own clues alone gets a step too, so later deductions have something to point to.
  for (const person of people) {
    const set = candidates.get(person.id)!
    if (set.size === 1) {
      const snapshot = [...set]
      emit({
        technique: 'nakedSingle',
        tier: 'basic',
        personId: person.id,
        before: snapshot,
        after: snapshot,
        removed: [],
        placed: snapshot[0],
        reason: { type: 'onlyOptionLeft' },
        premises: [],
      })
    }
  }

  let changed = true
  while (changed && contradictionPersonId === undefined) {
    changed = false

    for (const person of people) {
      const mySet = candidates.get(person.id)!

      if (mySet.size === 1) {
        const { row, col } = parseCellKey([...mySet][0])
        for (const other of people) {
          if (other.id === person.id) continue
          const premises = premisesFor(person.id)
          const otherSet = candidates.get(other.id)!

          const rowHit = new Set([...otherSet].filter((k) => parseCellKey(k).row === row))
          if (removeCandidates(other.id, rowHit, { type: 'rowTaken', by: person.id, row }, 'rowColElimination', 'basic', premises)) {
            changed = true
          }
          const colHit = new Set([...otherSet].filter((k) => parseCellKey(k).col === col))
          if (removeCandidates(other.id, colHit, { type: 'colTaken', by: person.id, col }, 'rowColElimination', 'basic', premises)) {
            changed = true
          }
        }
        continue
      }

      if (mySet.size >= 2) {
        const rows = new Set([...mySet].map((k) => parseCellKey(k).row))
        const cols = new Set([...mySet].map((k) => parseCellKey(k).col))
        const premises = premisesFor(person.id)

        if (rows.size === 1) {
          const [row] = rows
          for (const other of people) {
            if (other.id === person.id) continue
            const otherSet = candidates.get(other.id)!
            const hit = new Set([...otherSet].filter((k) => parseCellKey(k).row === row))
            if (
              removeCandidates(other.id, hit, { type: 'confinedToRow', confinedPerson: person.id, row }, 'lockedCandidates', 'intermediate', premises)
            ) {
              changed = true
            }
          }
        }
        if (cols.size === 1) {
          const [col] = cols
          for (const other of people) {
            if (other.id === person.id) continue
            const otherSet = candidates.get(other.id)!
            const hit = new Set([...otherSet].filter((k) => parseCellKey(k).col === col))
            if (
              removeCandidates(other.id, hit, { type: 'confinedToCol', confinedPerson: person.id, col }, 'lockedCandidates', 'intermediate', premises)
            ) {
              changed = true
            }
          }
        }
      }
    }

    if (contradictionPersonId !== undefined) break

    for (const person of people) {
      for (const constraint of person.constraints) {
        const relation = asRelation(constraint)
        if (!relation) continue

        const kept = relationalFilter(relation, person.id, candidates, board)
        if (!kept) continue

        const mySet = candidates.get(person.id)!
        const toRemove = new Set([...mySet].filter((key) => !kept.has(key)))
        if (toRemove.size === 0) continue

        const { other, type } = relation.inner
        const reason: Reason = { type: 'relational', constraintType: type, other, ...(relation.negated ? { negated: true as const } : {}) }
        // A denial read off a partner still spread over several cells means
        // checking every one of them; off a partner already placed it is the
        // plain "he was there, so I wasn't" a beginner makes.
        const tier = relation.negated ? tierOf(other) : 'basic'
        if (removeCandidates(person.id, toRemove, reason, relation.negated ? 'relationalExclusion' : 'relationalFilter', tier, premisesFor(other))) {
          changed = true
        }
      }
    }

    // Snapshotted once per sweep: a domain can only ever shrink, and shrinking
    // never *un*-commits anyone from a zone, so a stale map can only miss a
    // deduction (the next sweep catches it), never invent one.
    const committedZones = committedZonesOf(board, candidates)
    for (const person of people) {
      for (const constraint of person.constraints) {
        if (constraint.type === 'alone') {
          if (applyAlone(person.id, constraint.zoneId, committedZones)) changed = true
        } else if (constraint.type === 'notAlone') {
          if (applyNotAlone(person.id, constraint.zoneId)) changed = true
        }
      }
    }
  }

  if (contradictionPersonId !== undefined) {
    return { status: 'contradiction', candidates, journal, placements: {}, contradictionPersonId }
  }

  if ([...candidates.values()].every((set) => set.size === 1)) {
    const placements: Assignment = {}
    for (const [personId, set] of candidates) placements[personId] = [...set][0]
    return { status: isCompleteAssignmentValid(puzzle, placements) ? 'solved' : 'stuck', candidates, journal, placements }
  }

  return { status: 'stuck', candidates, journal, placements: {} }
}

function groupCellsByZone(board: Board): Map<string, Set<string>> {
  const byZone = new Map<string, Set<string>>()
  for (const cell of board.cells) {
    const set = byZone.get(cell.zoneId)
    if (set) set.add(cellKey(cell))
    else byZone.set(cell.zoneId, new Set([cellKey(cell)]))
  }
  return byZone
}

/** The single zone every cell of `keys` belongs to, or undefined when they straddle several (or none). */
function uniformZone(board: Board, keys: ReadonlySet<string>): string | undefined {
  let zone: string | undefined
  for (const key of keys) {
    const cellZone = board.cellsByKey.get(key)!.zoneId
    if (zone === undefined) zone = cellZone
    else if (zone !== cellZone) return undefined
  }
  return zone
}

/** Everyone whose remaining candidates all sit in one zone — they are in it, wherever exactly. */
function committedZonesOf(board: Board, candidates: ReadonlyMap<string, Set<string>>): Map<string, string> {
  const committed = new Map<string, string>()
  for (const [personId, keys] of candidates) {
    const zone = uniformZone(board, keys)
    if (zone !== undefined) committed.set(personId, zone)
  }
  return committed
}

/**
 * Could `keys` put its owner in `zoneId` next to someone standing on
 * `subjectKey`? §2 forbids sharing a row or a column, so a companion has to
 * differ on both axes — a cell that only clears the zone test isn't company.
 */
function canJoin(board: Board, keys: ReadonlySet<string>, zoneId: string, subjectKey: string): boolean {
  const subject = board.cellsByKey.get(subjectKey)!
  for (const key of keys) {
    const cell = board.cellsByKey.get(key)!
    if (cell.zoneId === zoneId && cell.row !== subject.row && cell.col !== subject.col) return true
  }
  return false
}

/** A person-to-person clue with its `not` wrapper, if any, already peeled off. */
interface Relation {
  inner: Extract<Constraint, { other: string }>
  negated: boolean
}

/**
 * Reads a constraint as a relation between two people, whether it is stated
 * plainly or denied. Null for everything else: static-domain clues (handled by
 * the seed, complement included), alone/notAlone and their denials (about a
 * whole zone's occupancy, see the zone passes above), and any nesting the
 * vocabulary never produces, such as a doubled `not`.
 */
function asRelation(constraint: Constraint): Relation | null {
  const negated = constraint.type === 'not'
  const inner = negated ? constraint.of : constraint
  if (!RELATIONAL_TYPES.has(inner.type)) return null
  return { inner: inner as Relation['inner'], negated }
}

function relationHolds(relation: Relation['inner'], myCell: Cell, otherCell: Cell): boolean {
  switch (relation.type) {
    case 'withPerson':
      return myCell.zoneId === otherCell.zoneId
    case 'direction':
      return isDirection(myCell, otherCell, relation.dir)
    case 'distance': {
      const diff = relation.axis === 'row' ? otherCell.row - myCell.row : otherCell.col - myCell.col
      return diff === relation.exact
    }
  }
}

/**
 * Arc-consistency against a relational constraint: keeps only the cells in the
 * subject's own domain that are still consistent with at least one of the
 * partner's remaining candidates.
 *
 * Denial is the same test against the mirrored predicate, not a special case. A
 * cell survives a plain relation when *some* remaining position of the partner
 * makes it true; it survives a denied one when *some* remaining position makes
 * it false. So a cell only falls under a denial when every position the partner
 * has left would force the relation — the subject could then never truthfully
 * deny it from there. Like the zone passes, that bites late rather than at the
 * seed, once the partner's own domain has shrunk enough (or is uniform on the
 * relation being denied), which is exactly when a player would notice it too.
 */
function relationalFilter(relation: Relation, personId: string, candidates: Map<string, Set<string>>, board: Board): Set<string> | null {
  const otherSet = candidates.get(relation.inner.other)
  if (!otherSet) return null

  const otherCells = [...otherSet].map((key) => {
    const ref = parseCellKey(key)
    return cellAt(board, ref.row, ref.col)!
  })

  const keep = new Set<string>()
  const subjectSet = candidates.get(personId) ?? new Set<string>()
  for (const key of subjectSet) {
    const ref = parseCellKey(key)
    const myCell = cellAt(board, ref.row, ref.col)!
    const satisfiable = otherCells.some((otherCell) => relationHolds(relation.inner, myCell, otherCell) !== relation.negated)
    if (satisfiable) keep.add(key)
  }
  return keep
}
