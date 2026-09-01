import type { PuzzleDef } from '../../core/model/types'

/**
 * « La dernière donne du Bellevue » — cinquième cas du moteur V2, et de loin le
 * plus grand : le casino de la fin de saison, huit personnes, huit pièces,
 * vingt meubles.
 *
 * Dernière nuit de la saison au casino Bellevue. Les portes ont été fermées à
 * deux heures, la caisse comptée à trois : ils n'étaient plus que huit dans la
 * maison. À cinq heures, quand on a relevé les rideaux, Lucien Mareuil, le
 * banquier de la table, était au vestiaire, entre les manteaux.
 *
 * Palier « Avancé » — le plus haut que `analyzeDifficulty` sache honnêtement
 * mesurer aujourd'hui : `propagate` n'émet aucune déduction au-dessus du palier
 * `intermediate`, et `categoryOf` refuse par construction de vendre plus d'un
 * cran au-dessus du palier réellement exercé (voir le commentaire de
 * `categoryOf`, proof/difficulty.ts). Ce cas-ci sature en revanche le barème :
 * score **100/100**, là où les quatre premiers cas mesurent 67, 53, 88 et 93.
 * 60 déductions, une chaîne de profondeur 16, 17 points d'articulation, une
 * cascade maximale de 52 pas sur 60, et six des sept techniques du moteur
 * exercées — c'est le premier cas de la série à en exercer six (les quatre
 * autres en exercent quatre ou cinq). Seul `zoneCompany` reste inemployé : il
 * demande un `notAlone`, qu'aucune graine n'a retenu ici.
 *
 * Plan 9x9 plein, 8 personnes (capacité min(9,9) = 9, marge 1), 12 indices,
 * 20 objets dont quinze multi-cases (huit d'entre eux occupables) et un en L,
 * le comptoir du bar — premier meuble coudé depuis le poste de barre du
 * Cormoran, et premier objet du type `comptoir`.
 *
 * Le plan — le rez-de-chaussée du Bellevue, la mer au nord :
 *
 *   col      0    1    2    3    4    5    6    7    8
 *   row 0  [ baccara .................. ][ roulette ........... ]
 *   row 1  [ baccara .................. ][ roulette ........... ]
 *   row 2  [ baccara .................. ][ roulette ........... ]
 *   row 3  [ baccara .................. ][ roulette ........... ]
 *   row 4  [ galerie .................. ][ roulette ........... ]
 *   row 5  [ bar ........ ][ fumoir ............. ][ caisse ... ]
 *   row 6  [ bar ........ ][ fumoir ............. ][ caisse ... ]
 *   row 7  [ bar ........ ][ office ....... ][ vestiaire ...... ]
 *   row 8  [ bar ........ ][ office ....... ][ vestiaire ...... ]
 *
 * Ambiguïtés volontaires (Claude/claude.md §50), et elles portent ici presque
 * toute la difficulté : sept types d'objets existent en double, dans deux pièces
 * différentes à chaque fois — `window` (baccara / roulette), `table` (idem),
 * `banquette` (baccara / bar), `plante` (baccara / roulette), `tapis` (roulette
 * / galerie), `banc` (fumoir / vestiaire), `malle` (caisse / vestiaire). Sur les
 * douze indices, cinq nomment un type d'objet, et pas un seul ne désigne une
 * pièce à lui seul : le domaine est l'union des deux, à l'échelle du plateau.
 *
 * Graine retenue : **188**, choisie sur un balayage réel de 200 graines
 * (166 réussites) et non sur la première qui passait. Trois graines seulement
 * atteignaient le score 100 (30, 53, 73) avant elle, mais toutes trois payaient
 * ce score en `distance` : dix indices métriques sur quatorze pour la 73, huit
 * sur treize pour la 30. Un dossier fait d'écarts exacts se lit comme un système
 * d'équations, pas comme une enquête (c'est exactement ce que `removalOrder`
 * cherche à éviter dans clueSearch.ts). La 188 est la seule à tenir le score
 * maximum avec **trois** écarts seulement sur douze indices, six familles de
 * clues distinctes — et, en prime, la victime sans le moindre indice à elle,
 * la lecture la plus pure de §14.
 *
 * L'enchaînement voulu (60 déductions, la première case tombe au pas 2, la
 * dernière au pas 59) :
 *
 *   1. Deux verrous avant tout placement. Gaston se dit hors de la roulette et
 *      plus au nord que Marcel ; Marcel ne dit que « sur un tapis », donc
 *      l'un des deux du plateau — cela suffit à ramener Gaston de 43 cases à 16,
 *      toutes dans la salle de baccara.
 *   2. Berthe est la seule que ses deux indices referment d'un coup : « sur une
 *      banquette » (cinq cases, deux pièces) croisé avec ses quatre rangées
 *      sous Odile, elle-même seulement « à côté d'une fenêtre ». Elle tombe la
 *      première, au deuxième pas — et c'est LE point d'articulation du cas :
 *      retirer ce pas fait s'effondrer 52 des 60 déductions et laisse les huit
 *      personnes sans preuve.
 *   3. Théo se dit seul dans sa pièce. Gaston étant déjà confiné au baccara,
 *      le baccara lui est fermé (`zoneExclusivity`) ; il se retrouve confiné à
 *      la roulette, et sa solitude referme alors la salle de roulette sur
 *      quatre personnes d'un coup — dont le corps, qui perd 17 cases sans que
 *      personne ait parlé de lui. Théo n'est toujours pas placé.
 *   4. La rangée et la colonne de Berthe posent Odile puis Marcel ; la colonne
 *      d'Odile rabote Gaston, ce qui referme enfin l'écart de rangée de Théo :
 *      il tombe quatrième. L'unique indice nié du dossier — Nina qui refuse
 *      l'écart de six colonnes envers Odile — ne mord qu'ici, une fois Odile
 *      posée (`relationalExclusion`, tel que décrit dans propagate.ts).
 *   5. La rangée de Théo confine Sylvain à la seule travée 1
 *      (`lockedCandidates`) : sans être placé, Sylvain pose Gaston. La rangée de
 *      Gaston pose Sylvain à son tour, la colonne de Nina rabote le corps à
 *      trois cases, la rangée de Sylvain pose Nina.
 *   6. Lucien n'a rien au dossier — pas une ligne. Son champ ne se referme que
 *      par le plateau : 60 cases, puis 43, 36, 29, 25, 22, 20, 16, 14, 12, 8, 7,
 *      6, 3, 2, et enfin une. La dernière lui est retirée par la rangée de Nina,
 *      au dernier pas de la démonstration — et c'est seulement là qu'on
 *      s'aperçoit que la chanteuse était au vestiaire avec lui.
 *
 * Indices produits par le générateur (graine 188), puis remis en scène ici :
 * aucune contrainte n'a été écrite ni retouchée à la main, le jeu est celui
 * qu'a rendu `searchClues` après élagage — minimal (aucun des douze n'est
 * retirable), sans paire réciproque, victime résolue en dernier.
 */
