import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Bureau du conservateur
  { id: '0-0', x: 0, y: 0, roomId: 'bureau-conservateur', decor: ['bookshelf'] },
  { id: '1-0', x: 1, y: 0, roomId: 'bureau-conservateur' },
  { id: '0-1', x: 0, y: 1, roomId: 'bureau-conservateur' },
  { id: '1-1', x: 1, y: 1, roomId: 'bureau-conservateur', decor: ['clock'] },
  // Galerie des tableaux
  { id: '2-0', x: 2, y: 0, roomId: 'galerie' },
  { id: '3-0', x: 3, y: 0, roomId: 'galerie', decor: ['painting'] },
  { id: '4-0', x: 4, y: 0, roomId: 'galerie' },
  { id: '2-1', x: 2, y: 1, roomId: 'galerie' },
  { id: '3-1', x: 3, y: 1, roomId: 'galerie' },
  { id: '4-1', x: 4, y: 1, roomId: 'galerie', decor: ['statue'] },
  // Salle des vases
  { id: '5-0', x: 5, y: 0, roomId: 'salle-vases', decor: ['display-case'] },
  { id: '5-1', x: 5, y: 1, roomId: 'salle-vases' },
  // Hall d'entrée
  { id: '0-2', x: 0, y: 2, roomId: 'hall', decor: ['sofa'] },
  { id: '1-2', x: 1, y: 2, roomId: 'hall' },
  { id: '0-3', x: 0, y: 3, roomId: 'hall' },
  { id: '1-3', x: 1, y: 3, roomId: 'hall' },
  { id: '2-3', x: 2, y: 3, roomId: 'hall', decor: ['bench'] },
  // Salle des squelettes
  { id: '2-2', x: 2, y: 2, roomId: 'squelettes', decor: ['skeleton'] },
  { id: '3-2', x: 3, y: 2, roomId: 'squelettes' },
  { id: '4-2', x: 4, y: 2, roomId: 'squelettes' },
  { id: '5-2', x: 5, y: 2, roomId: 'squelettes' },
  { id: '3-3', x: 3, y: 3, roomId: 'squelettes' },
  { id: '4-3', x: 4, y: 3, roomId: 'squelettes' },
  { id: '5-3', x: 5, y: 3, roomId: 'squelettes' },
]

export const museeCase: CaseDef = {
  id: 'musee',
  titleKey: 'musee.title',
  flavorTextKey: 'musee.flavorText',
  difficulty: 4,
  hintsAllowed: 3,
  grid,
  rooms: [
    { id: 'bureau-conservateur', nameKey: 'musee.rooms.bureau-conservateur' },
    { id: 'galerie', nameKey: 'musee.rooms.galerie' },
    { id: 'salle-vases', nameKey: 'musee.rooms.salle-vases' },
    { id: 'hall', nameKey: 'musee.rooms.hall' },
    { id: 'squelettes', nameKey: 'musee.rooms.squelettes' },
  ],
  characters: [
    {
      id: 'bernard',
      nameKey: 'musee.characters.bernard',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'bookshelf' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'isabelle',
      nameKey: 'musee.characters.isabelle',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'clock' }],
    },
    {
      id: 'thierry',
      nameKey: 'musee.characters.thierry',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'statue' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'nadege',
      nameKey: 'musee.characters.nadege',
      avatarColor: '#db2777',
      clues: [
        { type: 'adjacentToDecor', decor: 'painting' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'fabrice',
      nameKey: 'musee.characters.fabrice',
      avatarColor: '#ca8a04',
      clues: [{ type: 'adjacentToDecor', decor: 'bench' }],
    },
    {
      id: 'juliette',
      nameKey: 'musee.characters.juliette',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'sofa' },
        { type: 'relativeTo', target: 'fabrice', direction: 'N' },
      ],
    },
    {
      id: 'romain',
      nameKey: 'musee.characters.romain',
      avatarColor: '#ea580c',
      clues: [{ type: 'adjacentToDecor', decor: 'skeleton' }],
    },
    {
      id: 'valentine',
      nameKey: 'musee.characters.valentine',
      avatarColor: '#0d9488',
      clues: [
        { type: 'inRoom', roomId: 'squelettes' },
        { type: 'relativeTo', target: 'romain', direction: 'S' },
      ],
    },
    {
      id: 'odile',
      nameKey: 'musee.characters.odile',
      avatarColor: '#2563eb',
      clues: [
        { type: 'inColumn', column: 'right' },
        { type: 'notAlone' },
      ],
    },
    {
      id: 'simone',
      nameKey: 'musee.characters.simone',
      avatarColor: '#65a30d',
      clues: [
        { type: 'inColumn', column: 'right' },
        { type: 'notAlone' },
        { type: 'relativeTo', target: 'odile', direction: 'S' },
      ],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'bernard',
  murdererId: 'isabelle',
  solution: {
    bernard: '1-0',
    isabelle: '0-1',
    thierry: '4-0',
    nadege: '2-0',
    fabrice: '1-3',
    juliette: '1-2',
    romain: '3-2',
    valentine: '3-3',
    odile: '5-0',
    simone: '5-1',
  },
}
