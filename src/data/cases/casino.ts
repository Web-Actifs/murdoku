import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Réception
  { id: '0-0', x: 0, y: 0, roomId: 'reception', decor: ['chandelier'] },
  { id: '1-0', x: 1, y: 0, roomId: 'reception' },
  { id: '0-1', x: 0, y: 1, roomId: 'reception' },
  { id: '1-1', x: 1, y: 1, roomId: 'reception', decor: ['window'] },
  // Caisse
  { id: '2-0', x: 2, y: 0, roomId: 'caisse', decor: ['table'] },
  { id: '3-0', x: 3, y: 0, roomId: 'caisse' },
  { id: '2-1', x: 2, y: 1, roomId: 'caisse' },
  { id: '3-1', x: 3, y: 1, roomId: 'caisse', decor: ['filing-cabinet'] },
  // Salle de jeu
  { id: '4-0', x: 4, y: 0, roomId: 'salle-jeu' },
  { id: '5-0', x: 5, y: 0, roomId: 'salle-jeu', decor: ['slot-machine'] },
  { id: '4-1', x: 4, y: 1, roomId: 'salle-jeu' },
  { id: '5-1', x: 5, y: 1, roomId: 'salle-jeu' },
  { id: '4-2', x: 4, y: 2, roomId: 'salle-jeu', decor: ['card-table'] },
  { id: '5-2', x: 5, y: 2, roomId: 'salle-jeu' },
  // Bar
  { id: '0-2', x: 0, y: 2, roomId: 'bar', decor: ['bar-counter'] },
  { id: '1-2', x: 1, y: 2, roomId: 'bar' },
  { id: '0-3', x: 0, y: 3, roomId: 'bar' },
  { id: '1-3', x: 1, y: 3, roomId: 'bar', decor: ['sofa'] },
  // Salon VIP
  { id: '2-2', x: 2, y: 2, roomId: 'vip', decor: ['chip-stack'] },
  { id: '3-2', x: 3, y: 2, roomId: 'vip' },
  { id: '2-3', x: 2, y: 3, roomId: 'vip' },
  { id: '3-3', x: 3, y: 3, roomId: 'vip' },
  { id: '4-3', x: 4, y: 3, roomId: 'vip' },
  { id: '5-3', x: 5, y: 3, roomId: 'vip', decor: ['curtain'] },
]

export const casinoCase: CaseDef = {
  id: 'casino',
  titleKey: 'casino.title',
  flavorTextKey: 'casino.flavorText',
  difficulty: 4,
  hintsAllowed: 3,
  grid,
  rooms: [
    { id: 'reception', nameKey: 'casino.rooms.reception' },
    { id: 'caisse', nameKey: 'casino.rooms.caisse' },
    { id: 'salle-jeu', nameKey: 'casino.rooms.salle-jeu' },
    { id: 'bar', nameKey: 'casino.rooms.bar' },
    { id: 'vip', nameKey: 'casino.rooms.vip' },
  ],
  characters: [
    {
      id: 'solange',
      nameKey: 'casino.characters.solange',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'table' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'igor',
      nameKey: 'casino.characters.igor',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'filing-cabinet' }],
    },
    {
      id: 'robert',
      nameKey: 'casino.characters.robert',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'chandelier' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'marceline',
      nameKey: 'casino.characters.marceline',
      avatarColor: '#db2777',
      clues: [{ type: 'adjacentToDecor', decor: 'window' }],
    },
    {
      id: 'tania',
      nameKey: 'casino.characters.tania',
      avatarColor: '#ca8a04',
      clues: [
        { type: 'adjacentToDecor', decor: 'slot-machine' },
        { type: 'relativeTo', target: 'solange', direction: 'E' },
      ],
    },
    {
      id: 'malik',
      nameKey: 'casino.characters.malik',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'card-table' },
        { type: 'inColumn', column: 'right' },
      ],
    },
    {
      id: 'priscilla',
      nameKey: 'casino.characters.priscilla',
      avatarColor: '#2563eb',
      clues: [
        { type: 'adjacentToDecor', decor: 'bar-counter' },
        { type: 'relativeTo', target: 'robert', direction: 'S' },
      ],
    },
    {
      id: 'youssef',
      nameKey: 'casino.characters.youssef',
      avatarColor: '#0d9488',
      clues: [{ type: 'adjacentToDecor', decor: 'sofa' }],
    },
    {
      id: 'sandrine',
      nameKey: 'casino.characters.sandrine',
      avatarColor: '#ea580c',
      clues: [
        { type: 'adjacentToDecor', decor: 'chip-stack' },
        { type: 'relativeTo', target: 'solange', direction: 'S' },
      ],
    },
    {
      id: 'kevin',
      nameKey: 'casino.characters.kevin',
      avatarColor: '#65a30d',
      clues: [{ type: 'adjacentToDecor', decor: 'curtain' }],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'solange',
  murdererId: 'igor',
  solution: {
    solange: '3-0',
    igor: '2-1',
    robert: '1-0',
    marceline: '0-1',
    tania: '4-0',
    malik: '5-2',
    priscilla: '1-2',
    youssef: '0-3',
    sandrine: '3-2',
    kevin: '4-3',
  },
}
