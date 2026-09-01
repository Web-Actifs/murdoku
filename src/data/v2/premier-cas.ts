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
 * Neuf indices, pas un de plus : le jeu a été repris à zéro le 2026-08-30 avec
 * la discipline du générateur (croissance depuis les faits vrais de la
 * solution, puis élagage), parce que la version écrite à la main en portait
 * quinze dont six que la démonstration n'utilisait jamais — le joueur les
 * relisait en boucle sans qu'aucune ne fasse avancer quoi que ce soit. Chacun
 * de ces neuf est désormais porteur : en retirer un seul, et la grille cesse
 * de se résoudre ou cesse d'avoir une réponse unique.
 *
 * Revu le 2026-08-31 suite à trois retours de playtest coup sur coup sur le
 * même dossier :
 *   - le dossier d'Oscar disait « à côté d'une fenêtre » (adjacentToObjectType
 *     — §5/§19/§20, une case *voisine* de la fenêtre, jamais la sienne, la
 *     même règle que pour une plante ou une chaise) alors que l'intention
 *     affichée était « au hublot », soit « devant » lui (§10/§52 :
 *     inFrontOfObjectType, la case de la fenêtre elle-même, désormais une
 *     relation distincte dans le moteur) ;
 *   - une fois Oscar posé sur la bonne case (colonne 0 au lieu de 1), son
 *     ancien duo de clues (fenêtre + écart de rangée envers Pascal) s'est
 *     révélé redondant avec le reste de la chaîne, et pareil pour le
 *     « jamais bâbord » de Victoire et le « tout à l'arrière » de Pascal :
 *     trois clues creuses dehors, un unique écart Victoire/Pascal dedans ;
 *   - sauf que cet écart-là était réciproque — Victoire *et* Pascal
 *     déclaraient chacun le même chiffre l'un sur l'autre (une distance exacte
 *     ne réduit que le domaine de qui la porte, §29 : il en fallait un
 *     exemplaire de chaque côté pour que la propagation tienne sans deviner).
 *     Deux témoignages qui redisent le même fait sous deux angles, ça se lit
 *     comme du remplissage, à raison. Victoire porte maintenant un écart vers
 *     Oscar à la place — Oscar est déjà résolu par son propre dossier, donc
 *     rien n'a besoin de lui répondre en retour, et Pascal garde son seul
 *     écart vers Victoire, jamais renvoyé. Toujours neuf indices, tous
 *     porteurs (re-vérifié : aucun des neuf n'est retirable), plus aucune
 *     paire ne dit la même chose deux fois. Zones et coupable n'ont pas bougé.
 *
 * L'enchaînement voulu (aucun personnage ne se déduit seul) :
 *   1. Amorce sans personne de posée. La table basse tient tout entière sur la
 *      rangée 2, donc cette rangée appartient à Victoire, qui en vide d'autant
 *      Hélène, Oscar et Armand. En parallèle, Hélène se referme sur la cabine
 *      puis sur sa moitié sud rien qu'en croisant « avec » et « au sud » contre
 *      le seul indice du mort (§14) — sa rangée du haut se referme la première
 *      de tout le plateau, avant même qu'elle soit posée.
 *   2. L'écart de Victoire envers Oscar se referme lui aussi sans qu'Oscar
 *      soit posé : sur les deux hublots du plateau (§19/§20), un seul répond
 *      à l'écart exact qu'elle déclare. Elle tombe la première.
 *   3. Cette rangée verrouillée pour Hélène retire à elle seule sa dernière
 *      case à Oscar, dont le dossier ne parle que d'une fenêtre — jamais
 *      tranché tant que ce verrou n'est pas tombé (candidats verrouillés,
 *      §33/§34). Il se referme en second, au hublot bâbord, colonne 0.
 *   4. L'écart de Pascal envers Victoire referme son propre domaine à deux
 *      cases dès qu'elle est posée ; la rangée d'Oscar, une fois lui aussi
 *      posé, retire la dernière — Pascal ferme la marche des trois du pont.
 *   5. La colonne de Pascal retire à Hélène sa case de trop — la coupable
 *      tombe l'avant-dernière, juste avant le corps.
 *   6. Armand n'a qu'une ligne au dossier (« on l'a trouvé dans sa cabine »,
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
        // « Oscar était juste à ma gauche, une colonne plus loin sur le plan. »
        { type: 'distance', other: 'oscar', axis: 'col', exact: -1 },
      ],
    },
    {
      // Pascal Ferrer, le skipper. De quart au poste de barre, tout à l'arrière.
      id: 'pascal',
      nameKey: 'pascal',
      constraints: [
        { type: 'onObjectType', objectType: 'barre' },
        // « Victoire ? Loin de moi, presque à l'autre bout du bateau. »
        { type: 'distance', other: 'victoire', axis: 'col', exact: -2 },
      ],
    },
    {
      // Oscar Nunes, le maître d'hôtel. Au hublot bâbord — le dossier le plus
      // léger après celui de la victime (§14), et volontairement ambigu tant
      // que la ligne d'Hélène ne s'est pas refermée sur elle (§50 : deux
      // hublots, aucun tranché tant que le reste ne l'a pas fait).
      id: 'oscar',
      nameKey: 'oscar',
      constraints: [{ type: 'inFrontOfObjectType', objectType: 'window' }],
    },
  ],
  victimId: 'armand',
  difficultyOverride: 'intermediate',
}
