import type { PuzzleDef } from '../../core/model/types'

/**
 * « L'affaire du Cormoran » — premier cas écrit pour le moteur V2.
 *
 * Nuit du 3 septembre, ponton 7 de Port-Vendres. Le yacht *Le Cormoran* n'a pas
 * quitté son amarre. Au petit matin, Armand Delcourt, l'armateur, est retrouvé
 * mort sur sa couchette, la porte de la cabine fermée de l'intérieur — enfin,
 * c'est ce que tout le monde raconte. Quatre personnes dormaient à bord.
 *
 * Plan 6x6, 5 personnes (capacité min(6,6) = 6, marge 1), résolu entièrement par
 * propagation, sans la moindre supposition.
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
 * Dix indices, pas un de plus : le jeu a été repris à zéro le 2026-08-30 avec la
 * discipline du générateur (croissance depuis les faits vrais de la solution,
 * puis élagage), parce que la version écrite à la main en portait quinze dont six
 * que la démonstration n'utilisait jamais — le joueur les relisait en boucle sans
 * qu'aucune ne fasse avancer quoi que ce soit. Chacun de ces dix est désormais
 * porteur : en retirer un seul, et la grille cesse de se résoudre ou cesse
 * d'avoir une réponse unique.
 *
 * L'enchaînement voulu (aucun personnage ne se déduit seul) :
 *   1. Amorce sans personne de posé : deux rangées se réservent d'elles-mêmes.
 *      La table basse tient tout entière sur la rangée 2, donc cette rangée
 *      appartient à Victoire ; le poste de barre croisé avec « tout à l'arrière »
 *      ne laisse à Pascal que la rangée du bas. Ces deux rangées réservées vident
 *      d'autant Hélène, Oscar et Armand.
 *   2. L'écart qu'Oscar déclare par rapport au skipper (« une rangée devant
 *      lui ») achève de le clouer au hublot bâbord : il tombe le premier.
 *   3. Oscar posé, sa colonne tranche entre les deux bouts encore libres de la
 *      table basse pour Victoire ; la colonne de Victoire tranche à son tour
 *      entre les deux postes de barre pour Pascal.
 *   4. Hélène n'est décrite *que* par rapport au mort : avec lui, en arrière de
 *      lui, jamais contre le bordé tribord. Rien ne la referme donc avant que la
 *      colonne de Pascal ne lui retire sa case de trop — la coupable tombe
 *      l'avant-dernière, juste avant le corps.
 *   5. Armand n'a qu'une ligne au dossier (« on l'a trouvé dans sa cabine »,
 *      §14 : la victime porte le dossier le plus léger). Ce sont les lignes et
 *      les colonnes des quatre autres qui finissent par ne lui laisser qu'une
 *      case — et c'est seulement là qu'on découvre qu'Hélène était seule avec
 *      lui dans la cabine.
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
    // Cabine — le hublot tribord, percé dans la coque : la case, elle, est un
    // plancher ordinaire, celui où l'on se tient pour regarder dehors (§10).
    {
      id: 'hublotTribord',
      type: 'window',
      occupiable: true,
      cells: [{ row: 1, col: 5 }],
    },
    // Cuisine — le hublot bâbord, lui aussi en périphérie de coque.
    {
      id: 'hublotBabord',
      type: 'window',
      occupiable: true,
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
      // Armand Delcourt, l'armateur. La victime, et le dossier le plus léger de
      // tous : une seule ligne, la pièce où on l'a trouvé. Neuf cases, que rien
      // ne réduit avant que les quatre autres ne soient posés — c'est ce qui le
      // fait tomber en dernier (§14).
      id: 'armand',
      nameKey: 'armand',
      isVictim: true,
      constraints: [{ type: 'inZone', zoneId: 'cabine' }],
    },
    {
      // Hélène Delcourt, sa sœur — la seule dont tout le témoignage se rapporte
      // au mort, et qui ne se referme donc qu'une fois le reste du bord placé.
      // « Je ne l'ai pas quitté. » / « J'étais un peu en arrière de lui. » /
      // « Pas contre le bordé tribord, j'ai horreur du froid de la coque. »
      id: 'helene',
      nameKey: 'helene',
      constraints: [
        { type: 'withPerson', other: 'armand' },
        { type: 'direction', other: 'armand', dir: 'S' },
        { type: 'not', of: { type: 'inColumn', column: 'right' } },
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
      ],
    },
    {
      // Pascal Ferrer, le skipper. De quart au poste de barre, tout à l'arrière.
      id: 'pascal',
      nameKey: 'pascal',
      constraints: [
        { type: 'onObjectType', objectType: 'barre' },
        { type: 'inRow', row: 'bottom' },
      ],
    },
    {
      // Oscar Nunes, le maître d'hôtel. Au hublot bâbord, une rangée devant le skipper.
      id: 'oscar',
      nameKey: 'oscar',
      constraints: [
        { type: 'adjacentToObjectType', objectType: 'window' },
        // « Le skipper était juste une rangée derrière moi. »
        { type: 'distance', other: 'pascal', axis: 'row', exact: 1 },
      ],
    },
  ],
  victimId: 'armand',
}
