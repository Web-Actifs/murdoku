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
 * marge 1), 9 indices, résolu entièrement par propagation.
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
 * deux fenêtres, dans deux zones différentes. « À côté d'une table » couvre
 * donc les deux pièces à la fois, et c'est le fait que Soizic revendique la
 * réserve pour elle seule qui finit par en écarter Armel.
 *
 * L'enchaînement voulu — dix-huit des vingt et une déductions dépendent d'un
 * seul et même pas, le deuxième :
 *   1. Tout part de l'écart de trois rangées entre Noémie et Tanguy : il coupe
 *      les possibilités de Noémie de moitié, ce qui confine Tanguy à la rangée
 *      du bas, ce qui à son tour rogne Gaspard et Soizic.
 *   2. Soizic revendique la réserve pour elle seule : cette zone se ferme aux
 *      autres (technique `zoneExclusivity`) avant même qu'on sache où elle est.
 *   3. Soizic posée, sa colonne pose Armel ; la rangée d'Armel pose enfin
 *      Gaspard — la victime, avant-dernière, exactement comme le veut §14.
 *   4. Gaspard posé, sa colonne pose Tanguy, et la colonne de Tanguy pose
 *      Noémie : celle qui restait avec lui dans le logement, donc la coupable.
 *
 * Indices produits par le générateur (graine 100), puis remis en scène ici.
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
    // Veille — la baie du levant, deux vantaux, plein est sur la mer.
    {
      id: 'baieDuLevant',
      type: 'window',
      occupiable: false,
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
      occupiable: false,
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
      // Gaspard Quéré, gardien-chef. La victime : on n'a qu'un relevé de position.
      // « Le corps était exactement une travée à l'ouest du poste de Tanguy. »
      id: 'gaspard',
      nameKey: 'gaspard',
      isVictim: true,
      constraints: [{ type: 'distance', other: 'tanguy', axis: 'col', exact: 1 }],
    },
    {
      // Soizic Le Bihan, gardienne adjointe, descendue jauger le mazout.
      // « Seule à la réserve, contre la cuve, une rangée au sud de l'inspectrice. »
      id: 'soizic',
      nameKey: 'soizic',
      constraints: [
        { type: 'distance', other: 'noemie', axis: 'row', exact: -1 },
        { type: 'alone' },
        { type: 'adjacentToObjectType', objectType: 'cuve' },
      ],
    },
    {
      // Armel Kerrien, le mécanicien. « À côté d'une table » — reste à savoir laquelle.
      id: 'armel',
      nameKey: 'armel',
      constraints: [{ type: 'adjacentToObjectType', objectType: 'table' }],
    },
    {
      // Noémie Vasseur, inspectrice des Phares et Balises, bloquée par le coup de vent.
      // « J'étais avec le gardien-chef, trois rangées au nord du marin. »
      id: 'noemie',
      nameKey: 'noemie',
      constraints: [
        { type: 'withPerson', other: 'gaspard' },
        { type: 'distance', other: 'tanguy', axis: 'row', exact: 3 },
      ],
    },
    {
      // Tanguy Morvan, patron de la vedette de ravitaillement, à la machine.
      id: 'tanguy',
      nameKey: 'tanguy',
      constraints: [
        { type: 'inZone', zoneId: 'machinerie' },
        { type: 'direction', other: 'noemie', dir: 'W' },
      ],
    },
  ],
  victimId: 'gaspard',
}
