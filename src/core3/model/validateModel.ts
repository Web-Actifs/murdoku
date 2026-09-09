import type { Constraint } from '../constraints/types'
import { cellKey, isPeripheral, neighborsOf } from './geometry'
import type { Board, Cell, PersonDef, PuzzleDef } from './types'

/**
 * Fails loudly on any structural inconsistency rather than loading a building
 * degraded — an author mistake (a window on an interior wall, a staircase with
 * no stairwell under it, a gate that asks for a cell that does not exist)
 * becomes a load-time error, not a silent in-game bug.
 */
export function validateModel(def: PuzzleDef, board: Board, people: PersonDef[]): void {
  assertUnique(def.people.map((p) => p.id), 'person')
  assertUnique(def.objects.map((o) => o.id), 'object')
  assertUnique(def.rooms.map((r) => r.id), 'room')
  assertUnique(def.floors.map((f) => f.id), 'floor')
  assertUnique(def.clues.map((c) => c.id), 'clue')
  assertUnique(def.gates.map((g) => g.id), 'gate')
  assertUnique(def.links.map((l) => l.id), 'link')

  assertRoomsDeclared(def, board)
  assertObjectsWellFormed(def, board)
  assertOpeningsWellFormed(def, board)
  assertLinksWellFormed(def)
  assertCapacity(def, board)
  assertVictimExists(def)
  assertCluesWellFormed(def, board)
  assertGatesWellFormed(def, board)
  assertConstraintsSatisfiable(def, board, people)
}

function assertUnique(ids: string[], label: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Duplicate ${label} id: ${id}`)
    seen.add(id)
  }
}

function assertRoomsDeclared(def: PuzzleDef, board: Board): void {
  const declared = new Set(def.rooms.map((r) => r.id))
  for (const cell of board.cells) {
    if (!declared.has(cell.roomId)) throw new Error(`Plan uses room "${cell.roomId}" at ${cellKey(cell)}, which is not declared`)
  }
}

function assertObjectsWellFormed(def: PuzzleDef, board: Board): void {
  for (const obj of def.objects) {
    if (obj.cells.length === 0) throw new Error(`Object ${obj.id} has no cells`)

    const cells = obj.cells.map((ref) => {
      const cell = board.cellsByKey.get(cellKey(ref))
      if (!cell) throw new Error(`Object ${obj.id} references a cell outside the building: ${cellKey(ref)}`)
      return cell
    })

    // A staircase is the object that legitimately belongs to two rooms — the
    // vestibule below and the landing above — so the single-room rule is
    // enforced per level rather than over the whole object.
    for (const floor of new Set(cells.map((c) => c.floor))) {
      const onFloor = cells.filter((c) => c.floor === floor)
      if (new Set(onFloor.map((c) => c.roomId)).size > 1) {
        throw new Error(`Object ${obj.id} spans more than one room on floor ${floor}`)
      }
    }

    assertContiguous(board, obj.id, cells)

    if (obj.type === 'window') {
      for (const cell of cells) {
        if (!isPeripheral(board, cell)) {
          throw new Error(`Window ${obj.id} claims cell ${cellKey(cell)}, which isn't on that level's exterior wall`)
        }
      }
    }
  }
}

/**
 * Contiguity in the building's real geometry, vertical hops included — which
 * means a staircase whose two levels have no opening between them fails here.
 * That is deliberate: an object connecting two floors *is* a hole in a floor,
 * and forgetting to declare the hole would otherwise leave the two halves
 * silently unrelated for "à côté de".
 */
function assertContiguous(board: Board, objectId: string, cells: Cell[]): void {
  if (cells.length <= 1) return

  const keys = new Set(cells.map(cellKey))
  const visited = new Set<string>([cellKey(cells[0])])
  const stack: Cell[] = [cells[0]]

  while (stack.length > 0) {
    const current = stack.pop()!
    for (const neighbor of neighborsOf(board, current)) {
      const key = cellKey(neighbor)
      if (keys.has(key) && !visited.has(key)) {
        visited.add(key)
        stack.push(neighbor)
      }
    }
  }

  if (visited.size !== cells.length) {
    throw new Error(`Object ${objectId}'s cells aren't all contiguous (a multi-floor object needs an opening between its levels)`)
  }
}

function assertOpeningsWellFormed(def: PuzzleDef, board: Board): void {
  for (const opening of def.openings) {
    for (const ref of opening.cells) {
      if (ref.floor === 0) throw new Error(`Opening ${opening.id} is on the ground level — there is nothing under it`)
      if (!board.cellsByKey.get(cellKey(ref))) {
        throw new Error(`Opening ${opening.id} references a cell outside the building: ${cellKey(ref)}`)
      }
    }
  }
}

function assertLinksWellFormed(def: PuzzleDef): void {
  const rooms = new Set(def.rooms.map((r) => r.id))
  for (const link of def.links) {
    for (const room of link.rooms) {
      if (!rooms.has(room)) throw new Error(`Link ${link.id} names unknown room "${room}"`)
    }
    if (link.rooms[0] === link.rooms[1]) throw new Error(`Link ${link.id} joins a room to itself`)
  }
}

/**
 * §2 is per floor here, so capacity is too: each level can hold at most as many
 * people as it has usable rows or columns, whichever is fewer, and the building
 * can hold the sum.
 */
function assertCapacity(def: PuzzleDef, board: Board): void {
  let capacity = 0
  for (let floor = 0; floor < board.floors; floor++) {
    const cells = board.cells.filter((c) => c.floor === floor)
    if (cells.length === 0) continue
    capacity += Math.min(new Set(cells.map((c) => c.row)).size, new Set(cells.map((c) => c.col)).size)
  }
  if (def.people.length > capacity) {
    throw new Error(`${def.people.length} people can't fit in this building — at most ${capacity} (one person per row AND per column, per floor)`)
  }
}

