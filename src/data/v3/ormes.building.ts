import type { Gate, Opening, PuzzleDef, RoomLink, SceneObject } from '../../core3/model/types'

/**
 * « Le 12, rue des Ormes » — the first V3 case, and the shell the clue search
 * runs against. Everything here is authored; only the testimonies are searched.
 *
 * The building, bottom to top. Three levels on one 5x5 footprint:
 *
 *   étage (2)          rdc (1)            cave (0)
 *   P P P M M          V V V S S          . . . . .
 *   P P P M M          V V V S S          . . . . .
 *   B B B . .          C C S S S          C C C . .
 *   B B B . .          C C A A A          C C C H H
 *   . . . . .          C C A A A          C C C H H
 *
 *   V vestibule   S salon     C cuisine   A arrière-cuisine
 *   P palier      M salon (mezzanine)     B chambre
 *   C cellier     H chaufferie
 *
 * Three things in that diagram are the whole design.
 *
 * **M is not a room of its own.** The mezzanine's plan character maps to
 * `salon`, the same room as the ground floor's S, so the two levels are one
 * volume. Léon at the ground-floor window and Hortense at the rail directly over
 * him are in the same place, by the only definition the engine has (§11). And
 * they are the *only* two in it: "Léon n'était pas seul dans le salon" is
 * therefore true, unprovable on the ground floor, and the first act's whole
 * lesson.
 *
 * **H and A are separate rooms that are secretly one volume.** A coal chute runs
 * from the scullery wall down into the boiler room, and the case does not say so
 * until the player has gone down and stood in front of it. Until then the body's
 * room holds the body and nobody else, and the case has no answer at all — not a
 * wrong answer, no answer. `goulotte` is the `RoomLink` that welds them, and
 * welding them names a culprit without moving a single person.
 *
 * **The ground floor is a full 5x5 permutation.** Five of the eight are down
 * there, one per row and one per column with nothing spare, which is what lets
 * the body's cell fall out of §2 alone: every other cell of the scullery is
 * struck off by somebody else's row or column, and the last one left is where
 * she lay (§14, as an ordering property of the proof rather than a placement
 * rule).
 *
 * The three doors, each opening on a proof rather than on a button:
 *
 *   1. house keys under the kitchen rug → who stood on the rug (opens the stair)
 *   2. the padlock key in the bedside table → who slept upstairs (opens the cellar)
 *   3. the man in the boiler room  → and behind him, the chute
 *
 * Every one of those placements is entailed by the clues already in hand when
 * the player reaches the door, and by none of the clues before it — both
 * asserted in ormes.test.ts, which is what stops a door from being a guess and
 * an act from being a formality.
 */

const CAVE = `
.....
.....
CCC..
CCCHH
CCCHH
`

const RDC = `
VVVSS
VVVSS
CCSSS
CCAAA
CCAAA
`

const ETAGE = `
PPPMM
PPPMM
BBB..
BBB..
.....
`

const objects: SceneObject[] = [
  // — cave —
  { id: 'chaudiere', type: 'chaudiere', occupiable: false, cells: [{ floor: 0, row: 3, col: 3 }, { floor: 0, row: 3, col: 4 }] },
  { id: 'casiers', type: 'casier', occupiable: false, cells: [{ floor: 0, row: 4, col: 0 }, { floor: 0, row: 4, col: 1 }] },

  // — rez-de-chaussée —
  { id: 'portemanteau', type: 'portemanteau', occupiable: false, cells: [{ floor: 1, row: 0, col: 0 }] },
  // The window is in the wall; its cells are the ordinary floor one stands on to
  // look out (§10), which is why it is `occupiable`.
  { id: 'fenetreRue', type: 'window', occupiable: true, cells: [{ floor: 1, row: 0, col: 3 }, { floor: 1, row: 0, col: 4 }] },
  { id: 'cheminee', type: 'cheminee', occupiable: false, cells: [{ floor: 1, row: 1, col: 4 }, { floor: 1, row: 2, col: 4 }] },
  { id: 'tapisCuisine', type: 'tapis', occupiable: true, cells: [{ floor: 1, row: 2, col: 0 }, { floor: 1, row: 2, col: 1 }] },
  { id: 'fourneau', type: 'fourneau', occupiable: false, cells: [{ floor: 1, row: 3, col: 0 }, { floor: 1, row: 3, col: 1 }] },
  { id: 'evier', type: 'evier', occupiable: false, cells: [{ floor: 1, row: 4, col: 3 }, { floor: 1, row: 4, col: 4 }] },

  /**
   * One object, two levels — the thing V2's model could describe but never
   * build. "À côté de l'escalier" therefore names the vestibule cell downstairs
   * *and* the landing cell upstairs, with no new constraint type: §9's union over
   * an object's cells simply has a floor in it now. It also forces the stairwell
   * to be declared, since validateModel checks the object is contiguous in the
   * building's real geometry and a slab would break it in two.
   */
  { id: 'escalier', type: 'escalier', occupiable: false, cells: [{ floor: 1, row: 1, col: 1 }, { floor: 2, row: 1, col: 1 }] },

  // — étage —
  { id: 'lit', type: 'lit', occupiable: true, cells: [{ floor: 2, row: 2, col: 0 }, { floor: 2, row: 3, col: 0 }] },
  { id: 'armoire', type: 'armoire', occupiable: false, cells: [{ floor: 2, row: 2, col: 2 }] },
  // Its own type rather than a second `window`: an object type's domain is the
  // union over the whole building (§50), so a skylight called a window would drag
  // every ground-floor window clue up here and make it unshowable in act I.
  { id: 'lucarne', type: 'lucarne', occupiable: true, cells: [{ floor: 2, row: 1, col: 4 }] },
]

