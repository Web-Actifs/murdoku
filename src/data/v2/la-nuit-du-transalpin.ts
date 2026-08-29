import type { PuzzleDef } from '../../core/model/types'

/**
 * « La nuit du Transalpin » — troisième cas du moteur V2.
 *
 * Voiture-lits 12 du Transalpin, entre Vallorbe et Domodossola. Le train est
 * resté vingt minutes à l'arrêt dans le tunnel du Simplon ; quand il en est
 * ressorti, Bertrand Aubier, le contrôleur des wagons-lits, ne répondait plus.
 * Quatre voyageurs occupaient la voiture, et la porte de service était bouclée.
 *
 * Palier « Avancé » : plan 6x6, 5 personnes (capacité min(6,6) = 6, marge 1),
 * 8 indices, résolu entièrement par propagation.
 *
 * Le plan — la voiture vue de dessus, la locomotive à gauche, le couloir le
 * long de la paroi du bas, les fenêtres sur la paroi du haut :
 *
 *   col      0    1    2    3    4    5
 *   row 0  [ n°11 ..][ n°12 ..][ n°13 ..]
 *   row 1  [ n°11 ..][ n°12 ..][ n°13 ..]
 *   row 2  [ n°11 ..][ n°12 ..][ n°13 ..]
 *   row 3  [ n°11 ..][ n°12 ..][ n°13 ..]
 *   row 4  [ n°11 ..][ n°12 ..][ n°13 ..]
 *   row 5  [ couloir ....................]
 *
 * Ambiguïtés volontaires (Claude/claude.md §50) : il y a *deux* couchettes,
 * *deux* fenêtres et *deux* malles dans la voiture, dans des compartiments
 * différents. Un indice qui nomme un type d'objet ne désigne donc jamais un
 * compartiment à lui seul — le domaine est l'union des deux, à l'échelle du
 * plateau, et c'est le reste de la déduction qui tranche.
 *
 * Le seul indice qui porte sur le contrôleur est justement le plus ambigu du
 * plateau : « contre une couchette » couvre le n°11 *et* le n°12, soit huit
 * cases. Deux témoins se situent par rapport à lui sans jamais dire où il est,
 * et sa case est la dernière que le plateau laisse ouverte (§14).
 *
 * L'enchaînement voulu :
 *   1. Hugo tient tout entier dans la rangée 2 (le n°13). Ce seul verrou, posé
 *      avant le moindre placement, porte vingt des vingt-trois déductions.
 *   2. Irina et Stefan se situent l'un par rapport au corps, l'autre par rapport
 *      à Irina : leurs domaines se rabotent mutuellement jusqu'à confiner Stefan
 *      à la rangée 4 — toujours sans que personne soit posé.
 *   3. Cela suffit à poser Margot contre le lavabo, la première de tous.
 *   4. Puis la chaîne se déroule : la colonne de Margot pose Irina, celle
 *      d'Irina pose Hugo, celle de Hugo pose Stefan, et la colonne de Stefan
 *      ferme la dernière des huit cases du contrôleur. Bertrand tombe le dernier
 *      de tous, dans le n°12, où la journaliste était déjà.
 *
 * Indices produits par le générateur (graine 26), puis remis en scène ici.
 */
