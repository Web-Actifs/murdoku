import { cellKey } from './geometry'
import { parsePlan } from './parsePlan'
import type { Board, Puzzle, PuzzleDef } from './types'
import { validateModel } from './validateModel'

/** Normalizes an author-written PuzzleDef (ASCII plan + legend) into a Puzzle, validating as it goes. */
export function loadPuzzle(def: PuzzleDef): Puzzle {
  const cells = parsePlan(def.plan, def.legend)
  if (cells.length === 0) throw new Error(`Puzzle ${def.id} has an empty plan`)

  const board: Board = {
    cells,
    rows: Math.max(...cells.map((c) => c.row)) + 1,
    cols: Math.max(...cells.map((c) => c.col)) + 1,
    objects: def.objects,
    cellsByKey: new Map(cells.map((c) => [cellKey(c), c])),
  }

  validateModel(def, board)

  return { id: def.id, board, zones: def.zones, people: def.people, victimId: def.victimId }
}
