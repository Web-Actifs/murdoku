import type { Constraint } from '../constraints/types'
import { cellKey } from './geometry'
import { parseFloorPlan } from './parsePlan'
import type { Board, Cell, Discovery, PersonDef, Puzzle, PuzzleDef } from './types'
import { validateModel } from './validateModel'

/** Everything found: the state the case is verified against. */
export function fullDiscovery(def: PuzzleDef): Discovery {
  return {
    revealedClues: new Set(def.clues.map((c) => c.id)),
    unlockedLinks: new Set(def.links.map((l) => l.id)),
    accessibleFloors: new Set(def.floors.map((_, i) => i)),
  }
}

/** The opening dossier: the clues handed over before the player has moved. */
export function startDiscovery(def: PuzzleDef): Discovery {
  return {
    revealedClues: new Set(def.clues.filter((c) => c.revealedBy === 'start').map((c) => c.id)),
    unlockedLinks: new Set<string>(),
    accessibleFloors: new Set(def.startFloors),
  }
}

/**
 * roomId -> volume id, after welding every discovered link. Union-find without
 * the ceremony: there are a handful of rooms, and the representative is simply
 * the smallest id in the group so the mapping is stable across runs.
 */
export function volumesFor(def: PuzzleDef, unlockedLinks: ReadonlySet<string>): Map<string, string> {
  const parent = new Map<string, string>(def.rooms.map((r) => [r.id, r.id]))

  const find = (id: string): string => {
    let current = id
    while (parent.get(current) !== current) current = parent.get(current)!
    return current
  }

  for (const link of def.links) {
    if (!unlockedLinks.has(link.id)) continue
    const [a, b] = link.rooms.map(find)
    if (a === b) continue
    const [keep, drop] = a < b ? [a, b] : [b, a]
    parent.set(drop, keep)
  }

  return new Map(def.rooms.map((r) => [r.id, find(r.id)]))
}

/**
 * Normalizes an authored `PuzzleDef` into the puzzle *as currently known*: the
 * building is always whole (the engine never hides cells from itself — that is
 * the UI's job), but the volumes reflect which links have been discovered and
 * each person carries only the clues revealed so far.
 */
export function loadPuzzle(def: PuzzleDef, discovery: Discovery = fullDiscovery(def)): Puzzle {
  const volumeOf = volumesFor(def, discovery.unlockedLinks)

  const cells: Cell[] = def.floors.flatMap((floorDef, index) =>
    parseFloorPlan(floorDef.plan, floorDef.legend, index).map((parsed) => ({
      ...parsed,
      zoneId: volumeOf.get(parsed.roomId) ?? parsed.roomId,
    })),
  )
  if (cells.length === 0) throw new Error(`Puzzle ${def.id} has an empty building`)

  const board: Board = {
    cells,
    floors: def.floors.length,
    rows: Math.max(...cells.map((c) => c.row)) + 1,
    cols: Math.max(...cells.map((c) => c.col)) + 1,
    objects: def.objects,
    openings: def.openings,
    cellsByKey: new Map(cells.map((c) => [cellKey(c), c])),
    volumeOf,
  }

  const people: PersonDef[] = def.people.map((person) => ({
    ...person,
    constraints: def.clues.filter((c) => c.personId === person.id && discovery.revealedClues.has(c.id)).map((c) => c.constraint),
  }))

  validateModel(def, board, people)

  return { id: def.id, board, rooms: def.rooms, people, victimId: def.victimId }
}

/**
 * Re-dresses an already-normalized puzzle with a different clue set. The
 * building does not change during a clue search, so rebuilding it through
 * `loadPuzzle` on every one of the thousands of `propagate` calls would only
 * re-parse and re-validate the same plans.
 */
export function puzzleWithClues(base: Puzzle, clues: ReadonlyMap<string, Constraint[]>): Puzzle {
  return { ...base, people: base.people.map((p) => ({ ...p, constraints: clues.get(p.id) ?? [] })) }
}
