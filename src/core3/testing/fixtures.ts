import type { PuzzleDef } from '../model/types'

/**
 * The smallest building that can show what V3 is for: two 3x3 levels, one room
 * each, nothing in the way. Everything the flat game forbids between two people
 * — sharing a row, sharing a column, standing next to each other — is legal here
 * as long as they are on different levels.
 */
export function twoStoreyShell(): PuzzleDef {
  return {
    id: 'test-tower',
    floors: [
      { id: 'rdc', nameKey: 'rdc', plan: 'AAA\nAAA\nAAA', legend: { A: 'salon' } },
      { id: 'etage', nameKey: 'etage', plan: 'BBB\nBBB\nBBB', legend: { B: 'chambre' } },
    ],
    rooms: [
      { id: 'salon', nameKey: 'salon' },
      { id: 'chambre', nameKey: 'chambre' },
    ],
    objects: [],
    openings: [],
    links: [],
    people: [
      { id: 'a', nameKey: 'a' },
      { id: 'b', nameKey: 'b' },
      { id: 'v', nameKey: 'v', isVictim: true },
    ],
    victimId: 'v',
    clues: [],
    gates: [],
    startFloors: [0],
  }
}

/** A two-level building whose upper room is a mezzanine over the lower one: one volume, two floors. */
export function mezzanineShell(): PuzzleDef {
  const shell = twoStoreyShell()
  return {
    ...shell,
    id: 'test-mezzanine',
    floors: [shell.floors[0], { ...shell.floors[1], plan: 'BB.\nBB.\nBB.', legend: { B: 'salon' } }],
    rooms: [{ id: 'salon', nameKey: 'salon' }],
    openings: [{ id: 'tremie', kind: 'void', cells: [{ floor: 1, row: 0, col: 0 }] }],
  }
}
