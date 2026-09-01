import type { CellRef } from '../../core/model/types'

/*
 * Geometry for drawing a scene object as ONE piece of furniture rather than as
 * the same icon stamped into each of its cells.
 *
 * A playtest put it plainly: two "table" cells side by side should be one long
 * table. So the plan draws every object once, over the whole area it occupies,
 * and needs two things from this module: the object's normalized footprint, and
 * the real outline of the *union* of its cells — not its bounding box, because
 * Le Cormoran's helm station is an L.
 */

/** SVG units per cell. Everything here is authored in a 100-per-cell space. */
export const CELL_UNITS = 100

export interface Footprint {
  /** The object's cells, shifted so the bounding box starts at row 0 / col 0. */
  cells: CellRef[]
  rows: number
  cols: number
  minRow: number
  minCol: number
  /** True when the footprint is a straight run of cells (or a single cell). */
  isRun: boolean
  /** True for a run that goes down the board rather than across it. */
  vertical: boolean
  /** Long side of a run, in units — the length art is drawn against. */
  runLength: number
}

export function footprintOf(cells: CellRef[]): Footprint {
  const minRow = Math.min(...cells.map((c) => c.row))
  const minCol = Math.min(...cells.map((c) => c.col))
  const rows = Math.max(...cells.map((c) => c.row)) - minRow + 1
  const cols = Math.max(...cells.map((c) => c.col)) - minCol + 1
  const isRun = (rows === 1 || cols === 1) && rows * cols === cells.length
  const vertical = rows > cols

  return {
    cells: cells.map((c) => ({ row: c.row - minRow, col: c.col - minCol })),
    rows,
    cols,
    minRow,
    minCol,
    isRun,
    vertical,
    runLength: Math.max(rows, cols) * CELL_UNITS,
  }
}

interface Pt {
  x: number
  y: number
}

const pointKey = (p: Pt) => `${p.x},${p.y}`

/**
 * The outline of the union of `cells`, pulled `inset` units inward and rounded
 * by `radius` at every corner — convex *and* concave, so an L keeps a soft
 * elbow instead of a notch.
 *
 * Cells are expected already normalized (see `footprintOf`). The walk is
 * clockwise in screen coordinates (y down), which is what lets each edge state
 * where its own inside is: for a direction (dx, dy) the interior lies along
 * (-dy, dx). Insetting is then exact rather than approximated, because a union
 * of grid cells is always rectilinear: two consecutive offset edges are
 * perpendicular, so their crossing is just "x of the vertical one, y of the
 * horizontal one".
 */
export function outlinePath(cells: CellRef[], inset = 0, radius = 0, unit = CELL_UNITS): string {
  const occupied = new Set(cells.map((c) => `${c.row}:${c.col}`))
  const has = (row: number, col: number) => occupied.has(`${row}:${col}`)

  const edges: { a: Pt; b: Pt }[] = []
  for (const cell of cells) {
    const x = cell.col * unit
    const y = cell.row * unit
    if (!has(cell.row - 1, cell.col)) edges.push({ a: { x, y }, b: { x: x + unit, y } })
    if (!has(cell.row, cell.col + 1)) edges.push({ a: { x: x + unit, y }, b: { x: x + unit, y: y + unit } })
    if (!has(cell.row + 1, cell.col)) edges.push({ a: { x: x + unit, y: y + unit }, b: { x, y: y + unit } })
    if (!has(cell.row, cell.col - 1)) edges.push({ a: { x, y: y + unit }, b: { x, y } })
  }
  if (edges.length === 0) return ''

  // Chain the boundary into one loop, then drop the vertices where two edges
  // simply continue in the same direction — a two-cell run is one long side,
  // not two short ones butted together.
  const byStart = new Map<string, { a: Pt; b: Pt }>()
  for (const edge of edges) byStart.set(pointKey(edge.a), edge)

  const loop: Pt[] = []
  let cursor = edges[0]
  for (let guard = 0; guard < edges.length + 1; guard += 1) {
    loop.push(cursor.a)
    const next = byStart.get(pointKey(cursor.b))
    if (!next || next === edges[0]) break
    cursor = next
  }

  const corners = loop.filter((p, i) => {
    const prev = loop[(i - 1 + loop.length) % loop.length]
    const next = loop[(i + 1) % loop.length]
    const straightX = prev.x === p.x && p.x === next.x
    const straightY = prev.y === p.y && p.y === next.y
    return !straightX && !straightY
  })
  if (corners.length < 3) return ''

  // Each edge slides `inset` units toward its own interior; a vertex is then the
  // crossing of the two offset lines that meet there.
  const lines = corners.map((p, i) => {
    const next = corners[(i + 1) % corners.length]
    const dx = Math.sign(next.x - p.x)
    const dy = Math.sign(next.y - p.y)
    const horizontal = dy === 0
    // Inward normal of a clockwise walk in screen coordinates.
    return horizontal ? { horizontal, value: p.y + dx * inset } : { horizontal, value: p.x - dy * inset }
  })

  const vertices = corners.map((_, i) => {
    const incoming = lines[(i - 1 + lines.length) % lines.length]
    const outgoing = lines[i]
    return incoming.horizontal
      ? { x: outgoing.value, y: incoming.value }
      : { x: incoming.value, y: outgoing.value }
  })

  return roundedPolygon(vertices, radius)
}

/** A closed path through `points`, with each corner cut back and rounded. */
function roundedPolygon(points: Pt[], radius: number): string {
  const n = points.length
  const cut = (from: Pt, to: Pt) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const r = Math.min(radius, length / 2)
    return { x: from.x + (dx / length) * r, y: from.y + (dy / length) * r }
  }

  const arrive = points.map((p, i) => cut(p, points[(i - 1 + n) % n]))
  const leave = points.map((p, i) => cut(p, points[(i + 1) % n]))

  const round = (v: number) => Math.round(v * 100) / 100
  const at = (p: Pt) => `${round(p.x)} ${round(p.y)}`

  let d = `M ${at(leave[0])}`
  for (let i = 1; i < n; i += 1) d += ` L ${at(arrive[i])} Q ${at(points[i])} ${at(leave[i])}`
  d += ` L ${at(arrive[0])} Q ${at(points[0])} ${at(leave[0])} Z`
  return d
}
