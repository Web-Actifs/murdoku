import { isCompleteAssignmentValid, staticDomain } from '../constraints/domain'
import { asRelation, relationHolds, type Relation } from '../constraints/relations'
import { cellKey, mayCoexist, parseCellKey } from '../model/geometry'
import type { Assignment, Board, Puzzle } from '../model/types'
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

/**
 * Reduces every person's candidates to a fixed point using only techniques a
 * player could apply by hand. Ported from V2 with one structural change, which
 * runs through everything below: **§2 is scoped to a floor**.
 *
 * A person pinned to (floor 1, row 3) closes row 3 *on floor 1* and nothing at
 * all on floors 0 and 2. Locked candidates likewise reserve a (floor, row) pair
 * rather than a row. That single scoping is what makes the vertical vocabulary
 * work — and it is also what makes V3 harder to reason about than V2, since a
 * row you have "used up" is only used up once you know which level you used it
 * on.
 *
 * Never guesses — that is the solver's job, not this one's.
 */
export function propagate(puzzle: Puzzle): PropagationResult {
  return propagateFrom(puzzle)
}

/**
 * The same fixed point as `propagate`, except that anyone listed in
 * `seedOverrides` starts from exactly that domain instead of `staticDomain(...)`.
 * An assumption is nothing more than a seed of size one, so the journal it
 * produces is made of the very same steps a player would follow.
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
    // Own clues alone can already be unsatisfiable; nothing ever gets *removed* in
    // that case, so the usual contradiction check never fires. Catch it here.
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

  /** The volume a person is already committed to, read off their candidates as they stand right now. */
  function liveLockedZone(personId: string): string | undefined {
    return uniformZone(board, candidates.get(personId)!)
  }

  /**
   * `alone`, both ways round. A person counts as committed to a volume as soon
   * as every candidate they have left sits in it — being pinned to a single cell
   * is only the extreme case, so this bites earlier than a placement would.
   */
  function applyAlone(personId: string, zoneId: string | undefined, committedZones: ReadonlyMap<string, string>): boolean {
    if (contradictionPersonId !== undefined) return false
    let touched = false

    const groups = new Map<string, { by: string; keys: Set<string> }>()
    for (const key of candidates.get(personId)!) {
      const cellZone = board.cellsByKey.get(key)!.zoneId
      // Without an explicit volume the clue speaks about wherever the subject
      // ends up, so the volume under test changes from one candidate to the next.
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
   * `notAlone`: a volume nobody else could stand in alongside the subject would
   * leave them alone there, so it drops out of their domain.
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

    const premises = [...new Set(people.filter((p) => p.id !== personId).flatMap((p) => premisesFor(p.id)))]
    for (const [zone, keys] of groups) {
      if (removeCandidates(personId, keys, { type: 'zoneNeedsCompany', zoneId: zone }, 'zoneCompany', 'intermediate', premises)) {
        touched = true
      }
    }

    return touched
  }

  /** Reading a placed person off the plan is basic; reading a volume off a still-open domain is not. */
  function tierOf(personId: string): DeductionStep['tier'] {
    return candidates.get(personId)!.size === 1 ? 'basic' : 'intermediate'
  }

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
        const { floor, row, col } = parseCellKey([...mySet][0])
        for (const other of people) {
          if (other.id === person.id) continue
          const premises = premisesFor(person.id)
          const otherSet = candidates.get(other.id)!

          // Only on this floor. A person one level up may stand in the very same
          // row and column — that is a stack, not a clash.
          const rowHit = new Set(
            [...otherSet].filter((k) => {
              const ref = parseCellKey(k)
              return ref.floor === floor && ref.row === row
            }),
          )
          if (removeCandidates(other.id, rowHit, { type: 'rowTaken', by: person.id, floor, row }, 'rowColElimination', 'basic', premises)) {
            changed = true
          }
          const colHit = new Set(
            [...otherSet].filter((k) => {
              const ref = parseCellKey(k)
              return ref.floor === floor && ref.col === col
            }),
          )
          if (removeCandidates(other.id, colHit, { type: 'colTaken', by: person.id, floor, col }, 'rowColElimination', 'basic', premises)) {
            changed = true
          }
        }
        continue
      }

      if (mySet.size >= 2) {
        const refs = [...mySet].map(parseCellKey)
        const premises = premisesFor(person.id)
        const floors = new Set(refs.map((r) => r.floor))

        // A row is only reserved when the *level* is settled too: candidates
        // spread over two floors of row 3 reserve nothing at all.
        if (floors.size === 1) {
          const [floor] = floors
          const rows = new Set(refs.map((r) => r.row))
          const cols = new Set(refs.map((r) => r.col))

          if (rows.size === 1) {
            const [row] = rows
            for (const other of people) {
              if (other.id === person.id) continue
              const otherSet = candidates.get(other.id)!
              const hit = new Set(
                [...otherSet].filter((k) => {
                  const ref = parseCellKey(k)
                  return ref.floor === floor && ref.row === row
                }),
              )
              const reason: Reason = { type: 'confinedToRow', confinedPerson: person.id, floor, row }
              if (removeCandidates(other.id, hit, reason, 'lockedCandidates', 'intermediate', premises)) changed = true
            }
          }
          if (cols.size === 1) {
            const [col] = cols
            for (const other of people) {
              if (other.id === person.id) continue
              const otherSet = candidates.get(other.id)!
              const hit = new Set(
                [...otherSet].filter((k) => {
                  const ref = parseCellKey(k)
                  return ref.floor === floor && ref.col === col
                }),
              )
              const reason: Reason = { type: 'confinedToCol', confinedPerson: person.id, floor, col }
              if (removeCandidates(other.id, hit, reason, 'lockedCandidates', 'intermediate', premises)) changed = true
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
        const tier = relation.negated ? tierOf(other) : 'basic'
        if (removeCandidates(person.id, toRemove, reason, relation.negated ? 'relationalExclusion' : 'relationalFilter', tier, premisesFor(other))) {
          changed = true
        }
      }
    }

    const committedZones = committedZonesOf(board, candidates)
    for (const person of people) {
      for (const constraint of person.constraints) {
        if (constraint.type === 'alone') {
          if (applyAlone(person.id, resolveZone(board, constraint.zoneId), committedZones)) changed = true
        } else if (constraint.type === 'notAlone') {
          if (applyNotAlone(person.id, resolveZone(board, constraint.zoneId))) changed = true
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

/** A clue names a room; occupancy reasoning happens in volumes. */
function resolveZone(board: Board, roomId: string | undefined): string | undefined {
  return roomId === undefined ? undefined : (board.volumeOf.get(roomId) ?? roomId)
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

/** The single volume every cell of `keys` belongs to, or undefined when they straddle several. */
function uniformZone(board: Board, keys: ReadonlySet<string>): string | undefined {
  let zone: string | undefined
  for (const key of keys) {
    const cellZone = board.cellsByKey.get(key)!.zoneId
    if (zone === undefined) zone = cellZone
    else if (zone !== cellZone) return undefined
  }
  return zone
}

/** Everyone whose remaining candidates all sit in one volume — they are in it, wherever exactly. */
function committedZonesOf(board: Board, candidates: ReadonlyMap<string, Set<string>>): Map<string, string> {
  const committed = new Map<string, string>()
  for (const [personId, keys] of candidates) {
    const zone = uniformZone(board, keys)
    if (zone !== undefined) committed.set(personId, zone)
  }
  return committed
}

/**
 * Could `keys` put its owner in `zoneId` alongside someone standing on
 * `subjectKey`? A companion has to be somewhere the two of them may legally
 * coexist — which, across levels, includes the very cell above the subject's.
 */
function canJoin(board: Board, keys: ReadonlySet<string>, zoneId: string, subjectKey: string): boolean {
  const subject = board.cellsByKey.get(subjectKey)!
  for (const key of keys) {
    const cell = board.cellsByKey.get(key)!
    if (cell.zoneId === zoneId && cellKey(cell) !== subjectKey && mayCoexist(cell, subject)) return true
  }
  return false
}

/**
 * Arc-consistency against a relational constraint: keeps only the cells in the
 * subject's own domain still consistent with at least one of the partner's
 * remaining candidates. Denial is the same test against the mirrored predicate,
 * not a special case — a cell only falls under a denial when every position the
 * partner has left would force the relation.
 */
function relationalFilter(relation: Relation, personId: string, candidates: Map<string, Set<string>>, board: Board): Set<string> | null {
  const otherSet = candidates.get(relation.inner.other)
  if (!otherSet) return null

  const otherCells = [...otherSet].map((key) => board.cellsByKey.get(key)!)

  const keep = new Set<string>()
  const subjectSet = candidates.get(personId) ?? new Set<string>()
  for (const key of subjectSet) {
    const myCell = board.cellsByKey.get(key)!
    const satisfiable = otherCells.some(
      (otherCell) => mayCoexist(myCell, otherCell) && relationHolds(relation.inner, myCell, otherCell) !== relation.negated,
    )
    if (satisfiable) keep.add(key)
  }
  return keep
}
