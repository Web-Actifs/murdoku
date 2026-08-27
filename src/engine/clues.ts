import { cellById, cellsInRoom, isDirection, isInColumn, isInRow, isOrthogonallyAdjacent } from './grid'
import type { Assignment, CaseDef, ClueDef, GridCell } from './types'

/**
 * Cells a character could occupy based solely on a clue type that doesn't depend on
 * where anyone else ends up. Returns null when the clue gives no such static restriction.
 */
function staticDomainForClue(clue: ClueDef, grid: GridCell[]): GridCell[] | null {
  switch (clue.type) {
    case 'adjacentToDecor':
      // Walls block sightlines: only same-room neighbors count as "next to" the decor.
      return grid.filter((cell) =>
        grid.some(
          (other) =>
            other.id !== cell.id &&
            other.roomId === cell.roomId &&
            isOrthogonallyAdjacent(cell, other) &&
            other.decor?.includes(clue.decor),
        ),
      )
    case 'inRoom':
      return cellsInRoom(grid, clue.roomId)
    case 'inRow':
      return grid.filter((cell) => isInRow(grid, cell, clue.row))
    case 'inColumn':
      return grid.filter((cell) => isInColumn(grid, cell, clue.column))
    default:
      return null
  }
}

/** Intersection of every static domain among a character's clues (null members mean "no restriction"). */
export function staticDomain(clues: ClueDef[], grid: GridCell[]): GridCell[] {
  let domain = grid
  for (const clue of clues) {
    const clueDomain = staticDomainForClue(clue, grid)
    if (clueDomain) {
      const ids = new Set(clueDomain.map((c) => c.id))
      domain = domain.filter((c) => ids.has(c.id))
    }
  }
  return domain
}

/**
 * Checks a clue that references another character, using only the part of the
 * assignment built so far. Returns true when the clue can't be evaluated yet
 * (the referenced character isn't placed) or when it's satisfied.
 */
function pairwiseOkForClue(clue: ClueDef, characterId: string, assignment: Assignment, grid: GridCell[]): boolean {
  const myCellId = assignment[characterId]
  if (!myCellId) return true
  const myCell = cellById(grid, myCellId)

  if (clue.type === 'relativeTo') {
    const targetCellId = assignment[clue.target]
    if (!targetCellId) return true
    const targetCell = cellById(grid, targetCellId)
    return isDirection(myCell, targetCell, clue.direction)
  }

  if (clue.type === 'adjacentToCharacter') {
    const targetCellId = assignment[clue.target]
    if (!targetCellId) return true
    const targetCell = cellById(grid, targetCellId)
    return myCell.roomId === targetCell.roomId && isOrthogonallyAdjacent(myCell, targetCell)
  }

  return true
}

export function pairwiseOk(clues: ClueDef[], characterId: string, assignment: Assignment, grid: GridCell[]): boolean {
  return clues.every((clue) => pairwiseOkForClue(clue, characterId, assignment, grid))
}

function isSingleClueValid(clue: ClueDef, cell: GridCell, assignment: Assignment, caseDef: CaseDef): boolean {
  const { grid, characters } = caseDef

  switch (clue.type) {
    case 'adjacentToDecor':
      return staticDomainForClue(clue, grid)!.some((c) => c.id === cell.id)
    case 'inRoom':
      return cell.roomId === clue.roomId
    case 'inRow':
      return isInRow(grid, cell, clue.row)
    case 'inColumn':
      return isInColumn(grid, cell, clue.column)
    case 'relativeTo': {
      const targetCell = cellById(grid, assignment[clue.target])
      return isDirection(cell, targetCell, clue.direction)
    }
    case 'adjacentToCharacter': {
      const targetCell = cellById(grid, assignment[clue.target])
      return cell.roomId === targetCell.roomId && isOrthogonallyAdjacent(cell, targetCell)
    }
    case 'alone': {
      const occupants = characters.filter((c) => assignment[c.id] && cellById(grid, assignment[c.id]).roomId === cell.roomId)
      return occupants.length === 1
    }
    case 'notAlone': {
      const occupants = characters.filter((c) => assignment[c.id] && cellById(grid, assignment[c.id]).roomId === cell.roomId)
      return occupants.length >= 2
    }
  }
}

/** Full validation of a complete assignment against every character's clues and every global constraint. */
export function isCompleteAssignmentValid(caseDef: CaseDef, assignment: Assignment): boolean {
  const { grid, characters, rooms, globalConstraints = [] } = caseDef

  for (const character of characters) {
    const cellId = assignment[character.id]
    if (!cellId) return false
    const cell = cellById(grid, cellId)
    if (!character.clues.every((clue) => isSingleClueValid(clue, cell, assignment, caseDef))) return false
  }

  for (const constraint of globalConstraints) {
    if (constraint.type === 'noRoomEmpty') {
      for (const room of rooms) {
        const hasOccupant = characters.some((c) => assignment[c.id] && cellById(grid, assignment[c.id]).roomId === room.id)
        if (!hasOccupant) return false
      }
    }
  }

  // one character per cell
  const usedCells = Object.values(assignment)
  if (new Set(usedCells).size !== usedCells.length) return false

  return true
}
