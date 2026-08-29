import { cellAt, cellKey } from '../../core/model/geometry'
import type { Board, SceneObject } from '../../core/model/types'
import type { WallSide } from '../game/planStyle'

export interface WindowSegment {
  side: WallSide
  /** First / last tile of the object's run along that wall — the only ends drawn rounded. */
  startsRun: boolean
  endsRun: boolean
}

/**
 * Bottom last: a bottom-mounted pane would sit under the zone name tag, which
 * hangs off the bottom edge of each zone's corner tile. Top first simply reads
 * best on a printed plan.
 */
const SIDE_PRIORITY: WallSide[] = ['top', 'left', 'right', 'bottom']

const DELTA: Record<WallSide, [number, number]> = {
  top: [-1, 0],
  bottom: [1, 0],
  left: [0, -1],
  right: [0, 1],
}

/**
 * Which exterior wall a window is set into, and where each of its tiles falls in
 * the run. §10 puts every window on the building's hull, so at least one side of
 * every tile has no neighbour; a multi-cell window is a straight run, and the wall
 * it faces is the side that is missing for *all* of its tiles at once — never
 * decided tile by tile, which is what would break a bay into unrelated pieces.
 */
export function windowSegments(board: Board): Map<string, WindowSegment> {
  const segments = new Map<string, WindowSegment>()

  for (const object of board.objects) {
    if (object.type !== 'window') continue

    const side = facingSide(board, object)
    if (!side) continue

    const vertical = side === 'left' || side === 'right'
    const ordered = [...object.cells].sort((a, b) => (vertical ? a.row - b.row : a.col - b.col))

    ordered.forEach((cell, i) => {
      segments.set(cellKey(cell), { side, startsRun: i === 0, endsRun: i === ordered.length - 1 })
    })
  }

  return segments
}

function facingSide(board: Board, object: SceneObject): WallSide | undefined {
  const sameRow = object.cells.every((c) => c.row === object.cells[0].row)
  const sameCol = object.cells.every((c) => c.col === object.cells[0].col)

  // A run along a row can only be glazed on the wall it runs against, and vice
  // versa; a single tile may take any of its open sides.
  const allowed = SIDE_PRIORITY.filter((side) => {
    const vertical = side === 'left' || side === 'right'
    if (object.cells.length === 1) return true
    return vertical ? sameCol : sameRow
  })

  return allowed.find((side) => object.cells.every((cell) => !cellAt(board, cell.row + DELTA[side][0], cell.col + DELTA[side][1])))
}
