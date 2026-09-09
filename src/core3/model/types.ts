import type { Constraint } from '../constraints/types'

/**
 * V3 — Murdoku Élévation.
 *
 * The whole difference with V2 fits in one line: a cell has a `floor`. Everything
 * else in this file follows from it, and most of the rules in Claude/claude.md
 * survive untouched because they were written about `zoneId`, never about
 * geometry (§11 "même zone", §13 "seul", §15 le meurtrier).
 *
 * The three consequences that make V3 a different game:
 *
 * 1. **The row/column rule is per floor.** Two people on the same floor may
 *    never share a row or a column (§2, unchanged). Two people on *different*
 *    floors may share both — one exactly above the other. That single relaxation
 *    is what re-opens person-to-person adjacency, which 2D made unsatisfiable
 *    (see the note in ../constraints/types.ts): "X était juste au-dessus de Y" is
 *    a clue the flat game cannot express at all.
 *
 * 2. **Zones are volumes.** A room id that appears on two floors' plans is one
 *    zone: the salon and the mezzanine overlooking it are the same room, so
 *    "avec", "seul" and the verdict itself span floors. Nothing in the solver
 *    knows about this — it falls out of `zoneId` being shared.
 *
 * 3. **The topology is itself an unknown.** A `RoomLink` welds two rooms into
 *    one volume, and is only applied once the player has found the opening that
 *    joins them (a coal chute, a hatch). The same placements can therefore name
 *    a different culprit before and after a discovery — which is the one thing a
 *    printed Murdoku can never do.
 */

export interface CellRef {
  /** 0 is the bottom-most level of the building; higher numbers are higher up. */
  floor: number
  row: number
  col: number
}

export interface Cell extends CellRef {
  /** The literal room drawn on the plan — what the player is shown. */
  roomId: string
  /**
   * The *volume* the room currently belongs to: its own id normally, or the
   * representative of the group it has been welded into by a discovered
   * `RoomLink`. Every rule in the engine reads this, never `roomId`.
   */
  zoneId: string
}

export interface Room {
  id: string
  nameKey: string
}

/** One level of the building, authored as an ASCII plan exactly like V2's. */
export interface FloorDef {
  id: string
  nameKey: string
  /** Bottom-up: index 0 in `PuzzleDef.floors` is the lowest level. */
  plan: string
  legend: Record<string, string>
}

/**
 * Unchanged from V2 (§7-9) except that `cells` may now span floors: a staircase
 * is *one* object with cells on two levels, and every spatial relation is
 * evaluated over all of them, so "à côté de l'escalier" works on both levels
 * with no new constraint type.
 */
export interface SceneObject {
  id: string
  type: string
  occupiable: boolean
  cells: CellRef[]
}

/**
 * A hole in a floor: the listed cells belong to the *upper* level and have no
 * floor under them. Two cells vertically stacked count as "à côté" only through
 * one of these — a concrete slab is not a neighbour, a stairwell is.
 */
export interface Opening {
  id: string
  kind: 'stair' | 'void' | 'hatch' | 'chute'
  /** Cells on the upper floor whose floor is open to the level below. */
  cells: CellRef[]
}

/**
 * Two rooms that turn out to be a single volume — the discovery mechanic. Held
 * apart from `Opening` on purpose: an opening is geometry the player can see
 * from the start, a link is a *fact about the building* that has to be found,
 * and applying it rewrites who counts as being with whom.
 */
export interface RoomLink {
  id: string
  rooms: [string, string]
  nameKey: string
}

/** Normalized, derived building — built by loadPuzzle, never hand-authored. */
export interface Board {
  cells: Cell[]
  floors: number
  rows: number
  cols: number
  objects: SceneObject[]
  openings: Opening[]
  cellsByKey: Map<string, Cell>
  /** roomId -> volume id, after the currently-discovered links are applied. */
  volumeOf: Map<string, string>
}

export interface PersonDef {
  id: string
  nameKey: string
  isVictim?: boolean
  /** Only the clues currently revealed — see `puzzleFor`. */
  constraints: Constraint[]
}

/**
 * One testimony. Unlike V2, a clue is a first-class object with an id, because
 * V3 hands them out over time: `revealedBy` names the gate that produces it, or
 * `'start'` for the ones in the opening dossier.
 */
export interface Clue {
  id: string
  personId: string
  constraint: Constraint
  revealedBy: string
}

/**
 * A door that opens on a *proof*, not on a button.
 *
 * `requires` is the deduction the player has to make: place this person on this
 * cell. The case is only valid if that placement is already entailed by the
 * clues revealed before the gate — checked by `entailsPlacement`, so a gate can
 * never be a guess. What the player supplies is the reading, not the luck.
 */
export interface Gate {
  id: string
  requires: { personId: string; cell: string }
  /**
   * A gate that cannot be reached before another one has been opened. Without
   * this a lucky guess could skip an act: the proof a later gate asks for is
   * only *entailed* once the earlier act's clues are in hand, but nothing stops
   * a player from dropping the right person on the right cell by accident.
   */
  requiresGate?: string
  /** Floor index the gate makes accessible, if any. */
  unlocksFloor?: number
  /** RoomLink discovered on the other side of it, if any. */
  unlocksLink?: string
  narrativeKey: string
}

export interface PuzzleDef {
  id: string
  /** Bottom-up. */
  floors: FloorDef[]
  rooms: Room[]
  objects: SceneObject[]
  openings: Opening[]
  links: RoomLink[]
  people: Omit<PersonDef, 'constraints'>[]
  victimId: string
  clues: Clue[]
  gates: Gate[]
  /** Floor indices the player starts with. */
  startFloors: number[]
}

/** Normalized puzzle for one state of discovery. */
export interface Puzzle {
  id: string
  board: Board
  rooms: Room[]
  people: PersonDef[]
  victimId: string
}

/** personId -> cell key ("floor:row:col"). */
export type Assignment = Record<string, string>

/** What the player has uncovered so far — the only thing that varies at runtime. */
export interface Discovery {
  revealedClues: ReadonlySet<string>
  unlockedLinks: ReadonlySet<string>
  accessibleFloors: ReadonlySet<number>
}
