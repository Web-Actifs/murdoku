import { isSingleConstraintValid } from '../constraints/domain'
import type { Constraint, Direction } from '../constraints/types'
import { assignedCell } from '../model/geometry'
import type { Assignment, Board, PersonDef } from '../model/types'

const DIRECTIONS: Direction[] = ['N', 'S', 'E', 'W']

/**
 * Candidates are proposed structurally and *broadly* (every zone, every row,
 * every offset), then filtered by the engine's own checker — enumeration is
 * exhaustive by construction and no constraint semantics are re-implemented
 * here. In particular `onObjectType`/`adjacentToObjectType` inherit the
 * grid-wide union-by-type domain from staticDomainForConstraint, so a clue is
 * only kept when it's true against *all* objects of that type, not the one the
 * author had in mind (the documented union-by-type gotcha, constraints/types.ts).
 *
 * Every proposal is then mirrored into its denial (`not`), so a witness can rule
 * a room, a landmark or a relationship out as well as confirm it.
 */
function candidateConstraints(board: Board, people: PersonDef[], personId: string): Constraint[] {
  const candidates: Constraint[] = []

  for (const zoneId of new Set(board.cells.map((c) => c.zoneId))) {
    candidates.push({ type: 'inZone', zoneId })
  }

  // Deliberately no `inFrontOfObjectType` candidate here: for a window it is
  // domain-identical to `onObjectType` (see staticDomainForConstraint), so
  // offering both would just double-propose the same cells under two labels
  // and reshuffle every seed-pinned generator test for no logical gain. It
  // stays hand-authorable (Claude/claude.md §10/§52) without being drawn.
  for (const objectType of new Set(board.objects.map((o) => o.type))) {
    candidates.push({ type: 'onObjectType', objectType })
    candidates.push({ type: 'adjacentToObjectType', objectType })
  }

  candidates.push({ type: 'inRow', row: 'top' }, { type: 'inRow', row: 'bottom' })
  candidates.push({ type: 'inColumn', column: 'left' }, { type: 'inColumn', column: 'right' })
  for (let row = 0; row < board.rows; row++) candidates.push({ type: 'inRow', row })
  for (let col = 0; col < board.cols; col++) candidates.push({ type: 'inColumn', column: col })

  for (const other of people) {
    if (other.id === personId) continue
    candidates.push({ type: 'withPerson', other: other.id })
    for (const dir of DIRECTIONS) candidates.push({ type: 'direction', other: other.id, dir })

    // exact: 0 would mean sharing a row or a column, which §2 forbids outright —
    // loadPuzzle rejects it, so it is never even proposed.
    for (let exact = -(board.rows - 1); exact <= board.rows - 1; exact++) {
      if (exact !== 0) candidates.push({ type: 'distance', other: other.id, axis: 'row', exact })
    }
    for (let exact = -(board.cols - 1); exact <= board.cols - 1; exact++) {
      if (exact !== 0) candidates.push({ type: 'distance', other: other.id, axis: 'col', exact })
    }
  }

  candidates.push({ type: 'alone' }, { type: 'notAlone' })

  return [...candidates, ...candidates.filter(isWorthDenying).map((of): Constraint => ({ type: 'not', of }))]
}

/**
 * Exactly one denial per positive candidate — never a product of the two, which
 * is the one way this enumeration could blow up. Since a candidate and its
 * denial are mutually exclusive, the filter downstream keeps precisely one of
 * each pair, so the pool grows by the clues that are *false* of the solution,
 * stated the other way round.
 *
 * `alone`/`notAlone` are left out: theirs are the only denials propagation
 * cannot act on (see propagate.ts), so a generated puzzle could never keep one —
 * the prune pass would drop it again — and they would be dead weight in the draw.
 */
function isWorthDenying(candidate: Constraint): boolean {
  return candidate.type !== 'alone' && candidate.type !== 'notAlone'
}

/** Every clue in the vocabulary that is true of `personId`'s cell in this solution. */
export function factsForPerson(board: Board, people: PersonDef[], solution: Assignment, personId: string): Constraint[] {
  const cell = assignedCell(board, solution, personId)
  if (!cell) throw new Error(`Cannot enumerate facts for unplaced person ${personId}`)

  return candidateConstraints(board, people, personId).filter((c) => isSingleConstraintValid(c, cell, solution, board, people))
}

export function enumerateFacts(board: Board, people: PersonDef[], solution: Assignment): Map<string, Constraint[]> {
  return new Map(people.map((p) => [p.id, factsForPerson(board, people, solution, p.id)]))
}
