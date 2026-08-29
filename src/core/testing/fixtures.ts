import type { PuzzleDef } from '../model/types'

/**
 * The cascade from the architecture dossier (§58): three overlapping multi-cell
 * spots whose only route to a solution is locked-candidates then a chain of
 * naked singles. Shared by the propagation, difficulty and hint tests so they
 * all reason about the exact same proof.
 */
export const cascadeDef: PuzzleDef = {
  id: 'cascade',
  plan: `
    AAA
    AAA
    AAA
  `,
  legend: { A: 'salle' },
  zones: [{ id: 'salle', nameKey: 'salle' }],
  objects: [
    {
      id: 'spotA',
      type: 'spotA',
      occupiable: true,
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    },
    {
      id: 'spotB',
      type: 'spotB',
      occupiable: true,
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    },
    {
      id: 'spotD',
      type: 'spotD',
      occupiable: true,
      cells: [
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
    },
  ],
  people: [
    { id: 'austin', nameKey: 'austin', constraints: [{ type: 'onObjectType', objectType: 'spotA' }] },
    { id: 'brycen', nameKey: 'brycen', constraints: [{ type: 'onObjectType', objectType: 'spotB' }] },
    { id: 'diane', nameKey: 'diane', constraints: [{ type: 'onObjectType', objectType: 'spotD' }] },
  ],
  victimId: 'austin',
}
