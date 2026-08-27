import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Atelier
  { id: '0-0', x: 0, y: 0, roomId: 'atelier' },
  { id: '1-0', x: 1, y: 0, roomId: 'atelier' },
  { id: '2-0', x: 2, y: 0, roomId: 'atelier', decor: ['tool-bench'] },
  { id: '0-1', x: 0, y: 1, roomId: 'atelier', decor: ['car'] },
  { id: '1-1', x: 1, y: 1, roomId: 'atelier', decor: ['toolbox'] },
  // Bureau
  { id: '3-0', x: 3, y: 0, roomId: 'bureau' },
  { id: '4-0', x: 4, y: 0, roomId: 'bureau', decor: ['table'] },
  { id: '2-1', x: 2, y: 1, roomId: 'bureau', decor: ['chair'] },
  { id: '3-1', x: 3, y: 1, roomId: 'bureau' },
  { id: '4-1', x: 4, y: 1, roomId: 'bureau', decor: ['tv'] },
  // Stock
  { id: '0-2', x: 0, y: 2, roomId: 'stock', decor: ['tire-stack'] },
  { id: '1-2', x: 1, y: 2, roomId: 'stock' },
  { id: '0-3', x: 0, y: 3, roomId: 'stock', decor: ['plant'] },
  { id: '1-3', x: 1, y: 3, roomId: 'stock' },
  { id: '2-3', x: 2, y: 3, roomId: 'stock', decor: ['locker'] },
  // Zone lavage
  { id: '2-2', x: 2, y: 2, roomId: 'zone-lavage', decor: ['window'] },
  { id: '3-2', x: 3, y: 2, roomId: 'zone-lavage' },
  { id: '4-2', x: 4, y: 2, roomId: 'zone-lavage', decor: ['speaker'] },
  { id: '3-3', x: 3, y: 3, roomId: 'zone-lavage' },
  { id: '4-3', x: 4, y: 3, roomId: 'zone-lavage', decor: ['sofa'] },
]

export const garageCase: CaseDef = {
  id: 'garage',
  titleKey: 'garage.title',
  flavorTextKey: 'garage.flavorText',
  difficulty: 1,
  hintsAllowed: 1,
  grid,
  rooms: [
    { id: 'atelier', nameKey: 'garage.rooms.atelier' },
    { id: 'bureau', nameKey: 'garage.rooms.bureau' },
    { id: 'stock', nameKey: 'garage.rooms.stock' },
    { id: 'zone-lavage', nameKey: 'garage.rooms.zoneLavage' },
  ],
  characters: [
    {
      id: 'marcel',
      nameKey: 'garage.characters.marcel',
      avatarColor: '#c2410c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'table' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'nadia',
      nameKey: 'garage.characters.nadia',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'chair' }],
    },
    {
      id: 'julien',
      nameKey: 'garage.characters.julien',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'tool-bench' },
        { type: 'inRoom', roomId: 'atelier' },
      ],
    },
    {
      id: 'sofia',
      nameKey: 'garage.characters.sofia',
      avatarColor: '#db2777',
      clues: [
        { type: 'adjacentToDecor', decor: 'car' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'elise',
      nameKey: 'garage.characters.elise',
      avatarColor: '#16a34a',
      clues: [{ type: 'adjacentToDecor', decor: 'locker' }],
    },
    {
      id: 'camille',
      nameKey: 'garage.characters.camille',
      avatarColor: '#ca8a04',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
    {
      id: 'hugo',
      nameKey: 'garage.characters.hugo',
      avatarColor: '#2563eb',
      clues: [
        { type: 'adjacentToDecor', decor: 'sofa' },
        { type: 'relativeTo', target: 'camille', direction: 'S' },
      ],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'marcel',
  murdererId: 'nadia',
  solution: {
    marcel: '3-0',
    nadia: '3-1',
    julien: '1-0',
    sofia: '0-0',
    elise: '1-3',
    camille: '3-2',
    hugo: '3-3',
  },
}
