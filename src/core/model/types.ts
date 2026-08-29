import type { Constraint } from '../constraints/types'

export interface CellRef {
  row: number
  col: number
}

export interface Cell extends CellRef {
  zoneId: string
}

export interface Zone {
  id: string
  nameKey: string
}

/**
 * A first-class entity, not a per-cell tag — `cells` can span more than one cell
 * (a bed, a window) and every spatial relation is evaluated over all of them
 * (Claude/claude.md §7-9). Windows are objects with `occupiable: false` whose
 * cells must sit on the building's exterior boundary (validated in validateModel).
 */
export interface SceneObject {
  id: string
  type: string
  occupiable: boolean
  cells: CellRef[]
}

/** Normalized, derived board — built once by loadPuzzle, never hand-authored. */
export interface Board {
  cells: Cell[]
  rows: number
  cols: number
  objects: SceneObject[]
  cellsByKey: Map<string, Cell>
}

export interface PersonDef {
  id: string
  nameKey: string
  isVictim?: boolean
  /** All constraints must hold at once (AND). */
  constraints: Constraint[]
}

/** Author-facing input: an ASCII plan + legend, rather than a hand-written cell list. */
export interface PuzzleDef {
  id: string
  plan: string
  /** Maps a plan character to a zone id; '.' always means "outside the building". */
  legend: Record<string, string>
  zones: Zone[]
  objects: SceneObject[]
  people: PersonDef[]
  victimId: string
}

/** Normalized puzzle, produced by loadPuzzle from a PuzzleDef. */
export interface Puzzle {
  id: string
  board: Board
  zones: Zone[]
  people: PersonDef[]
  victimId: string
}

/** personId -> cell key ("row:col"). */
export type Assignment = Record<string, string>
