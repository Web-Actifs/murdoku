import type { Clue, PuzzleDef } from '../../core3/model/types'
import { ormesShell, ormesSolution } from './ormes.building'

/**
 * « Le 12, rue des Ormes » — the dossier.
 *
 * Produced by `npx tsx tools/generate-v3-case.ts` at seed 59 and frozen here.
 * Fourteen testimonies, six then five then three, and the search guarantees what
 * no amount of re-reading could: each door is entailed by the clues in hand when
 * the player reaches it and by none of the clues before it, no act finishes the
 * building early, the placement is unique, and propagation alone gets there
 * without a single guess. Depth 11, seventeen articulation points.
 *
 * The two lines that were written rather than drawn:
 *
 *   c2 — "Léon n'était pas seul au salon." True, and unprovable on the ground
 *        floor: his company was Hortense, one level up, over the same room.
 *        Act I's whole job is to make that impossible to explain, so act II can
 *        explain it.
 *
 *   c7 — "Hortense se tenait exactement au-dessus de Léon." Person-to-person
 *        adjacency, which the flat ruleset cannot express at all (two touching
 *        cells always share a row or a column, and §2 forbids that between
 *        people). Stacked, they share both and violate nothing.
 *
 * Everything else the search chose. What it chose is worth reading as a
 * demonstration of the vocabulary the third dimension adds: c4 and c12 are
 * `onFloor` — one witness who never went up, one man who never came back up —
 * and c11 says two people were on the same level without saying which, which is
 * a sentence V2 had no way to form.
 */
const clues: Clue[] = [
  // — Acte I : le rez-de-chaussée —
  /** The one thing the police know before anyone speaks: where she was found. */
  { id: 'c1', personId: 'solange', revealedBy: 'start', constraint: { type: 'inZone', zoneId: 'arriere' } },
  { id: 'c2', personId: 'leon', revealedBy: 'start', constraint: { type: 'notAlone' } },
  { id: 'c3', personId: 'mathilde', revealedBy: 'start', constraint: { type: 'direction', other: 'edmond', dir: 'W' } },
  { id: 'c4', personId: 'victorine', revealedBy: 'start', constraint: { type: 'onFloor', floor: 1 } },
  { id: 'c5', personId: 'edmond', revealedBy: 'start', constraint: { type: 'inZone', zoneId: 'cuisine' } },
  /** The rug — two cells, so it does not hand her over; Edmond's column finishes the job. */
  { id: 'c6', personId: 'mathilde', revealedBy: 'start', constraint: { type: 'onObjectType', objectType: 'tapis' } },

  // — Acte II : l'étage —
  { id: 'c7', personId: 'hortense', revealedBy: 'gateEscalier', constraint: { type: 'above', other: 'leon', exact: 1 } },
  { id: 'c8', personId: 'gaspard', revealedBy: 'gateEscalier', constraint: { type: 'direction', other: 'mathilde', dir: 'S' } },
  { id: 'c9', personId: 'gaspard', revealedBy: 'gateEscalier', constraint: { type: 'inColumn', column: 0 } },
  { id: 'c10', personId: 'leon', revealedBy: 'gateEscalier', constraint: { type: 'inColumn', column: 'right' } },
  /** Same level, unspecified which — a statement the flat game had no axis for. */
  { id: 'c11', personId: 'gaspard', revealedBy: 'gateEscalier', constraint: { type: 'distance', other: 'hortense', axis: 'floor', exact: 0 } },

  // — Acte III : la cave —
  { id: 'c12', personId: 'aubin', revealedBy: 'gateTrappe', constraint: { type: 'onFloor', floor: 0 } },
  { id: 'c13', personId: 'aubin', revealedBy: 'gateTrappe', constraint: { type: 'distance', other: 'leon', axis: 'col', exact: 1 } },
  { id: 'c14', personId: 'victorine', revealedBy: 'gateTrappe', constraint: { type: 'not', of: { type: 'inZone', zoneId: 'salon' } } },
]

export const ormesDef: PuzzleDef = { ...ormesShell, clues }

export { ormesSolution }
