import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Hall d'embarquement
  { id: '0-0', x: 0, y: 0, roomId: 'hall' },
  { id: '1-0', x: 1, y: 0, roomId: 'hall' },
  { id: '2-0', x: 2, y: 0, roomId: 'hall', decor: ['departure-board'] },
  { id: '0-1', x: 0, y: 1, roomId: 'hall', decor: ['suitcase'] },
  { id: '1-1', x: 1, y: 1, roomId: 'hall' },
  // Contrôle de sécurité
  { id: '3-0', x: 3, y: 0, roomId: 'securite' },
  { id: '4-0', x: 4, y: 0, roomId: 'securite', decor: ['bench'] },
  { id: '2-1', x: 2, y: 1, roomId: 'securite', decor: ['vending-machine'] },
  { id: '3-1', x: 3, y: 1, roomId: 'securite' },
  { id: '4-1', x: 4, y: 1, roomId: 'securite' },
  // Tapis à bagages
  { id: '0-2', x: 0, y: 2, roomId: 'bagages', decor: ['luggage-cart'] },
  { id: '1-2', x: 1, y: 2, roomId: 'bagages' },
  { id: '0-3', x: 0, y: 3, roomId: 'bagages' },
  { id: '1-3', x: 1, y: 3, roomId: 'bagages' },
  { id: '2-3', x: 2, y: 3, roomId: 'bagages', decor: ['locker'] },
  // Salon VIP
  { id: '2-2', x: 2, y: 2, roomId: 'vip', decor: ['window'] },
  { id: '3-2', x: 3, y: 2, roomId: 'vip' },
  { id: '4-2', x: 4, y: 2, roomId: 'vip' },
  { id: '3-3', x: 3, y: 3, roomId: 'vip' },
  { id: '4-3', x: 4, y: 3, roomId: 'vip', decor: ['sofa'] },
]

export const aeroportCase: CaseDef = {
  id: 'aeroport',
  titleKey: 'aeroport.title',
  flavorTextKey: 'aeroport.flavorText',
  difficulty: 2,
  hintsAllowed: 2,
  grid,
  rooms: [
    { id: 'hall', nameKey: 'aeroport.rooms.hall' },
    { id: 'securite', nameKey: 'aeroport.rooms.securite' },
    { id: 'bagages', nameKey: 'aeroport.rooms.bagages' },
    { id: 'vip', nameKey: 'aeroport.rooms.vip' },
  ],
  characters: [
    {
      id: 'adam',
      nameKey: 'aeroport.characters.adam',
      avatarColor: '#0891b2',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'bench' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'zoe',
      nameKey: 'aeroport.characters.zoe',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'vending-machine' }],
    },
    {
      id: 'amir',
      nameKey: 'aeroport.characters.amir',
      avatarColor: '#2563eb',
      clues: [{ type: 'adjacentToDecor', decor: 'departure-board' }],
    },
    {
      id: 'julie',
      nameKey: 'aeroport.characters.julie',
      avatarColor: '#db2777',
      clues: [
        { type: 'adjacentToDecor', decor: 'suitcase' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'farid',
      nameKey: 'aeroport.characters.farid',
      avatarColor: '#ca8a04',
      clues: [{ type: 'adjacentToDecor', decor: 'locker' }],
    },
    {
      id: 'lucie',
      nameKey: 'aeroport.characters.lucie',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'luggage-cart' },
        { type: 'relativeTo', target: 'farid', direction: 'N' },
      ],
    },
    {
      id: 'bilal',
      nameKey: 'aeroport.characters.bilal',
      avatarColor: '#ea580c',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
    {
      id: 'emma',
      nameKey: 'aeroport.characters.emma',
      avatarColor: '#0d9488',
      clues: [
        { type: 'adjacentToDecor', decor: 'sofa' },
        { type: 'inColumn', column: 'right' },
      ],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'adam',
  murdererId: 'zoe',
  solution: {
    adam: '3-0',
    zoe: '3-1',
    amir: '1-0',
    julie: '0-0',
    farid: '1-3',
    lucie: '1-2',
    bilal: '3-2',
    emma: '4-2',
  },
}
