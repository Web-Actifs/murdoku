import type { Constraint } from '../constraints/types'
import { cellAt, cellKey, isPeripheral } from './geometry'
import type { Board, CellRef, PuzzleDef } from './types'

/**
 * Fails loudly on any structural inconsistency rather than loading a puzzle
 * degraded — an author mistake (a window on an interior cell, too many people
 * for the grid) becomes a load-time error, not a silent in-game bug.
 */
export function validateModel(def: PuzzleDef, board: Board): void {
  assertUnique(def.people.map((p) => p.id), 'person')
  assertUnique(def.objects.map((o) => o.id), 'object')
  assertUnique(def.zones.map((z) => z.id), 'zone')
  assertObjectsWellFormed(def, board)
  assertRowColCapacity(def, board)
  assertVictimExists(def)
  assertConstraintsSatisfiable(def)
}

function assertUnique(ids: string[], label: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Duplicate ${label} id: ${id}`)
    seen.add(id)
  }
}

function assertObjectsWellFormed(def: PuzzleDef, board: Board): void {
  for (const obj of def.objects) {
    if (obj.cells.length === 0) throw new Error(`Object ${obj.id} has no cells`)

    const cells = obj.cells.map((ref) => {
      const cell = cellAt(board, ref.row, ref.col)
      if (!cell) throw new Error(`Object ${obj.id} references a cell outside the plan: ${cellKey(ref)}`)
      return cell
    })

    if (new Set(cells.map((c) => c.zoneId)).size > 1) {
      throw new Error(`Object ${obj.id} spans more than one zone`)
    }

    assertContiguous(obj.id, cells)

    if (obj.type === 'window') {
      for (const cell of cells) {
        if (!isPeripheral(board, cell)) {
          throw new Error(`Window ${obj.id} claims cell ${cellKey(cell)}, which isn't on the building's exterior`)
        }
      }
    }
  }
}

function assertContiguous(objectId: string, cells: CellRef[]): void {
  if (cells.length <= 1) return

  const keys = new Set(cells.map(cellKey))
  const visited = new Set<string>([cellKey(cells[0])])
  const stack: CellRef[] = [cells[0]]

  while (stack.length > 0) {
    const current = stack.pop()!
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const neighbor = { row: current.row + dr, col: current.col + dc }
      const key = cellKey(neighbor)
      if (keys.has(key) && !visited.has(key)) {
        visited.add(key)
        stack.push(neighbor)
      }
    }
  }

  if (visited.size !== cells.length) {
    throw new Error(`Object ${objectId}'s cells aren't all orthogonally contiguous`)
  }
}

function assertRowColCapacity(def: PuzzleDef, board: Board): void {
  const capacity = Math.min(board.rows, board.cols)
  if (def.people.length > capacity) {
    throw new Error(
      `${def.people.length} people can't fit on a ${board.rows}x${board.cols} board — ` +
        `at most ${capacity} (one person per row AND per column)`,
    )
  }
}

function assertVictimExists(def: PuzzleDef): void {
  if (!def.people.some((p) => p.id === def.victimId)) {
    throw new Error(`victimId "${def.victimId}" doesn't match any person`)
  }
}

/**
 * A `distance` of exactly 0 between two people means sharing a row or a column
 * — structurally impossible under §2, the same way person-to-person adjacency
 * is (see constraints/types.ts). Nothing else in the vocabulary can express an
 * unsatisfiable person-to-person relation, so this is the one case worth a
 * dedicated check rather than letting it surface as an unexplained
 * `contradiction` at solve time.
 */
function assertConstraintsSatisfiable(def: PuzzleDef): void {
  for (const person of def.people) {
    for (const constraint of person.constraints) assertConstraintSatisfiable(person.id, constraint)
  }
}

function assertConstraintSatisfiable(personId: string, constraint: Constraint): void {
  if (constraint.type === 'not') {
    assertConstraintSatisfiable(personId, constraint.of)
    return
  }
  if (constraint.type === 'distance' && constraint.exact === 0) {
    throw new Error(
      `${personId}'s distance constraint against ${constraint.other} has exact: 0 on axis "${constraint.axis}" — ` +
        `that requires sharing a ${constraint.axis}, which no two people can do under the global row/column rule`,
    )
  }
}
