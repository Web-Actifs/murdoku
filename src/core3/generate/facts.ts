import { isSingleConstraintValid } from '../constraints/domain'
import type { Constraint, Direction } from '../constraints/types'
import { assignedCell } from '../model/geometry'
import type { Assignment, Board, PersonDef } from '../model/types'

const DIRECTIONS: Direction[] = ['N', 'S', 'E', 'W']

/**
 * Candidates are proposed structurally and *broadly*, then filtered by the
 * engine's own checker — enumeration is exhaustive by construction and no
 * constraint semantics are re-implemented here.
 *
 * What V3 adds to the draw, and why each one earns its place:
 *
 * - `onFloor` — the cheapest way to say something about the vertical, and the
 *   one clue that cuts two thirds of a three-storey building in a single line.
 * - `distance` on the `floor` axis — "deux étages plus haut", including
 *   `exact: 0` for "on the same level as".
 * - `distance` on `row`/`col` with `exact: 0`, which V2 could not even propose:
 *   here it says "same row, therefore different floors".
 * - `above`/`below`, with and without an exact gap. The exact form at gap 1 is
 *   person-to-person adjacency, the relation the flat ruleset cannot express.
 * - `sameShaft` — one of them was over the other, without saying which way round.
 */
function candidateConstraints(board: Board, people: PersonDef[], personId: string): Constraint[] {
  const candidates: Constraint[] = []

  for (const roomId of new Set(board.cells.map((c) => c.roomId))) {
    candidates.push({ type: 'inZone', zoneId: roomId })
  }
  for (let floor = 0; floor < board.floors; floor++) {
    candidates.push({ type: 'onFloor', floor })
  }

  // No `inFrontOfObjectType` candidate: for a window it is domain-identical to
  // `onObjectType`, so offering both would double-propose the same cells under
  // two labels. It stays hand-authorable (§10/§52) without being drawn.
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
    candidates.push({ type: 'sameShaft', other: other.id })
    for (const dir of DIRECTIONS) candidates.push({ type: 'direction', other: other.id, dir })

    for (let exact = -(board.rows - 1); exact <= board.rows - 1; exact++) {
      candidates.push({ type: 'distance', other: other.id, axis: 'row', exact })
    }
    for (let exact = -(board.cols - 1); exact <= board.cols - 1; exact++) {
      candidates.push({ type: 'distance', other: other.id, axis: 'col', exact })
    }
    for (let exact = -(board.floors - 1); exact <= board.floors - 1; exact++) {
      candidates.push({ type: 'distance', other: other.id, axis: 'floor', exact })
    }

    candidates.push({ type: 'above', other: other.id }, { type: 'below', other: other.id })
    for (let exact = 1; exact < board.floors; exact++) {
      candidates.push({ type: 'above', other: other.id, exact })
      candidates.push({ type: 'below', other: other.id, exact })
    }
  }

  candidates.push({ type: 'alone' }, { type: 'notAlone' })

  return [...candidates, ...candidates.filter(isWorthDenying).map((of): Constraint => ({ type: 'not', of }))]
}

/**
 * Exactly one denial per positive candidate — never a product of the two.
 * `alone`/`notAlone` are left out: theirs are the only denials propagation
 * cannot act on, so a generated puzzle could never keep one.
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
