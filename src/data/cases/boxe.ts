import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Accueil
  { id: '0-0', x: 0, y: 0, roomId: 'accueil', decor: ['plant'] },
  { id: '1-0', x: 1, y: 0, roomId: 'accueil' },
  { id: '0-1', x: 0, y: 1, roomId: 'accueil' },
  { id: '1-1', x: 1, y: 1, roomId: 'accueil', decor: ['trophy'] },
  // Bureau du coach
  { id: '2-0', x: 2, y: 0, roomId: 'bureau-coach', decor: ['table'] },
  { id: '3-0', x: 3, y: 0, roomId: 'bureau-coach' },
  { id: '2-1', x: 2, y: 1, roomId: 'bureau-coach' },
  { id: '3-1', x: 3, y: 1, roomId: 'bureau-coach', decor: ['tv'] },
  // Ring
  { id: '4-0', x: 4, y: 0, roomId: 'ring' },
  { id: '5-0', x: 5, y: 0, roomId: 'ring', decor: ['punching-bag'] },
  { id: '4-1', x: 4, y: 1, roomId: 'ring' },
  { id: '5-1', x: 5, y: 1, roomId: 'ring' },
  { id: '4-2', x: 4, y: 2, roomId: 'ring', decor: ['speaker'] },
  { id: '5-2', x: 5, y: 2, roomId: 'ring' },
  // Vestiaires
  { id: '0-2', x: 0, y: 2, roomId: 'vestiaires', decor: ['locker'] },
  { id: '1-2', x: 1, y: 2, roomId: 'vestiaires' },
  { id: '0-3', x: 0, y: 3, roomId: 'vestiaires' },
  { id: '1-3', x: 1, y: 3, roomId: 'vestiaires', decor: ['chair'] },
  // Salle de muscu
  { id: '2-2', x: 2, y: 2, roomId: 'muscu', decor: ['dumbbell'] },
  { id: '3-2', x: 3, y: 2, roomId: 'muscu' },
  { id: '2-3', x: 2, y: 3, roomId: 'muscu' },
  { id: '3-3', x: 3, y: 3, roomId: 'muscu' },
  { id: '4-3', x: 4, y: 3, roomId: 'muscu' },
  { id: '5-3', x: 5, y: 3, roomId: 'muscu', decor: ['window'] },
]

export const boxeCase: CaseDef = {
  id: 'boxe',
  titleKey: 'boxe.title',
  flavorTextKey: 'boxe.flavorText',
  grid,
  rooms: [
    { id: 'accueil', nameKey: 'boxe.rooms.accueil' },
    { id: 'bureau-coach', nameKey: 'boxe.rooms.bureau-coach' },
    { id: 'ring', nameKey: 'boxe.rooms.ring' },
    { id: 'vestiaires', nameKey: 'boxe.rooms.vestiaires' },
    { id: 'muscu', nameKey: 'boxe.rooms.muscu' },
  ],
  characters: [
    {
      id: 'rocco',
      nameKey: 'boxe.characters.rocco',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'table' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'yasmine',
      nameKey: 'boxe.characters.yasmine',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'tv' }],
    },
    {
      id: 'karim',
      nameKey: 'boxe.characters.karim',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'plant' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'lea',
      nameKey: 'boxe.characters.lea',
      avatarColor: '#db2777',
      clues: [{ type: 'adjacentToDecor', decor: 'trophy' }],
    },
    {
      id: 'fatou',
      nameKey: 'boxe.characters.fatou',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'locker' },
        { type: 'relativeTo', target: 'karim', direction: 'S' },
      ],
    },
    {
      id: 'mathis',
      nameKey: 'boxe.characters.mathis',
      avatarColor: '#ca8a04',
      clues: [
        { type: 'adjacentToDecor', decor: 'punching-bag' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'noor',
      nameKey: 'boxe.characters.noor',
      avatarColor: '#2563eb',
      clues: [
        { type: 'adjacentToDecor', decor: 'speaker' },
        { type: 'inColumn', column: 'right' },
      ],
    },
    {
      id: 'diego',
      nameKey: 'boxe.characters.diego',
      avatarColor: '#ea580c',
      clues: [
        { type: 'adjacentToDecor', decor: 'dumbbell' },
        { type: 'relativeTo', target: 'noor', direction: 'W' },
      ],
    },
    {
      id: 'chloe',
      nameKey: 'boxe.characters.chloe',
      avatarColor: '#0d9488',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'rocco',
  murdererId: 'yasmine',
  solution: {
    rocco: '3-0',
    yasmine: '2-1',
    karim: '1-0',
    lea: '0-1',
    fatou: '1-2',
    mathis: '4-0',
    noor: '5-2',
    diego: '3-2',
    chloe: '4-3',
  },
}
