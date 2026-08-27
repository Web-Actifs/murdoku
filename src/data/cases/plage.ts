import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Plage
  { id: '0-0', x: 0, y: 0, roomId: 'plage' },
  { id: '1-0', x: 1, y: 0, roomId: 'plage' },
  { id: '2-0', x: 2, y: 0, roomId: 'plage', decor: ['parasol'] },
  { id: '0-1', x: 0, y: 1, roomId: 'plage', decor: ['deckchair'] },
  { id: '1-1', x: 1, y: 1, roomId: 'plage' },
  // Buvette
  { id: '3-0', x: 3, y: 0, roomId: 'buvette' },
  { id: '4-0', x: 4, y: 0, roomId: 'buvette', decor: ['cooler'] },
  { id: '2-1', x: 2, y: 1, roomId: 'buvette', decor: ['beach-ball'] },
  { id: '3-1', x: 3, y: 1, roomId: 'buvette' },
  { id: '4-1', x: 4, y: 1, roomId: 'buvette' },
  // Poste de secours
  { id: '0-2', x: 0, y: 2, roomId: 'poste-secours', decor: ['surfboard'] },
  { id: '1-2', x: 1, y: 2, roomId: 'poste-secours' },
  { id: '0-3', x: 0, y: 3, roomId: 'poste-secours' },
  { id: '1-3', x: 1, y: 3, roomId: 'poste-secours' },
  { id: '2-3', x: 2, y: 3, roomId: 'poste-secours', decor: ['locker'] },
  // Local de location
  { id: '2-2', x: 2, y: 2, roomId: 'location', decor: ['window'] },
  { id: '3-2', x: 3, y: 2, roomId: 'location' },
  { id: '4-2', x: 4, y: 2, roomId: 'location' },
  { id: '3-3', x: 3, y: 3, roomId: 'location' },
  { id: '4-3', x: 4, y: 3, roomId: 'location', decor: ['sofa'] },
]

export const plageCase: CaseDef = {
  id: 'plage',
  titleKey: 'plage.title',
  flavorTextKey: 'plage.flavorText',
  difficulty: 2,
  hintsAllowed: 2,
  grid,
  rooms: [
    { id: 'plage', nameKey: 'plage.rooms.plage' },
    { id: 'buvette', nameKey: 'plage.rooms.buvette' },
    { id: 'poste-secours', nameKey: 'plage.rooms.poste-secours' },
    { id: 'location', nameKey: 'plage.rooms.location' },
  ],
  characters: [
    {
      id: 'theo',
      nameKey: 'plage.characters.theo',
      avatarColor: '#0891b2',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'cooler' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'manon',
      nameKey: 'plage.characters.manon',
      avatarColor: '#db2777',
      clues: [{ type: 'adjacentToDecor', decor: 'beach-ball' }],
    },
    {
      id: 'yanis',
      nameKey: 'plage.characters.yanis',
      avatarColor: '#2563eb',
      clues: [{ type: 'adjacentToDecor', decor: 'parasol' }],
    },
    {
      id: 'ines',
      nameKey: 'plage.characters.ines',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'deckchair' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'paul',
      nameKey: 'plage.characters.paul',
      avatarColor: '#ca8a04',
      clues: [{ type: 'adjacentToDecor', decor: 'locker' }],
    },
    {
      id: 'clara',
      nameKey: 'plage.characters.clara',
      avatarColor: '#7c3aed',
      clues: [
        { type: 'adjacentToDecor', decor: 'surfboard' },
        { type: 'relativeTo', target: 'paul', direction: 'N' },
      ],
    },
    {
      id: 'sami',
      nameKey: 'plage.characters.sami',
      avatarColor: '#ea580c',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
    {
      id: 'nina',
      nameKey: 'plage.characters.nina',
      avatarColor: '#0d9488',
      clues: [
        { type: 'adjacentToDecor', decor: 'sofa' },
        { type: 'inColumn', column: 'right' },
      ],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'theo',
  murdererId: 'manon',
  solution: {
    theo: '3-0',
    manon: '3-1',
    yanis: '1-0',
    ines: '0-0',
    paul: '1-3',
    clara: '1-2',
    sami: '3-2',
    nina: '4-2',
  },
}
