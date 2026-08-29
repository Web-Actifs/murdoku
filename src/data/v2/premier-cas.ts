import type { PuzzleDef } from '../../core/model/types'

/**
 * « L'affaire du Cormoran » — premier cas écrit pour le moteur V2.
 *
 * Nuit du 3 septembre, ponton 7 de Port-Vendres. Le yacht *Le Cormoran* n'a pas
 * quitté son amarre. Au petit matin, Armand Delcourt, l'armateur, est retrouvé
 * mort sur sa couchette, la porte de la cabine fermée de l'intérieur — enfin,
 * c'est ce que tout le monde raconte. Quatre personnes dormaient à bord.
 *
 * Palier « Découverte » : plan 6x6, 5 personnes (capacité min(6,6) = 6, marge 1),
 * résolu entièrement par propagation, sans la moindre supposition.
 *
 * Le plan :
 *
 *   col      0    1    2    3    4    5
 *   row 0  [ salon ........ ][ cabine ...... ]
 *   row 1  [ salon ........ ][ cabine ...... ]
 *   row 2  [ salon ........ ][ cabine ...... ]
 *   row 3  [ cuis. ][ pont ..................]
 *   row 4  [ cuis. ][ pont ..................]
 *   row 5  [ cuis. ][ pont ..................]
 *
 * L'enchaînement voulu (aucun personnage ne se déduit seul, sauf comme amorce) :
 *   1. Armand est confiné à la rangée 0 (la couchette y tient tout entière) et
 *      Victoire à la rangée 2 (la table basse) : à elles deux, ces rangées
 *      réservées chassent Hélène de deux de ses trois hublots.
 *   2. Hélène posée, sa colonne verrouille Armand sur sa couchette.
 *   3. Pascal est confiné à la rangée du bas ; la distance qu'Oscar déclare par
 *      rapport à lui ("une rangée plus haut") le cloue dans la cuisine.
 *   4. Oscar posé, sa colonne tranche entre les deux bouts de la table basse
 *      pour Victoire ; la colonne de Victoire tranche à son tour entre les deux
 *      postes de barre pour Pascal.
 */
export const cormoranDef: PuzzleDef = {
  id: 'cormoran',
  plan: `
    SSSCCC
    SSSCCC
    SSSCCC
    GGPPPP
    GGPPPP
    GGPPPP
  `,
  legend: { S: 'salon', C: 'cabine', G: 'cuisine', P: 'pont' },
  zones: [
    { id: 'salon', nameKey: 'salon' },
    { id: 'cabine', nameKey: 'cabine' },
    { id: 'cuisine', nameKey: 'cuisine' },
    { id: 'pont', nameKey: 'pont' },
  ],
  objects: [
    // Salon — la banquette d'angle, deux places, personne ne s'y est assis cette nuit-là.
    {
      id: 'banquette',
      type: 'banquette',
      occupiable: true,
      cells: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    },
    // Salon — la longue table basse, trois places, en travers de la rangée du fond.
    {
      id: 'tableBasse',
      type: 'tableBasse',
      occupiable: true,
      cells: [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ],
    },
    // Cabine — la couchette de l'armateur, deux places, contre la cloison avant.
    {
      id: 'couchette',
      type: 'couchette',
      occupiable: true,
      cells: [
        { row: 0, col: 4 },
        { row: 0, col: 5 },
      ],
    },
    // Cabine — le hublot tribord, en périphérie de coque, on ne se tient pas dessus.
    {
      id: 'hublotTribord',
      type: 'window',
      occupiable: false,
      cells: [{ row: 1, col: 5 }],
    },
    // Cuisine — le hublot bâbord, lui aussi en périphérie de coque.
    {
      id: 'hublotBabord',
      type: 'window',
      occupiable: false,
      cells: [{ row: 4, col: 0 }],
    },
    // Cuisine — le fourneau, brûlant, infranchissable.
    {
      id: 'fourneau',
      type: 'fourneau',
      occupiable: false,
      cells: [{ row: 3, col: 1 }],
    },
    // Pont — le poste de barre en L : le siège, la barre, la table à cartes.
    {
      id: 'barre',
      type: 'barre',
      occupiable: true,
      cells: [
        { row: 4, col: 3 },
        { row: 5, col: 3 },
        { row: 5, col: 2 },
      ],
    },
  ],
  people: [
    {
      // Armand Delcourt, l'armateur. La victime : on sait où on l'a trouvé, rien de plus.
      id: 'armand',
      nameKey: 'armand',
      isVictim: true,
      constraints: [
        { type: 'inZone', zoneId: 'cabine' },
        { type: 'onObjectType', objectType: 'couchette' },
      ],
    },
    {
      // Hélène Delcourt, sa sœur. « Je suis restée avec lui, près du hublot. »
      id: 'helene',
      nameKey: 'helene',
      constraints: [
        { type: 'inZone', zoneId: 'cabine' },
        { type: 'adjacentToObjectType', objectType: 'window' },
        { type: 'withPerson', other: 'armand' },
      ],
    },
    {
      // Victoire Marsan, la marchande d'art. Ses dossiers étalés sur la table basse.
      id: 'victoire',
      nameKey: 'victoire',
      constraints: [
        { type: 'onObjectType', objectType: 'tableBasse' },
        // « Jamais du côté bâbord, j'ai le mal de mer de ce bord-là. »
        { type: 'not', of: { type: 'inColumn', column: 'left' } },
        // Du salon, elle est bien en avant d'Oscar (rangée plus basse = plus au nord).
        { type: 'direction', other: 'oscar', dir: 'N' },
      ],
    },
    {
      // Pascal Ferrer, le skipper. De quart au poste de barre, tout à l'arrière.
      id: 'pascal',
      nameKey: 'pascal',
      constraints: [
        { type: 'inZone', zoneId: 'pont' },
        { type: 'onObjectType', objectType: 'barre' },
        { type: 'inRow', row: 'bottom' },
      ],
    },
    {
      // Oscar Nunes, le maître d'hôtel. Seul en cuisine, une rangée devant le skipper.
      id: 'oscar',
      nameKey: 'oscar',
      constraints: [
        { type: 'inZone', zoneId: 'cuisine' },
        { type: 'adjacentToObjectType', objectType: 'window' },
        // « Le skipper était juste une rangée derrière moi. »
        { type: 'distance', other: 'pascal', axis: 'row', exact: 1 },
        { type: 'alone' },
      ],
    },
  ],
  victimId: 'armand',
}