export const transalpinDef: PuzzleDef = {
  id: 'transalpin',
  plan: `
    AABBCC
    AABBCC
    AABBCC
    AABBCC
    AABBCC
    LLLLLL
  `,
  legend: { A: 'onze', B: 'douze', C: 'treize', L: 'couloir' },
  zones: [
    { id: 'onze', nameKey: 'onze' },
    { id: 'douze', nameKey: 'douze' },
    { id: 'treize', nameKey: 'treize' },
    { id: 'couloir', nameKey: 'couloir' },
  ],
  objects: [
    // Compartiment 11 — la fenêtre, baissée de trois crans malgré le froid.
    { id: 'fenetreOnze', type: 'window', occupiable: true, cells: [{ row: 0, col: 0 }] },
    // Compartiment 11 — la couchette dépliée, deux places dans le sens de la marche.
    {
      id: 'couchetteOnze',
      type: 'couchette',
      occupiable: true,
      cells: [
        { row: 2, col: 0 },
        { row: 3, col: 0 },
      ],
    },
    // Compartiment 11 — la malle-cabine de Stefan, debout contre la cloison.
    { id: 'malle', type: 'malle', occupiable: false, cells: [{ row: 4, col: 1 }] },
    // Compartiment 12 — le volet de la fenêtre, coincé fermé depuis Lausanne.
    { id: 'voletDouze', type: 'volet', occupiable: false, cells: [{ row: 0, col: 3 }] },
    // Compartiment 12 — la couchette du contrôleur, restée faite.
    {
      id: 'couchetteDouze',
      type: 'couchette',
      occupiable: true,
      cells: [
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
    },
    // Compartiment 12 — le lavabo rabattable, ouvert, la serviette encore humide.
    { id: 'lavabo', type: 'lavabo', occupiable: false, cells: [{ row: 4, col: 3 }] },
    // Compartiment 13 — la fenêtre côté vallée.
    { id: 'fenetreTreize', type: 'window', occupiable: true, cells: [{ row: 0, col: 5 }] },
    // Compartiment 13 — la banquette non dépliée, deux places.
    {
      id: 'banquetteTreize',
      type: 'banquette',
      occupiable: true,
      cells: [
        { row: 1, col: 4 },
        { row: 1, col: 5 },
      ],
    },
    // Compartiment 13 — la cantine de scène d'Irina, une malle de plus.
    { id: 'cantine', type: 'malle', occupiable: false, cells: [{ row: 3, col: 5 }] },
    // Couloir — le samovar de bout de voiture, brûlant toute la nuit.
    { id: 'samovar', type: 'samovar', occupiable: false, cells: [{ row: 5, col: 0 }] },
    // Couloir — le strapontin rabattable, face aux fenêtres.
    { id: 'strapontin', type: 'strapontin', occupiable: true, cells: [{ row: 5, col: 3 }] },
  ],
  people: [
    {
      // Bertrand Aubier, contrôleur des wagons-lits. La victime : le seul élément
      // du dossier est « on l'a trouvé contre une couchette » — et il y en a deux,
      // dans deux compartiments différents (§50). Rien là-dedans ne désigne une
      // case : il faudra les quatre autres pour trancher (§14).
      id: 'bertrand',
      nameKey: 'bertrand',
      isVictim: true,
      constraints: [{ type: 'adjacentToObjectType', objectType: 'couchette' }],
    },
    {
      // Irina Voskoff, cantatrice, dix-sept malles et un contrat à Milan.
      // « Sortie au couloir, derrière l'horloger, trois travées après le contrôleur. »
      id: 'irina',
      nameKey: 'irina',
      constraints: [
        { type: 'direction', other: 'stefan', dir: 'S' },
        { type: 'distance', other: 'bertrand', axis: 'col', exact: -3 },
      ],
    },
    {
      // Hugo Delatour, négociant en soieries, au 13, troisième rangée.
      id: 'hugo',
      nameKey: 'hugo',
      constraints: [
        { type: 'inRow', row: 2 },
        { type: 'inZone', zoneId: 'treize' },
      ],
    },
    {
      // Margot Sylvain, journaliste. « Contre le lavabo, la serviette était encore humide. »
      id: 'margot',
      nameKey: 'margot',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'lavabo' }],
    },
    {
      // Stefan Kruger, horloger de Bienne.
      // « Pas dans la travée 2, et quatre rangées derrière le contrôleur. »
      id: 'stefan',
      nameKey: 'stefan',
      constraints: [
        { type: 'not', of: { type: 'inColumn', column: 2 } },
        { type: 'distance', other: 'bertrand', axis: 'row', exact: -4 },
      ],
    },
  ],
  victimId: 'bertrand',
}
