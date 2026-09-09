import {
  adjacentToObjectCells,
  assignedCell,
  cellKey,
  mayCoexist,
  objectsOfType,
  onObjectCells,
  unoccupiableCells,
} from '../model/geometry'
import type { Assignment, Board, Cell, PersonDef, Puzzle } from '../model/types'
import { relationHolds, type Relation } from './relations'
import type { Constraint } from './types'

function unionCells(groups: Cell[][]): Cell[] {
  const seen = new Map<string, Cell>()
  for (const group of groups) for (const cell of group) seen.set(cellKey(cell), cell)
  return [...seen.values()]
}

/**
 * The domain a single constraint restricts a person to, independent of where
 * anyone else ends up — null when the constraint is relational or is a statement
 * about a volume's occupancy rather than about one person's position.
 *
 * Note which notion of "room" each one uses, because V3 has two:
 *
 * - `inZone` names the **room drawn on the plan** and is deliberately immune to
 *   discovery. "Elle était à la cave" has to mean the cellar for the whole game;
 *   welding the cellar to the scullery must not silently widen an old testimony.
 * - "avec", "seule", and the verdict use the **volume** (`cell.zoneId`), which is
 *   what a discovered link rewrites. That asymmetry is the whole twist: the facts
 *   never change, what counts as *the same place* does.
 */
export function staticDomainForConstraint(constraint: Constraint, board: Board): Cell[] | null {
  switch (constraint.type) {
    case 'inZone':
      return board.cells.filter((c) => c.roomId === constraint.zoneId)
    case 'onFloor':
      return board.cells.filter((c) => c.floor === constraint.floor)
    case 'onObjectType':
      return unionCells(objectsOfType(board, constraint.objectType).map((o) => onObjectCells(board, o)))
    // Domain-identical to `onObjectType` today (the floor in front of a window is
    // the window's own occupiable cell) — kept as its own case, not a fallthrough,
    // so the day a sill faces cells other than its own this is the only line to change.
    case 'inFrontOfObjectType':
      return unionCells(objectsOfType(board, constraint.objectType).map((o) => onObjectCells(board, o)))
    case 'adjacentToObjectType':
      return unionCells(objectsOfType(board, constraint.objectType).map((o) => adjacentToObjectCells(board, o)))
    case 'inRow':
      return board.cells.filter((c) => (constraint.row === 'top' ? c.row === 0 : constraint.row === 'bottom' ? c.row === board.rows - 1 : c.row === constraint.row))
    case 'inColumn':
      return board.cells.filter((c) =>
        constraint.column === 'left' ? c.col === 0 : constraint.column === 'right' ? c.col === board.cols - 1 : c.col === constraint.column,
      )
    case 'not': {
      const inner = staticDomainForConstraint(constraint.of, board)
      if (!inner) return null
      const excluded = new Set(inner.map(cellKey))
      return board.cells.filter((c) => !excluded.has(cellKey(c)))
    }
    default:
      return null
  }
}

/** Intersection of every static domain among a person's constraints, minus non-occupiable cells. */
export function staticDomain(constraints: Constraint[], board: Board): Cell[] {
  const blocked = unoccupiableCells(board)
  let domain = board.cells.filter((c) => !blocked.has(cellKey(c)))

  for (const constraint of constraints) {
    const constraintDomain = staticDomainForConstraint(constraint, board)
    if (constraintDomain) {
      const ids = new Set(constraintDomain.map(cellKey))
      domain = domain.filter((c) => ids.has(cellKey(c)))
    }
  }
  return domain
}

const RELATIONAL_TYPES = new Set(['withPerson', 'direction', 'distance', 'above', 'below', 'sameShaft'])

function asInnerRelation(constraint: Constraint): Relation['inner'] | null {
  return RELATIONAL_TYPES.has(constraint.type) ? (constraint as Relation['inner']) : null
}

/**
 * Checks a relational constraint against the assignment built so far during
 * search. True both when it holds AND when it can't be evaluated yet (the other
 * person isn't placed) — pruning on an undetermined relation would be wrong.
 */
