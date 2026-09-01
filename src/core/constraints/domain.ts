import {
  adjacentToObjectCells,
  assignedCell,
  cellKey,
  isDirection,
  isInColumn,
  isInRow,
  objectsOfType,
  onObjectCells,
  unoccupiableCells,
} from '../model/geometry'
import type { Assignment, Board, Cell, PersonDef, Puzzle } from '../model/types'
import type { Constraint } from './types'

function unionCells(groups: Cell[][]): Cell[] {
  const seen = new Map<string, Cell>()
  for (const group of groups) for (const cell of group) seen.set(cellKey(cell), cell)
  return [...seen.values()]
}

/**
 * The domain a single constraint restricts a person to, independent of where
 * anyone else ends up — null when the constraint is relational (depends on
 * another person's placement) rather than a fixed set of cells.
 */
export function staticDomainForConstraint(constraint: Constraint, board: Board): Cell[] | null {
  switch (constraint.type) {
    case 'inZone':
      return board.cells.filter((c) => c.zoneId === constraint.zoneId)
    case 'onObjectType':
      return unionCells(objectsOfType(board, constraint.objectType).map((o) => onObjectCells(board, o)))
    // Same cells as `onObjectType` today (the window's own occupiable floor
    // is exactly "in front of" it) — kept as a separate case, not a fallthrough,
    // so the day a window's facing cells diverge from its own this is the one
    // line that has to change, not every call site.
    case 'inFrontOfObjectType':
      return unionCells(objectsOfType(board, constraint.objectType).map((o) => onObjectCells(board, o)))
    case 'adjacentToObjectType':
      return unionCells(objectsOfType(board, constraint.objectType).map((o) => adjacentToObjectCells(board, o)))
    case 'inRow':
      return board.cells.filter((c) => isInRow(board, c, constraint.row))
    case 'inColumn':
      return board.cells.filter((c) => isInColumn(board, c, constraint.column))
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

/**
 * Checks a relational constraint against the assignment built so far during search.
 * Returns true both when it holds AND when it can't be evaluated yet (the other
 * person isn't placed) — pruning on an undetermined relation would be wrong.
 */
function pairwiseOkForConstraint(constraint: Constraint, personId: string, assignment: Assignment, board: Board): boolean {
  const myCell = assignedCell(board, assignment, personId)
  if (!myCell) return true

  switch (constraint.type) {
    case 'withPerson': {
      const other = assignedCell(board, assignment, constraint.other)
      return !other || myCell.zoneId === other.zoneId
    }
    case 'direction': {
      const other = assignedCell(board, assignment, constraint.other)
      return !other || isDirection(myCell, other, constraint.dir)
    }
    case 'distance': {
      const other = assignedCell(board, assignment, constraint.other)
      if (!other) return true
      const diff = constraint.axis === 'row' ? other.row - myCell.row : other.col - myCell.col
      return diff === constraint.exact
    }
    case 'not':
      return notPairwiseOk(constraint.of, myCell, assignment, board)
    default:
      // Static-domain constraints are enforced entirely by staticDomain; nothing more to check here.
      return true
  }
}

/**
 * Negation of a relational constraint during search: still true when undetermined
 * (see pairwiseOkForConstraint), otherwise the plain negation of the holding check.
 */
function notPairwiseOk(inner: Constraint, myCell: Cell, assignment: Assignment, board: Board): boolean {
  switch (inner.type) {
    case 'withPerson': {
      const other = assignedCell(board, assignment, inner.other)
      return !other || myCell.zoneId !== other.zoneId
    }
    case 'direction': {
      const other = assignedCell(board, assignment, inner.other)
      return !other || !isDirection(myCell, other, inner.dir)
    }
    case 'distance': {
      const other = assignedCell(board, assignment, inner.other)
      if (!other) return true
      const diff = inner.axis === 'row' ? other.row - myCell.row : other.col - myCell.col
      return diff !== inner.exact
    }
    default:
      // Static-domain negations are handled entirely by staticDomain's complement.
      return true
  }
}

export function pairwiseOk(constraints: Constraint[], personId: string, assignment: Assignment, board: Board): boolean {
  return constraints.every((c) => pairwiseOkForConstraint(c, personId, assignment, board))
}

const STATIC_TYPES = new Set(['inZone', 'onObjectType', 'inFrontOfObjectType', 'adjacentToObjectType', 'inRow', 'inColumn'])

/**
 * Full validity of one constraint against a complete assignment. Every person is
 * placed by this point, so `not` can negate generically — no undetermined case
 * remains (unlike pairwiseOk during search).
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

  switch (constraint.type) {
    case 'withPerson': {
      const other = assignedCell(board, assignment, constraint.other)
      return !!other && cell.zoneId === other.zoneId
    }
    case 'direction': {
      const other = assignedCell(board, assignment, constraint.other)
      return !!other && isDirection(cell, other, constraint.dir)
    }
    case 'distance': {
      const other = assignedCell(board, assignment, constraint.other)
      if (!other) return false
      const diff = constraint.axis === 'row' ? other.row - cell.row : other.col - cell.col
      return diff === constraint.exact
    }
    case 'alone':
    case 'notAlone': {
      const zoneId = constraint.zoneId ?? cell.zoneId
      const occupants = people.filter((p) => assignedCell(board, assignment, p.id)?.zoneId === zoneId).length
      return constraint.type === 'alone' ? occupants === 1 : occupants >= 2
    }
    default:
      return false
  }
}

/**
 * Which of a person's own constraints their current cell fails to satisfy —
 * the raw material for telling a player *why* a wrong guess is wrong, instead
 * of just that it is. Evaluated against whatever the player has placed
 * everyone else on, same as `isCompleteAssignmentValid`.
 */
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
 * The other reason a placement can be wrong despite satisfying every one of
 * the person's own clues: the fundamental row/column rule (Claude/claude.md
 * §2) isn't authored as a constraint on anyone, so `violatedConstraints`
 * alone can't see it.
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
    if (!other) continue
    if (other.row === cell.row) return { axis: 'row', with: otherId }
    if (other.col === cell.col) return { axis: 'col', with: otherId }
  }
  return undefined
}

/**
 * Full validation of a complete assignment: every person's own constraints,
 * plus the fundamental rule that no two people ever share a cell, a row, or a
 * column, anywhere on the board (Claude/claude.md §2) — the rule V1 lacked.
 */
export function isCompleteAssignmentValid(puzzle: Puzzle, assignment: Assignment): boolean {
  const { board, people } = puzzle

  for (const person of people) {
    const cell = assignedCell(board, assignment, person.id)
    if (!cell) return false
    if (!person.constraints.every((c) => isSingleConstraintValid(c, cell, assignment, board, people))) return false
  }

  const usedCells = new Set<string>()
  const usedRows = new Set<number>()
  const usedCols = new Set<number>()
  for (const person of people) {
    const cell = assignedCell(board, assignment, person.id)!
    const key = cellKey(cell)
    if (usedCells.has(key) || usedRows.has(cell.row) || usedCols.has(cell.col)) return false
    usedCells.add(key)
    usedRows.add(cell.row)
    usedCols.add(cell.col)
  }

  return true
}