export const bellevueDef: PuzzleDef = {
  id: 'bellevue',
  plan: `
    BBBBBRRRR
    BBBBBRRRR
    BBBBBRRRR
    BBBBBRRRR
    HHHHHRRRR
    AAAFFFFCC
    AAAFFFFCC
    AAAOOOVVV
    AAAOOOVVV
  `,
  legend: {
    B: 'baccara',
    R: 'roulette',
    H: 'galerie',
    A: 'bar',
    F: 'fumoir',
    C: 'caisse',
    O: 'office',
    V: 'vestiaire',
  },
  zones: [
    { id: 'baccara', nameKey: 'baccara' },
    { id: 'roulette', nameKey: 'roulette' },
    { id: 'galerie', nameKey: 'galerie' },
    { id: 'bar', nameKey: 'bar' },
    { id: 'fumoir', nameKey: 'fumoir' },
    { id: 'caisse', nameKey: 'caisse' },
    { id: 'office', nameKey: 'office' },
    { id: 'vestiaire', nameKey: 'vestiaire' },
  ],
  objects: [
    // Baccara — la baie du perron, deux vantaux plein nord sur la promenade. La
    // baie est dans le mur : les deux cases devant elle restent du plancher
    // ordinaire, celui où l'on se tient pour regarder la mer (§10/§42).
    {
      id: 'baieDuPerron',
      type: 'window',
      occupiable: true,
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    },
    // Baccara — la grande table, trois places de long, le sabot encore garni.
    {
      id: 'tableDeBaccara',
      type: 'table',
      occupiable: false,
      cells: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
      ],
    },
    // Baccara — la banquette des joueurs, trois places, en travers de la salle.
    {
      id: 'banquetteDesJoueurs',
      type: 'banquette',
      occupiable: true,
      cells: [
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 },
      ],
    },
    // Baccara — le palmier en pot, dans son bac de cuivre : on passe à côté, jamais dessus.
    { id: 'palmierDuBaccara', type: 'plante', occupiable: false, cells: [{ row: 0, col: 4 }] },
    // Roulette — les grandes baies du salon d'angle, deux vantaux également.
    {
      id: 'grandesBaies',
      type: 'window',
      occupiable: true,
      cells: [
        { row: 0, col: 7 },
        { row: 0, col: 8 },
      ],
    },
    // Roulette — le cylindre et son tapis de mise : une deuxième « table » sur le
    // plateau, dans une tout autre pièce que celle du baccara.
    {
      id: 'tableDeRoulette',
      type: 'table',
      occupiable: false,
      cells: [
        { row: 1, col: 6 },
        { row: 1, col: 7 },
      ],
    },
    // Roulette — le grand tapis d'Aubusson, quatre cases, sous les fauteuils.
    {
      id: 'tapisDeLaRoulette',
      type: 'tapis',
      occupiable: true,
      cells: [
        { row: 3, col: 6 },
        { row: 3, col: 7 },
        { row: 4, col: 6 },
        { row: 4, col: 7 },
      ],
    },
    // Roulette — le second palmier, jumeau de celui du baccara.
    { id: 'palmierDeLaRoulette', type: 'plante', occupiable: false, cells: [{ row: 2, col: 5 }] },
    // Galerie — le tapis de passage, deux cases, entre les deux salles de jeu.
    {
      id: 'tapisDeLaGalerie',
      type: 'tapis',
      occupiable: true,
      cells: [
        { row: 4, col: 2 },
        { row: 4, col: 3 },
      ],
    },
    // Bar — le comptoir de zinc, quatre cases en L autour de l'angle de la
    // pièce : le seul meuble coudé du plateau, et le seul de son type.
    {
      id: 'comptoirDuBar',
      type: 'comptoir',
      occupiable: false,
      cells: [
        { row: 5, col: 0 },
        { row: 6, col: 0 },
        { row: 7, col: 0 },
        { row: 7, col: 1 },
      ],
    },
    // Bar — le tabouret resté sorti, au bout du zinc.
    { id: 'tabouretDuBar', type: 'tabouret', occupiable: true, cells: [{ row: 5, col: 1 }] },
    // Bar — la banquette du fond, deux places : la seconde banquette du plateau.
    {
      id: 'banquetteDuBar',
      type: 'banquette',
      occupiable: true,
      cells: [
        { row: 5, col: 2 },
        { row: 6, col: 2 },
      ],
    },
    // Fumoir — le banc de cuir, deux places, contre la cloison.
    {
      id: 'bancDuFumoir',
      type: 'banc',
      occupiable: true,
      cells: [
        { row: 5, col: 3 },
        { row: 5, col: 4 },
      ],
    },
    // Fumoir — la table basse aux journaux, encombrée jusqu'au dernier soir.
    {
      id: 'tableBasseDuFumoir',
      type: 'tableBasse',
      occupiable: false,
      cells: [
        { row: 6, col: 4 },
        { row: 6, col: 5 },
      ],
    },
    // Fumoir — le poêle de faïence, allumé malgré la fin de saison.
    { id: 'poeleDuFumoir', type: 'poele', occupiable: false, cells: [{ row: 6, col: 3 }] },
    // Caisse — le coffre de la maison, deux cases scellées, compté à trois heures.
    {
      id: 'coffreDeLaCaisse',
      type: 'malle',
      occupiable: false,
      cells: [
        { row: 5, col: 8 },
        { row: 6, col: 8 },
      ],
    },
    // Office — le fourneau, éteint depuis le dernier souper.
    {
      id: 'fourneauDeLOffice',
      type: 'fourneau',
      occupiable: false,
      cells: [
        { row: 8, col: 3 },
        { row: 8, col: 4 },
      ],
    },
    // Office — la plonge.
    { id: 'lavaboDeLOffice', type: 'lavabo', occupiable: false, cells: [{ row: 7, col: 3 }] },
    // Vestiaire — la malle aux fourrures, deux cases : la seconde « malle » du plateau.
    {
      id: 'malleDuVestiaire',
      type: 'malle',
      occupiable: false,
      cells: [
        { row: 7, col: 8 },
        { row: 8, col: 8 },
      ],
    },
    // Vestiaire — le banc où l'on se rechausse, deux places : le second « banc ».
    {
      id: 'bancDuVestiaire',
      type: 'banc',
      occupiable: true,
      cells: [
        { row: 7, col: 6 },
        { row: 8, col: 6 },
      ],
    },
  ],
  people: [
    {
      // Lucien Mareuil, le banquier de la table. La victime, et le dossier vide :
      // pas une ligne. Son champ ne se referme que par les rangées, les colonnes
      // et les pièces que les sept autres lui prennent — 60 cases au départ, une
      // seule au tout dernier pas de la démonstration (§14).
      id: 'lucien',
      nameKey: 'lucien',
      isVictim: true,
      constraints: [],
    },
    {
      // Odile Sarrazin, croupière. Le dossier le plus léger des vivants, et le
      // plus ambigu : deux fenêtres sur le plateau, dans deux salles différentes
      // (§50). Rien ne tranche avant que Berthe ne tombe.
      id: 'odile',
      nameKey: 'odile',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'window' }],
    },
    {
      // Gaston Wilmet, le physionomiste. Deux refus plutôt qu'une position :
      // pas la roulette, et plus haut sur le plan que le contrôleur.
      id: 'gaston',
      nameKey: 'gaston',
      constraints: [
        { type: 'not', of: { type: 'inZone', zoneId: 'roulette' } },
        { type: 'direction', other: 'marcel', dir: 'N' },
      ],
    },
    {
      // Berthe Lachaud, la caissière. La seule que ses deux indices referment
      // d'un coup, et la clé de voûte de tout le cas : son placement porte 52
      // des 60 déductions.
      id: 'berthe',
      nameKey: 'berthe',
      constraints: [
        { type: 'onObjectType', objectType: 'banquette' },
        // `exact` se lit « l'autre moins moi » : -4 met Odile quatre rangées
        // *au-dessus* de Berthe, pas l'inverse.
        { type: 'distance', other: 'odile', axis: 'row', exact: -4 },
      ],
    },
    {
      // Marcel Thouvenin, contrôleur des jeux. Un seul indice, et lui aussi
      // double : deux tapis, deux pièces.
      id: 'marcel',
      nameKey: 'marcel',
      constraints: [{ type: 'onObjectType', objectType: 'tapis' }],
    },
    {
      // Nina Delaunay, la chanteuse. Elle se situe par rapport au corps sans rien
      // livrer de sa position, et son écart nié envers Odile est le seul indice
      // du plateau que la propagation ne peut lire qu'après coup.
      id: 'nina',
      nameKey: 'nina',
      constraints: [
        { type: 'direction', other: 'lucien', dir: 'N' },
        { type: 'not', of: { type: 'distance', other: 'odile', axis: 'col', exact: -6 } },
      ],
    },
    {
      // Théo Vaugelas, l'habitué. Le dossier le plus fourni du plateau — et
      // pourtant celui qui se referme le plus tard des trois premiers : sa
      // solitude ne mord qu'une fois Gaston confiné au baccara.
      id: 'theo',
      nameKey: 'theo',
      constraints: [
        { type: 'distance', other: 'gaston', axis: 'row', exact: -1 },
        { type: 'alone' },
        { type: 'adjacentToObjectType', objectType: 'plante' },
      ],
    },
    {
      // Sylvain Ortoli, le barman. Un indice, deux banquettes : il n'est jamais
      // tranché directement. Ce qui le rend utile bien avant d'être posé, c'est
      // que ses deux dernières cases tiennent dans une seule travée
      // (`lockedCandidates`) — de là, c'est lui qui pose Gaston.
      id: 'sylvain',
      nameKey: 'sylvain',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'banquette' }],
    },
  ],
  victimId: 'lucien',
  difficultyOverride: 'advanced',
}
