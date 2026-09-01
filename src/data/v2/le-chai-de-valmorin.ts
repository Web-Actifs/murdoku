import type { PuzzleDef } from '../../core/model/types'

/**
 * « Le chai de Valmorin » — deuxième cas du moteur V2.
 *
 * Dernière nuit des vendanges au domaine de Valmorin, côtes de Blaye. On a
 * fêté la fin de la récolte jusqu'à deux heures du matin ; à six heures,
 * Edmond Valmorin, le propriétaire, gisait sur la passerelle de la cuverie,
 * au-dessus d'une cuve encore tiède. Trois personnes avaient les clés du bâtiment.
 *
 * Palier « Intermédiaire » : plan 5x5, 4 personnes (capacité min(5,5) = 5,
 * marge 1), 6 indices seulement, résolu entièrement par propagation.
 *
 * Le plan :
 *
 *   col      0    1    2    3    4
 *   row 0  [ cuverie ......... ][ chai ... ]
 *   row 1  [ cuverie ......... ][ chai ... ]
 *   row 2  [ cuverie ......... ][ chai ... ]
 *   row 3  [ bureau .... ][ serre ........ ]
 *   row 4  [ bureau .... ][ serre ........ ]
 *
 * L'enchaînement voulu — c'est un cas où *personne* ne se déduit seul en
 * premier : les deux amorces sont des « candidats verrouillés », pas des
 * placements.
 *   1. Le relevé ne situe Edmond que « le long du mur ouest » : il tient donc
 *      tout entier dans la colonne 0, qui se trouve réservée avant que
 *      quiconque soit posé. Raymond, lui, tient dans la rangée 1. Blanche perd
 *      cinq cases à ces deux verrous seuls (Claude/claude.md §33).
 *   2. Blanche se dit avec Lucie et un peu en avant d'elle : à elles deux, elles
 *      ne tiennent plus que dans la serre.
 *   3. L'écart de deux travées que Raymond annonce par rapport au corps le pose
 *      le premier — sans que la position du corps soit connue pour autant.
 *   4. La rangée de Blanche pose Lucie, la colonne de Raymond pose Blanche, et
 *      la rangée de Lucie ferme la dernière des deux planches possibles : Edmond
 *      tombe le dernier de tous (§14), et c'est là seulement qu'on voit que le
 *      maître de chai était seul avec lui dans la cuverie.
 *
 * Indices produits par le générateur (graine 264), puis remis en scène ici.
 */
export const valmorinDef: PuzzleDef = {
  id: 'valmorin',
  plan: `
    UUUCC
    UUUCC
    UUUCC
    BBSSS
    BBSSS
  `,
  legend: { U: 'cuverie', C: 'chai', B: 'bureau', S: 'serre' },
  zones: [
    { id: 'cuverie', nameKey: 'cuverie' },
    { id: 'chai', nameKey: 'chai' },
    { id: 'bureau', nameKey: 'bureau' },
    { id: 'serre', nameKey: 'serre' },
  ],
  objects: [
    // Cuverie — les deux cuves inox de la cuvée de tête, brûlantes, infranchissables.
    {
      id: 'cuveInox',
      type: 'cuve',
      occupiable: false,
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    },
    // Cuverie — la passerelle de dégustation qui court au-dessus des cuves : on y monte.
    {
      id: 'passerelle',
      type: 'passerelle',
      occupiable: true,
      cells: [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
      ],
    },
    // Chai — la rangée de barriques de l'année, empilées sur deux hauteurs.
    {
      id: 'barriques',
      type: 'barrique',
      occupiable: false,
      cells: [
        { row: 0, col: 3 },
        { row: 1, col: 3 },
      ],
    },
    // Chai — la lucarne du pignon, sur le mur extérieur.
    { id: 'lucarneDuChai', type: 'window', occupiable: true, cells: [{ row: 0, col: 4 }] },
    // Chai — le tabouret de dégustation du maître de chai.
    { id: 'tabouret', type: 'tabouret', occupiable: true, cells: [{ row: 2, col: 4 }] },
    // Bureau — le bureau de chêne d'Edmond, couvert de bons de commande.
    { id: 'bureauDeChene', type: 'table', occupiable: false, cells: [{ row: 3, col: 0 }] },
    // Bureau — la fenêtre sur la cour, elle aussi en façade.
    { id: 'fenetreBureau', type: 'window', occupiable: true, cells: [{ row: 4, col: 0 }] },
    // Serre — la jardinière d'agrumes que Blanche soigne depuis dix ans.
    { id: 'jardiniere', type: 'plante', occupiable: false, cells: [{ row: 3, col: 4 }] },
    // Serre — le banc de pierre, deux places, contre le mur du chai.
    {
      id: 'banc',
      type: 'banc',
      occupiable: true,
      cells: [
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
    },
  ],
  people: [
    {
      // Edmond Valmorin, le propriétaire. La victime : le seul élément du dossier
      // est le relevé de gendarmerie, « le long du mur ouest ». Deux cases
      // seulement répondent à cela, et rien dans son propre dossier ne tranche :
      // il faudra que les trois autres soient posés (§14).
      id: 'edmond',
      nameKey: 'edmond',
      isVictim: true,
      constraints: [{ type: 'inColumn', column: 'left' }],
    },
    {
      // Blanche Valmorin, sa belle-fille, qui tient les comptes du domaine.
      // « J'étais avec Lucie, un peu en avant d'elle. »
      id: 'blanche',
      nameKey: 'blanche',
      constraints: [
        { type: 'direction', other: 'lucie', dir: 'N' },
        { type: 'withPerson', other: 'lucie' },
      ],
    },
    {
      // Raymond Chassagne, maître de chai depuis trente ans.
      // « Deuxième rangée de la cuverie, deux travées à l'est du corps. »
      id: 'raymond',
      nameKey: 'raymond',
      constraints: [
        { type: 'inRow', row: 1 },
        { type: 'distance', other: 'edmond', axis: 'col', exact: -2 },
      ],
    },
    {
      // Lucie Ferrand, l'œnologue venue de Bordeaux pour les assemblages.
      // « À la serre, contre la jardinière d'agrumes. »
      id: 'lucie',
      nameKey: 'lucie',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'plante' }],
    },
  ],
  victimId: 'edmond',
  difficultyOverride: 'beginner',
}
