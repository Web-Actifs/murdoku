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
 * marge 1), 5 indices seulement, résolu entièrement par propagation.
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
 *   1. Edmond ne peut être que sur les deux planches de la passerelle, toutes
 *      deux en rangée 2 : la rangée 2 est donc réservée, ce qui chasse Blanche
 *      et Raymond de cette rangée.
 *   2. Raymond n'a plus qu'une case le long du tabouret : il se pose.
 *   3. Blanche, elle, tombe entièrement dans la colonne 1 — sans qu'on sache
 *      encore laquelle de ses deux cases — et cela suffit à trancher entre les
 *      deux planches de la passerelle : Edmond est posé par la colonne d'une
 *      personne encore flottante (Claude/claude.md §33).
 *   4. La rangée de Raymond finit de poser Blanche ; sa colonne, plus l'écart
 *      d'une travée qu'annonce Lucie, finit de poser Lucie.
 *
 * Indices produits par le générateur (graine 110), puis remis en scène ici.
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
    { id: 'lucarneDuChai', type: 'window', occupiable: false, cells: [{ row: 0, col: 4 }] },
    // Chai — le tabouret de dégustation du maître de chai.
    { id: 'tabouret', type: 'tabouret', occupiable: true, cells: [{ row: 2, col: 4 }] },
    // Bureau — le bureau de chêne d'Edmond, couvert de bons de commande.
    { id: 'bureauDeChene', type: 'table', occupiable: false, cells: [{ row: 3, col: 0 }] },
    // Bureau — la fenêtre sur la cour, elle aussi en façade.
    { id: 'fenetreBureau', type: 'window', occupiable: false, cells: [{ row: 4, col: 0 }] },
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
      // Edmond Valmorin, le propriétaire. La victime : on ne sait que l'endroit.
      id: 'edmond',
      nameKey: 'edmond',
      isVictim: true,
      constraints: [{ type: 'onObjectType', objectType: 'passerelle' }],
    },
    {
      // Blanche Valmorin, sa belle-fille, qui tient les comptes du domaine.
      // « J'étais adossée à une cuve, je surveillais la température. »
      id: 'blanche',
      nameKey: 'blanche',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'cuve' }],
    },
    {
      // Raymond Chassagne, maître de chai depuis trente ans.
      // « À côté du tabouret, comme tous les soirs de vendange. »
      id: 'raymond',
      nameKey: 'raymond',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'tabouret' }],
    },
    {
      // Lucie Ferrand, l'œnologue venue de Bordeaux pour les assemblages.
      // « Tout au fond, une travée à l'ouest de Raymond. »
      id: 'lucie',
      nameKey: 'lucie',
      constraints: [
        { type: 'distance', other: 'raymond', axis: 'col', exact: 1 },
        { type: 'inRow', row: 'bottom' },
      ],
    },
  ],
  victimId: 'edmond',
}
