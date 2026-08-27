import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Entrée
  { id: '0-0', x: 0, y: 0, roomId: 'entree', decor: ['chandelier'] },
  { id: '1-0', x: 1, y: 0, roomId: 'entree' },
  { id: '0-1', x: 0, y: 1, roomId: 'entree' },
  { id: '1-1', x: 1, y: 1, roomId: 'entree', decor: ['window'] },
  // Salon
  { id: '2-0', x: 2, y: 0, roomId: 'salon', decor: ['fireplace'] },
  { id: '3-0', x: 3, y: 0, roomId: 'salon' },
  { id: '2-1', x: 2, y: 1, roomId: 'salon' },
  { id: '3-1', x: 3, y: 1, roomId: 'salon', decor: ['armor'] },
  // Bibliothèque
  { id: '4-0', x: 4, y: 0, roomId: 'bibliotheque', decor: ['bookshelf'] },
  { id: '5-0', x: 5, y: 0, roomId: 'bibliotheque' },
  { id: '4-1', x: 4, y: 1, roomId: 'bibliotheque' },
  { id: '5-1', x: 5, y: 1, roomId: 'bibliotheque', decor: ['clock'] },
  // Cave (minuscule)
  { id: '5-2', x: 5, y: 2, roomId: 'cave' },
  // Grenier
  { id: '0-2', x: 0, y: 2, roomId: 'grenier', decor: ['crate'] },
  { id: '1-2', x: 1, y: 2, roomId: 'grenier' },
  { id: '0-3', x: 0, y: 3, roomId: 'grenier' },
  { id: '1-3', x: 1, y: 3, roomId: 'grenier', decor: ['mirror'] },
  // Cuisine
  { id: '2-2', x: 2, y: 2, roomId: 'cuisine', decor: ['table'] },
  { id: '3-2', x: 3, y: 2, roomId: 'cuisine' },
  { id: '4-2', x: 4, y: 2, roomId: 'cuisine' },
  { id: '2-3', x: 2, y: 3, roomId: 'cuisine' },
  { id: '3-3', x: 3, y: 3, roomId: 'cuisine' },
  { id: '4-3', x: 4, y: 3, roomId: 'cuisine' },
  { id: '5-3', x: 5, y: 3, roomId: 'cuisine', decor: ['toolbox'] },
]

export const manoirCase: CaseDef = {
  id: 'manoir',
  titleKey: 'manoir.title',
  flavorTextKey: 'manoir.flavorText',
  difficulty: 6,
  hintsAllowed: 5,
  grid,
  rooms: [
    { id: 'entree', nameKey: 'manoir.rooms.entree' },
    { id: 'salon', nameKey: 'manoir.rooms.salon' },
    { id: 'bibliotheque', nameKey: 'manoir.rooms.bibliotheque' },
    { id: 'cave', nameKey: 'manoir.rooms.cave' },
    { id: 'grenier', nameKey: 'manoir.rooms.grenier' },
    { id: 'cuisine', nameKey: 'manoir.rooms.cuisine' },
  ],
  characters: [
    {
      id: 'reine',
      nameKey: 'manoir.characters.reine',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'fireplace' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'aristide',
      nameKey: 'manoir.characters.aristide',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'armor' }],
    },
    {
      id: 'hortense',
      nameKey: 'manoir.characters.hortense',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'chandelier' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'bertrand',
      nameKey: 'manoir.characters.bertrand',
      avatarColor: '#db2777',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
    {
      id: 'clemence',
      nameKey: 'manoir.characters.clemence',
      avatarColor: '#ca8a04',
      clues: [
        { type: 'adjacentToDecor', decor: 'bookshelf' },
        { type: 'relativeTo', target: 'reine', direction: 'E' },
      ],
    },
    {
      id: 'firmin',
      nameKey: 'manoir.characters.firmin',
      avatarColor: '#16a34a',
      clues: [{ type: 'adjacentToDecor', decor: 'clock' }],
    },
    {
      id: 'edmond',
      nameKey: 'manoir.characters.edmond',
      avatarColor: '#4b5563',
      clues: [{ type: 'inColumn', column: 'right' }],
    },
    {
      id: 'josephine',
      nameKey: 'manoir.characters.josephine',
      avatarColor: '#2563eb',
      clues: [
        { type: 'adjacentToDecor', decor: 'crate' },
        { type: 'relativeTo', target: 'hortense', direction: 'S' },
      ],
    },
    {
      id: 'raymond',
      nameKey: 'manoir.characters.raymond',
      avatarColor: '#0d9488',
      clues: [{ type: 'adjacentToDecor', decor: 'mirror' }],
    },
    {
      id: 'ernestine',
      nameKey: 'manoir.characters.ernestine',
      avatarColor: '#ea580c',
      clues: [{ type: 'adjacentToDecor', decor: 'toolbox' }],
    },
    {
      id: 'prosper',
      nameKey: 'manoir.characters.prosper',
      avatarColor: '#65a30d',
      clues: [
        { type: 'adjacentToDecor', decor: 'table' },
        { type: 'relativeTo', target: 'aristide', direction: 'S' },
      ],
    },
    {
      id: 'adelaide',
      nameKey: 'manoir.characters.adelaide',
      avatarColor: '#be185d',
      clues: [
        { type: 'inRoom', roomId: 'cuisine' },
        { type: 'adjacentToCharacter', target: 'ernestine' },
        { type: 'inColumn', column: 'right' },
      ],
    },
    {
      id: 'hippolyte',
      nameKey: 'manoir.characters.hippolyte',
      avatarColor: '#9333ea',
      clues: [
        { type: 'inRoom', roomId: 'cuisine' },
        { type: 'adjacentToCharacter', target: 'prosper' },
        { type: 'inRow', row: 3 },
      ],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'reine',
  murdererId: 'aristide',
  solution: {
    reine: '3-0',
    aristide: '2-1',
    hortense: '1-0',
    bertrand: '0-1',
    clemence: '5-0',
    firmin: '4-1',
    edmond: '5-2',
    josephine: '1-2',
    raymond: '0-3',
    ernestine: '4-3',
    prosper: '2-3',
    adelaide: '5-3',
    hippolyte: '3-3',
  },
}
