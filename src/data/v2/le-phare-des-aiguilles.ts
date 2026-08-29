import type { PuzzleDef } from '../../core/model/types'

/**
 * « Le phare des Aiguilles » — quatrième cas du moteur V2, le plus dur des trois
 * derniers.
 *
 * Coup de vent force 9 sur les Aiguilles. La vedette de ravitaillement n'a pas
 * pu repartir, l'inspection des Phares et Balises non plus : ils étaient cinq
 * dans la tour cette nuit-là. Au relevé de six heures, la lanterne tournait
 * toujours, mais Gaspard Quéré, le gardien-chef, ne tenait plus son cahier de
 * quart.
 *
 * Palier « Avancé » : plan 6x6 évidé, 5 personnes (capacité min(6,6) = 6,
 * marge 1), 8 indices, résolu entièrement par propagation.
 *
 * Le plan — le niveau de service, la cage de l'escalier hélicoïdal au centre
 * (les deux cases vides : ce n'est pas une pièce, on ne s'y tient pas) :
 *
 *   col      0    1    2    3    4    5
 *   row 0  [ veille ......... ][ logement ..... ]
 *   row 1  [ veille ......... ][ logement ..... ]
 *   row 2  [ veille ......... ][ · ][ logement . ]
 *   row 3  [ réserve ........ ][ · ][ logement . ]
 *   row 4  [ réserve ........ ][ machinerie ... ]
 *   row 5  [ réserve ........ ][ machinerie ... ]
 *
 * Ambiguïté volontaire (Claude/claude.md §50) : deux objets de type « table »
 * — la table des cartes de la salle de veille et l'établi de la réserve — et
 * deux fenêtres, dans deux zones différentes. Un indice qui nomme l'un de ces
 * types couvre donc les deux pièces à la fois.
 *
 * Le plus dur des quatre cas, et celui où §14 se voit le mieux : le gardien-chef
 * n'a aucun indice à lui. Son champ se referme uniquement par élimination —
 * 26 cases, puis 21, 17, 12, 8, 7, 5, 3, et enfin une seule, la vingt-sixième
 * déduction sur vingt-sept.
 *
 * L'enchaînement voulu :
 *   1. Trois verrous avant le moindre placement : Armel tient dans la rangée du
 *      bas (le caillebotis), Noémie dans la travée 4, Tanguy dans la travée 1.
 *      À eux trois ils font tomber Gaspard de 26 cases à 12.
 *   2. L'écart de deux travées qu'Armel annonce par rapport au corps le pose le
 *      premier — sans rien livrer de la position du corps lui-même.
 *   3. Soizic se dit seule dans sa pièce : le logement (Noémie), la réserve
 *      (Tanguy) puis la machinerie (Armel) lui sont fermés l'un après l'autre
 *      (technique `zoneExclusivity`), et il ne lui reste que le banc de quart.
 *   4. Soizic posée, sa salle de veille se ferme à son tour ; sa rangée pose
 *      Noémie, la rangée de Noémie pose Tanguy, et la rangée de Tanguy ferme
 *      enfin la dernière case de Gaspard — devant la lucarne nord, dans le
 *      logement, seul avec l'inspectrice.
 *
 * Indices produits par le générateur (graine 309), puis remis en scène ici.
 */