function assertVictimExists(def: PuzzleDef): void {
  if (!def.people.some((p) => p.id === def.victimId)) {
    throw new Error(`victimId "${def.victimId}" doesn't match any person`)
  }
}

function assertCluesWellFormed(def: PuzzleDef, board: Board): void {
  const people = new Set(def.people.map((p) => p.id))
  const sources = new Set<string>(['start', ...def.gates.map((g) => g.id)])
  const rooms = new Set(def.rooms.map((r) => r.id))
  const objectTypes = new Set(def.objects.map((o) => o.type))

  for (const clue of def.clues) {
    if (!people.has(clue.personId)) throw new Error(`Clue ${clue.id} is about unknown person "${clue.personId}"`)
    if (!sources.has(clue.revealedBy)) throw new Error(`Clue ${clue.id} is revealed by "${clue.revealedBy}", which is neither "start" nor a gate`)
    assertConstraintReferences(clue.id, clue.constraint, people, rooms, objectTypes, board)
  }
}

function assertConstraintReferences(
  label: string,
  constraint: Constraint,
  people: ReadonlySet<string>,
  rooms: ReadonlySet<string>,
  objectTypes: ReadonlySet<string>,
  board: Board,
): void {
  switch (constraint.type) {
    case 'not':
      assertConstraintReferences(label, constraint.of, people, rooms, objectTypes, board)
      return
    case 'inZone':
      // A clue names a *room*; the volume it belongs to is resolved at load time.
      if (!rooms.has(constraint.zoneId)) throw new Error(`${label} names unknown room "${constraint.zoneId}"`)
      return
    case 'onFloor':
      if (constraint.floor < 0 || constraint.floor >= board.floors) throw new Error(`${label} names floor ${constraint.floor}, out of range`)
      return
    case 'onObjectType':
    case 'adjacentToObjectType':
    case 'inFrontOfObjectType':
      if (!objectTypes.has(constraint.objectType)) throw new Error(`${label} names object type "${constraint.objectType}", absent from the building`)
      return
    case 'withPerson':
    case 'direction':
    case 'distance':
    case 'above':
    case 'below':
    case 'sameShaft':
      if (!people.has(constraint.other)) throw new Error(`${label} refers to unknown person "${constraint.other}"`)
      return
    default:
      return
  }
}

function assertGatesWellFormed(def: PuzzleDef, board: Board): void {
  const people = new Set(def.people.map((p) => p.id))
  const links = new Set(def.links.map((l) => l.id))

  for (const gate of def.gates) {
    if (!people.has(gate.requires.personId)) throw new Error(`Gate ${gate.id} requires unknown person "${gate.requires.personId}"`)
    if (!board.cellsByKey.get(gate.requires.cell)) throw new Error(`Gate ${gate.id} requires cell ${gate.requires.cell}, which is not in the building`)
    if (gate.unlocksFloor !== undefined && (gate.unlocksFloor < 0 || gate.unlocksFloor >= board.floors)) {
      throw new Error(`Gate ${gate.id} unlocks floor ${gate.unlocksFloor}, out of range`)
    }
    if (gate.unlocksLink !== undefined && !links.has(gate.unlocksLink)) {
      throw new Error(`Gate ${gate.id} unlocks unknown link "${gate.unlocksLink}"`)
    }
    if (gate.unlocksFloor === undefined && gate.unlocksLink === undefined) {
      throw new Error(`Gate ${gate.id} unlocks nothing`)
    }
  }
}

/**
 * The V2 ban on `distance: 0` is deliberately *not* carried over: sharing a row
 * is only impossible on one level, and saying two people shared one is exactly
 * how V3 says "then they were on different floors" without saying which. What
 * remains unsatisfiable is a vertical claim taller than the building, or an
 * `above`/`below` of zero levels, which would mean standing in one's own cell.
 */
function assertConstraintsSatisfiable(def: PuzzleDef, board: Board, people: PersonDef[]): void {
  void people
  for (const clue of def.clues) assertConstraintSatisfiable(clue.id, clue.constraint, board)
}

function assertConstraintSatisfiable(label: string, constraint: Constraint, board: Board): void {
  if (constraint.type === 'not') {
    assertConstraintSatisfiable(label, constraint.of, board)
    return
  }
  if ((constraint.type === 'above' || constraint.type === 'below') && constraint.exact !== undefined) {
    if (constraint.exact <= 0) throw new Error(`${label} has exact: ${constraint.exact} — "${constraint.type}" counts levels upward from 1`)
    if (constraint.exact >= board.floors) throw new Error(`${label} reaches ${constraint.exact} levels, taller than the building`)
  }
  if (constraint.type === 'distance' && constraint.axis === 'floor' && Math.abs(constraint.exact) >= board.floors) {
    throw new Error(`${label} spans ${constraint.exact} levels, taller than the building`)
  }
}
