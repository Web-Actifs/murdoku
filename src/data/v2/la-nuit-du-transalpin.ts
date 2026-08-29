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
 * différents. « À côté d'une couchette » ne désigne donc jamais un
 * compartiment à lui seul — le domaine est l'union des deux, à l'échelle du
 * plateau, et c'est le reste de la déduction qui tranche.
 *
 * L'enchaînement voulu :
 *   1. Hugo tient tout entier dans la rangée 1 (la banquette du n°13) et
 *      Stefan dans la rangée 2 : deux rangées réservées avant le moindre
 *      placement, et Margot n'a déjà plus que deux cases.
 *   2. « Le contrôleur était dans le compartiment de Margot » ne dit rien
 *      d'absolu — mais comme Margot est confinée à la colonne 2, Bertrand l'est
 *      aussi, et il se pose. La victime est ainsi déduite depuis les vivants,
 *      jamais l'inverse.
 *   3. Irina, dans le même compartiment que Hugo et plus près de la
 *      locomotive que lui, verrouille la colonne 4 : Hugo se pose.
 *   4. Le contrôleur posé, sa rangée et sa colonne font tomber Margot, puis
 *      Stefan, puis Irina.
 *
 * Indices produits par le générateur (graine 95), puis remis en scène ici.
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
    { id: 'fenetreOnze', type: 'window', occupiable: false, cells: [{ row: 0, col: 0 }] },
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
    { id: 'fenetreTreize', type: 'window', occupiable: false, cells: [{ row: 0, col: 5 }] },
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
      // Bertrand Aubier, contrôleur des wagons-lits. La victime.
      // « On l'a vu entrer chez la journaliste, on ne l'a pas vu ressortir. »
      id: 'bertrand',
      nameKey: 'bertrand',
      isVictim: true,
      constraints: [{ type: 'withPerson', other: 'margot' }],
    },
    {
      // Irina Voskoff, cantatrice, dix-sept malles et un contrat à Milan.
      // « J'étais avec Hugo, du côté de la locomotive. »
      id: 'irina',
      nameKey: 'irina',
      constraints: [
        { type: 'direction', other: 'hugo', dir: 'W' },
        { type: 'withPerson', other: 'hugo' },
      ],
    },
    {
      // Hugo Delatour, négociant en soieries, qui n'a pas déplié sa couchette.
      id: 'hugo',
      nameKey: 'hugo',
      constraints: [{ type: 'onObjectType', objectType: 'banquette' }],
    },
    {
      // Margot Sylvain, journaliste. « Pas au 11, en tout cas. Près d'une couchette. »
      id: 'margot',
      nameKey: 'margot',
      constraints: [
        { type: 'not', of: { type: 'inZone', zoneId: 'onze' } },
        { type: 'adjacentToObjectType', objectType: 'couchette' },
      ],
    },
    {
      // Stefan Kruger, horloger de Bienne, debout près de la couchette du 11.
      id: 'stefan',
      nameKey: 'stefan',
      constraints: [
        { type: 'adjacentToObjectType', objectType: 'couchette' },
        { type: 'inRow', row: 2 },
      ],
    },
  ],
  victimId: 'bertrand',
}