function pairwiseOkForConstraint(constraint: Constraint, personId: string, assignment: Assignment, board: Board): boolean {
  const myCell = assignedCell(board, assignment, personId)
  if (!myCell) return true

  if (constraint.type === 'not') {
    const inner = asInnerRelation(constraint.of)
    if (!inner) return true
    const other = assignedCell(board, assignment, inner.other)
    return !other || !relationHolds(inner, myCell, other)
  }

  const inner = asInnerRelation(constraint)
  if (!inner) return true
  const other = assignedCell(board, assignment, inner.other)
  return !other || relationHolds(inner, myCell, other)
}

export function pairwiseOk(constraints: Constraint[], personId: string, assignment: Assignment, board: Board): boolean {
  return constraints.every((c) => pairwiseOkForConstraint(c, personId, assignment, board))
}

const STATIC_TYPES = new Set(['inZone', 'onFloor', 'onObjectType', 'inFrontOfObjectType', 'adjacentToObjectType', 'inRow', 'inColumn'])

/**
 * Full validity of one constraint against a complete assignment. Everyone is
 * placed by this point, so `not` can negate generically — no undetermined case
 * remains, unlike in `pairwiseOk` during search.
 */
export function isSingleConstraintValid(
  constraint: Constraint,
  cell: Cell,
  assignment: Assignment,
  board: Board,
  people: PersonDef[],
): boolean {
  if (constraint.type === 'not') {
    return !isSingleConstraintValid(constraint.of, cell, assignment, board, people)
  }

  if (STATIC_TYPES.has(constraint.type)) {
    const domain = staticDomainForConstraint(constraint, board)!
    return domain.some((c) => cellKey(c) === cellKey(cell))
  }

  const inner = asInnerRelation(constraint)
  if (inner) {
    const other = assignedCell(board, assignment, inner.other)
    return !!other && relationHolds(inner, cell, other)
  }

  switch (constraint.type) {
    case 'alone':
    case 'notAlone': {
      // The *volume*, not the room: being alone is exactly what a discovered
      // link can take away from you.
      const zoneId = constraint.zoneId ? (board.volumeOf.get(constraint.zoneId) ?? constraint.zoneId) : cell.zoneId
      const occupants = people.filter((p) => assignedCell(board, assignment, p.id)?.zoneId === zoneId).length
      return constraint.type === 'alone' ? occupants === 1 : occupants >= 2
    }
    default:
      return false
  }
}

/** Which of a person's own clues their current cell fails — the raw material for saying *why* a guess is wrong. */
export function violatedConstraints(
  constraints: Constraint[],
  cell: Cell,
  assignment: Assignment,
  board: Board,
  people: PersonDef[],
): Constraint[] {
  return constraints.filter((c) => !isSingleConstraintValid(c, cell, assignment, board, people))
}

/**
 * The other reason a placement can be wrong despite satisfying every clue: §2,
 * which is authored on nobody. Per floor here — a shared row across levels is
 * not a clash but a stack.
 */
export function rowColClash(
  personId: string,
  cell: Cell,
  assignment: Assignment,
  board: Board,
): { axis: 'row' | 'col'; with: string } | undefined {
  for (const [otherId, otherKey] of Object.entries(assignment)) {
    if (otherId === personId || otherKey === undefined) continue
    const other = board.cellsByKey.get(otherKey)
    if (!other || other.floor !== cell.floor) continue
    if (other.row === cell.row) return { axis: 'row', with: otherId }
    if (other.col === cell.col) return { axis: 'col', with: otherId }
  }
  return undefined
}

/**
 * Full validation of a complete assignment: every person's own clues, plus the
 * fundamental rule that no two people share a cell, and no two people on the
 * same level share a row or a column (§2, applied per floor).
 */
export function isCompleteAssignmentValid(puzzle: Puzzle, assignment: Assignment): boolean {
  const { board, people } = puzzle

  for (const person of people) {
    const cell = assignedCell(board, assignment, person.id)
    if (!cell) return false
    if (!person.constraints.every((c) => isSingleConstraintValid(c, cell, assignment, board, people))) return false
  }

  const placed: Cell[] = []
  for (const person of people) {
    const cell = assignedCell(board, assignment, person.id)!
    for (const other of placed) {
      if (cellKey(other) === cellKey(cell)) return false
      if (!mayCoexist(cell, other)) return false
    }
    placed.push(cell)
  }

  return true
}
