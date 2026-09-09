import type { Board, Cell, PuzzleDef } from '../../core3/model/types'
import { roomPalette, type RoomStyle } from '../game/planStyle'

/**
 * One colour per room, dealt in authoring order so a room keeps its colour
 * across every view and every reload. Rooms that turn out to share a *volume*
 * still keep their own colour — the plan shows rooms, the volume is shown by
 * outlining, never by re-colouring, or a discovered link would repaint half the
 * house and lose the player.
 */
export function roomStyles(def: PuzzleDef): Map<string, RoomStyle> {
  return new Map(def.rooms.map((room, i) => [room.id, roomPalette[i % roomPalette.length]]))
}

/** Isometric projection, 2:1. The only place screen coordinates are decided. */
export const ISO = {
  tileW: 62,
  tileH: 31,
  /** Vertical separation between exploded levels, in px. */
  floorGap: 158,
  /** How thick a slab looks. */
  slab: 9,
}

export function isoX(row: number, col: number): number {
  return (col - row) * (ISO.tileW / 2)
}

export function isoY(row: number, col: number, floor: number): number {
  return (col + row) * (ISO.tileH / 2) - floor * ISO.floorGap
}

/** The four screen corners of one tile, as an SVG polygon `points` string. */
export function tilePoints(row: number, col: number, floor: number): string {
  const x = isoX(row, col)
  const y = isoY(row, col, floor)
  const hw = ISO.tileW / 2
  const hh = ISO.tileH / 2
  return `${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`
}

/**
 * Painter's order for an isometric scene: back to front. Lower levels are drawn
 * last so they sit in front of the ones above them, and within a level the far
 * tiles (small row+col) come first.
 */
export function isoDrawOrder(cells: Cell[]): Cell[] {
  return [...cells].sort((a, b) => b.floor - a.floor || a.row + a.col - (b.row + b.col))
}

/** The bounding box of the whole exploded building, with room for the wall skirt and the avatars. */
export function isoViewBox(board: Board): { x: number; y: number; w: number; h: number } {
  const xs = board.cells.map((c) => isoX(c.row, c.col))
  const ys = board.cells.map((c) => isoY(c.row, c.col, c.floor))
  const pad = ISO.tileW
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad * 1.4
  const w = Math.max(...xs) - x + pad
  const h = Math.max(...ys) + ISO.slab + ISO.tileH - y + pad * 0.6
  return { x, y, w, h }
}
