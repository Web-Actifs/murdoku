import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Guichet
  { id: '0-0', x: 0, y: 0, roomId: 'guichet', decor: ['chair'] },
  { id: '1-0', x: 1, y: 0, roomId: 'guichet' },
  { id: '0-1', x: 0, y: 1, roomId: 'guichet' },
  { id: '1-1', x: 1, y: 1, roomId: 'guichet', decor: ['window'] },
  // Coulisses
  { id: '2-0', x: 2, y: 0, roomId: 'coulisses', decor: ['table'] },
  { id: '3-0', x: 3, y: 0, roomId: 'coulisses' },
  { id: '2-1', x: 2, y: 1, roomId: 'coulisses' },
  { id: '3-1', x: 3, y: 1, roomId: 'coulisses', decor: ['tv'] },
  // Scène (grande, 8 cases)
  { id: '4-0', x: 4, y: 0, roomId: 'scene' },
  { id: '5-0', x: 5, y: 0, roomId: 'scene', decor: ['curtain'] },
  { id: '4-1', x: 4, y: 1, roomId: 'scene' },
  { id: '5-1', x: 5, y: 1, roomId: 'scene' },
  { id: '4-2', x: 4, y: 2, roomId: 'scene', decor: ['piano'] },
  { id: '5-2', x: 5, y: 2, roomId: 'scene' },
  { id: '4-3', x: 4, y: 3, roomId: 'scene' },
  { id: '5-3', x: 5, y: 3, roomId: 'scene', decor: ['spotlight'] },
  // Loges
  { id: '0-2', x: 0, y: 2, roomId: 'loges', decor: ['mirror'] },
  { id: '1-2', x: 1, y: 2, roomId: 'loges' },
  { id: '0-3', x: 0, y: 3, roomId: 'loges' },
  { id: '1-3', x: 1, y: 3, roomId: 'loges', decor: ['clothes-rack'] },
  // Fosse d'orchestre
  { id: '2-2', x: 2, y: 2, roomId: 'fosse', decor: ['locker'] },
  { id: '3-2', x: 3, y: 2, roomId: 'fosse' },
  { id: '2-3', x: 2, y: 3, roomId: 'fosse' },
  { id: '3-3', x: 3, y: 3, roomId: 'fosse', decor: ['speaker'] },
]

export const theatreCase: CaseDef = {
  id: 'theatre',
  titleKey: 'theatre.title',
  flavorTextKey: 'theatre.flavorText',
  difficulty: 5,
  hintsAllowed: 4,
  grid,
  rooms: [
    { id: 'guichet', nameKey: 'theatre.rooms.guichet' },
    { id: 'coulisses', nameKey: 'theatre.rooms.coulisses' },
    { id: 'scene', nameKey: 'theatre.rooms.scene' },
    { id: 'loges', nameKey: 'theatre.rooms.loges' },
    { id: 'fosse', nameKey: 'theatre.rooms.fosse' },
  ],
  characters: [
    {
      id: 'philippe',
      nameKey: 'theatre.characters.philippe',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'table' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'corinne',
      nameKey: 'theatre.characters.corinne',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'tv' }],
    },
    {
      id: 'armand',
      nameKey: 'theatre.characters.armand',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'chair' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'delphine',
      nameKey: 'theatre.characters.delphine',
      avatarColor: '#db2777',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
    {
      id: 'thibault',
      nameKey: 'theatre.characters.thibault',
      avatarColor: '#ca8a04',
      clues: [
        { type: 'adjacentToDecor', decor: 'curtain' },
        { type: 'relativeTo', target: 'philippe', direction: 'E' },
      ],
    },
    {
      id: 'aurelie',
      nameKey: 'theatre.characters.aurelie',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'spotlight' },
        { type: 'inColumn', column: 'right' },
      ],
    },
    {
      id: 'damien',
      nameKey: 'theatre.characters.damien',
      avatarColor: '#2563eb',
      clues: [
        { type: 'adjacentToDecor', decor: 'piano' },
        { type: 'inRow', row: 1 },
      ],
    },
    {
      id: 'severine',
      nameKey: 'theatre.characters.severine',
      avatarColor: '#0d9488',
      clues: [
        { type: 'adjacentToDecor', decor: 'mirror' },
        { type: 'relativeTo', target: 'armand', direction: 'S' },
      ],
    },
    {
      id: 'guillaume',
      nameKey: 'theatre.characters.guillaume',
      avatarColor: '#ea580c',
      clues: [{ type: 'adjacentToDecor', decor: 'clothes-rack' }],
    },
    {
      id: 'nathalie',
      nameKey: 'theatre.characters.nathalie',
      avatarColor: '#65a30d',
      clues: [
        { type: 'adjacentToDecor', decor: 'locker' },
        { type: 'relativeTo', target: 'philippe', direction: 'S' },
      ],
    },
    {
      id: 'cedric',
      nameKey: 'theatre.characters.cedric',
      avatarColor: '#be185d',
      clues: [{ type: 'adjacentToDecor', decor: 'speaker' }],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'philippe',
  murdererId: 'corinne',
  solution: {
    philippe: '3-0',
    corinne: '2-1',
    armand: '1-0',
    delphine: '0-1',
    thibault: '4-0',
    aurelie: '5-2',
    damien: '4-1',
    severine: '1-2',
    guillaume: '0-3',
    nathalie: '3-2',
    cedric: '2-3',
  },
}