export const phareDef: PuzzleDef = {
  id: 'phare',
  plan: `
    VVVLLL
    VVVLLL
    VVV.LL
    RRR.LL
    RRRMMM
    RRRMMM
  `,
  legend: { V: 'veille', L: 'logement', R: 'reserve', M: 'machinerie' },
  zones: [
    { id: 'veille', nameKey: 'veille' },
    { id: 'logement', nameKey: 'logement' },
    { id: 'reserve', nameKey: 'reserve' },
    { id: 'machinerie', nameKey: 'machinerie' },
  ],
  objects: [
    // Veille — la baie du levant, deux vantaux, plein est sur la mer. La baie est
    // dans le mur : les deux cases devant elle restent du plancher ordinaire (§10).
    {
      id: 'baieDuLevant',
      type: 'window',
      occupiable: true,
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
    },
    // Veille — le banc de quart, deux places, sous la baie.
    {
      id: 'bancDeQuart',
      type: 'banc',
      occupiable: true,
      cells: [
        { row: 1, col: 0 },
        { row: 2, col: 0 },
      ],
    },
    // Veille — la table des cartes, où le cahier de quart est resté ouvert.
    {
      id: 'tableDesCartes',
      type: 'table',
      occupiable: false,
      cells: [
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
    },
    // Logement — la lucarne nord, deux vantaux également.
    {
      id: 'lucarneNord',
      type: 'window',
      occupiable: true,
      cells: [
        { row: 0, col: 4 },
        { row: 0, col: 5 },
      ],
    },
    // Logement — le tapis tressé du gardien-chef, deux cases, devant l'entrée.
    {
      id: 'tapisTresse',
      type: 'tapis',
      occupiable: true,
      cells: [
        { row: 0, col: 3 },
        { row: 1, col: 3 },
      ],
    },
    // Logement — le lit de camp, deux places, contre la paroi courbe.
    {
      id: 'litDeCamp',
      type: 'lit',
      occupiable: true,
      cells: [
        { row: 2, col: 4 },
        { row: 3, col: 4 },
      ],
    },
    // Logement — le poêle à charbon, allumé toute la nuit.
    { id: 'poele', type: 'poele', occupiable: false, cells: [{ row: 1, col: 5 }] },
    // Réserve — la cuve à mazout de la génératrice, deux cases scellées.
    {
      id: 'cuveMazout',
      type: 'cuve',
      occupiable: false,
      cells: [
        { row: 3, col: 0 },
        { row: 4, col: 0 },
      ],
    },
    // Réserve — l'établi du mécanicien, au fond du magasin : une table de plus
    // sur le plateau, dans une tout autre pièce que celle des cartes.
    { id: 'etabli', type: 'table', occupiable: false, cells: [{ row: 5, col: 2 }] },
    // Machinerie — la génératrice, deux cases, qui a tourné toute la nuit.
    {
      id: 'generatrice',
      type: 'generatrice',
      occupiable: false,
      cells: [
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
    },
    // Machinerie — la passerelle de caillebotis, trois pas au-dessus des cuves.
    {
      id: 'passerelle',
      type: 'passerelle',
      occupiable: true,
      cells: [
        { row: 5, col: 3 },
        { row: 5, col: 4 },
        { row: 5, col: 5 },
      ],
    },
  ],
  people: [
    {
      // Gaspard Quéré, gardien-chef. La victime : aucun indice ne porte sur lui.
      // Les quatre autres parlent de leur propre position — deux d'entre eux se
      // situent par rapport au corps sans jamais dire où il est — et sa case est
      // la dernière que le plateau laisse ouverte (§14).
      id: 'gaspard',
      nameKey: 'gaspard',
      isVictim: true,
      constraints: [],
    },
    {
      // Soizic Le Bihan, gardienne adjointe, restée au banc de quart.
      // « Seule dans ma pièce, deux rangées au nord du chef. »
      id: 'soizic',
      nameKey: 'soizic',
      constraints: [
        { type: 'alone' },
        { type: 'distance', other: 'gaspard', axis: 'row', exact: -2 },
      ],
    },
    {
      // Armel Kerrien, le mécanicien, sur le caillebotis de la machinerie.
      // « Deux travées à l'est du chef, sur la passerelle. »
      id: 'armel',
      nameKey: 'armel',
      constraints: [
        { type: 'distance', other: 'gaspard', axis: 'col', exact: 2 },
        { type: 'onObjectType', objectType: 'passerelle' },
      ],
    },
    {
      // Noémie Vasseur, inspectrice des Phares et Balises, bloquée par le coup de vent.
      // « Travée 4, une rangée au sud du marin. »
      id: 'noemie',
      nameKey: 'noemie',
      constraints: [
        { type: 'inColumn', column: 4 },
        { type: 'distance', other: 'tanguy', axis: 'row', exact: 1 },
      ],
    },
    {
      // Tanguy Morvan, patron de la vedette de ravitaillement.
      // « Travée 1, et sûrement pas dans la salle de veille. »
      id: 'tanguy',
      nameKey: 'tanguy',
      constraints: [
        { type: 'inColumn', column: 1 },
        { type: 'not', of: { type: 'inZone', zoneId: 'veille' } },
      ],
    },
  ],
  victimId: 'gaspard',
}