const openings: Opening[] = [
  /** The stairwell: what makes the staircase one continuous object across two levels. */
  { id: 'cageEscalier', kind: 'stair', cells: [{ floor: 2, row: 1, col: 1 }] },
  /** The hatch under the kitchen rug — shut, and unknown, until the second door opens. */
  { id: 'trappeCuisine', kind: 'hatch', cells: [{ floor: 1, row: 2, col: 0 }] },
]

const links: RoomLink[] = [{ id: 'goulotte', rooms: ['chaufferie', 'arriere'], nameKey: 'goulotte' }]

const gates: Gate[] = [
  /**
   * The house keys, dropped under the kitchen rug. Whoever stood on the rug had
   * them, and they open the stair door — so the first act is won by proving
   * where the cook was standing. Lifting the rug also uncovers a padlocked hatch,
   * which is the whole shape of the case in one move: an answer that hands you a
   * better question.
   */
  { id: 'gateEscalier', requires: { personId: 'mathilde', cell: '1:2:0' }, unlocksFloor: 2, narrativeKey: 'gateEscalier' },
  /** The padlock's key never left the bedside table upstairs. Whose room was it? */
  {
    id: 'gateTrappe',
    requires: { personId: 'gaspard', cell: '2:3:0' },
    requiresGate: 'gateEscalier',
    unlocksFloor: 0,
    narrativeKey: 'gateTrappe',
  },
  {
    id: 'gateGoulotte',
    requires: { personId: 'aubin', cell: '0:4:3' },
    requiresGate: 'gateTrappe',
    unlocksLink: 'goulotte',
    narrativeKey: 'gateGoulotte',
  },
]

/** The case with no testimonies — the exact input the staged search expects. */
export const ormesShell: PuzzleDef = {
  id: 'ormes',
  floors: [
    { id: 'cave', nameKey: 'cave', plan: CAVE, legend: { C: 'cellier', H: 'chaufferie' } },
    { id: 'rdc', nameKey: 'rdc', plan: RDC, legend: { V: 'vestibule', S: 'salon', C: 'cuisine', A: 'arriere' } },
    // M maps to `salon`, not to a room of its own: this single line is the mezzanine.
    { id: 'etage', nameKey: 'etage', plan: ETAGE, legend: { P: 'palier', M: 'salon', B: 'chambre' } },
  ],
  rooms: [
    { id: 'cellier', nameKey: 'cellier' },
    { id: 'chaufferie', nameKey: 'chaufferie' },
    { id: 'vestibule', nameKey: 'vestibule' },
    { id: 'salon', nameKey: 'salon' },
    { id: 'cuisine', nameKey: 'cuisine' },
    { id: 'arriere', nameKey: 'arriere' },
    { id: 'palier', nameKey: 'palier' },
    { id: 'chambre', nameKey: 'chambre' },
  ],
  objects,
  openings,
  links,
  people: [
    { id: 'leon', nameKey: 'leon' },
    { id: 'victorine', nameKey: 'victorine' },
    { id: 'mathilde', nameKey: 'mathilde' },
    { id: 'edmond', nameKey: 'edmond' },
    { id: 'hortense', nameKey: 'hortense' },
    { id: 'gaspard', nameKey: 'gaspard' },
    { id: 'aubin', nameKey: 'aubin' },
    { id: 'solange', nameKey: 'solange', isVictim: true },
  ],
  victimId: 'solange',
  clues: [],
  gates,
  startFloors: [1],
}

/**
 * The placement the case is written from, chosen by hand rather than searched —
 * the drama depends on exactly who ends up where:
 *
 * - Hortense stands one level directly over Léon, and the two of them are alone
 *   in a volume that looks like two separate rooms;
 * - the body lies in the scullery with nobody else in it;
 * - Aubin is alone in the boiler room, at the other end of the chute;
 * - the five on the ground floor use up all five rows and all five columns,
 *   which is what leaves the body exactly one cell.
 */
export const ormesSolution: Record<string, string> = {
  leon: '1:0:4',
  victorine: '1:1:2',
  mathilde: '1:2:0',
  solange: '1:3:3',
  edmond: '1:4:1',
  hortense: '2:0:4',
  gaspard: '2:3:0',
  aubin: '0:4:3',
}
