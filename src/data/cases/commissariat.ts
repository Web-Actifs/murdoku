import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Accueil
  { id: '0-0', x: 0, y: 0, roomId: 'accueil', decor: ['plant'] },
  { id: '1-0', x: 1, y: 0, roomId: 'accueil' },
  { id: '0-1', x: 0, y: 1, roomId: 'accueil' },
  { id: '1-1', x: 1, y: 1, roomId: 'accueil', decor: ['clock'] },
  // Bureau du commissaire
  { id: '2-0', x: 2, y: 0, roomId: 'bureau-chef', decor: ['filing-cabinet'] },
  { id: '3-0', x: 3, y: 0, roomId: 'bureau-chef' },
  { id: '2-1', x: 2, y: 1, roomId: 'bureau-chef' },
  { id: '3-1', x: 3, y: 1, roomId: 'bureau-chef', decor: ['computer'] },
  // Salle d'interrogatoire
  { id: '4-0', x: 4, y: 0, roomId: 'salle-interrogatoire' },
  { id: '5-0', x: 5, y: 0, roomId: 'salle-interrogatoire', decor: ['handcuffs'] },
  { id: '4-1', x: 4, y: 1, roomId: 'salle-interrogatoire' },
  { id: '5-1', x: 5, y: 1, roomId: 'salle-interrogatoire' },
  { id: '4-2', x: 4, y: 2, roomId: 'salle-interrogatoire' },
  { id: '5-2', x: 5, y: 2, roomId: 'salle-interrogatoire', decor: ['radio'] },
  // Vestiaire
  { id: '0-2', x: 0, y: 2, roomId: 'vestiaire', decor: ['locker'] },
  { id: '1-2', x: 1, y: 2, roomId: 'vestiaire' },
  { id: '0-3', x: 0, y: 3, roomId: 'vestiaire' },
  { id: '1-3', x: 1, y: 3, roomId: 'vestiaire', decor: ['chair'] },
  // Archives
  { id: '2-2', x: 2, y: 2, roomId: 'archives', decor: ['coffee-machine'] },
  { id: '3-2', x: 3, y: 2, roomId: 'archives' },
  { id: '2-3', x: 2, y: 3, roomId: 'archives' },
  { id: '3-3', x: 3, y: 3, roomId: 'archives' },
  { id: '4-3', x: 4, y: 3, roomId: 'archives' },
  { id: '5-3', x: 5, y: 3, roomId: 'archives', decor: ['window'] },
]

export const commissariatCase: CaseDef = {
  id: 'commissariat',
  titleKey: 'commissariat.title',
  flavorTextKey: 'commissariat.flavorText',
  difficulty: 3,
  hintsAllowed: 3,
  grid,
  rooms: [
    { id: 'accueil', nameKey: 'commissariat.rooms.accueil' },
    { id: 'bureau-chef', nameKey: 'commissariat.rooms.bureau-chef' },
    { id: 'salle-interrogatoire', nameKey: 'commissariat.rooms.salle-interrogatoire' },
    { id: 'vestiaire', nameKey: 'commissariat.rooms.vestiaire' },
    { id: 'archives', nameKey: 'commissariat.rooms.archives' },
  ],
  characters: [
    {
      id: 'gerard',
      nameKey: 'commissariat.characters.gerard',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'filing-cabinet' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'sabine',
      nameKey: 'commissariat.characters.sabine',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'computer' }],
    },
    {
      id: 'farouk',
      nameKey: 'commissariat.characters.farouk',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'plant' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'alice',
      nameKey: 'commissariat.characters.alice',
      avatarColor: '#db2777',
      clues: [
        { type: 'inRoom', roomId: 'accueil' },
        { type: 'relativeTo', target: 'farouk', direction: 'S' },
      ],
    },
    {
      id: 'marion',
      nameKey: 'commissariat.characters.marion',
      avatarColor: '#16a34a',
      clues: [
        { type: 'adjacentToDecor', decor: 'locker' },
        { type: 'relativeTo', target: 'farouk', direction: 'S' },
      ],
    },
    {
      id: 'renaud',
      nameKey: 'commissariat.characters.renaud',
      avatarColor: '#ca8a04',
      clues: [
        { type: 'adjacentToDecor', decor: 'handcuffs' },
        { type: 'relativeTo', target: 'gerard', direction: 'E' },
      ],
    },
    {
      id: 'chantal',
      nameKey: 'commissariat.characters.chantal',
      avatarColor: '#2563eb',
      clues: [
        { type: 'inRoom', roomId: 'salle-interrogatoire' },
        { type: 'relativeTo', target: 'renaud', direction: 'S' },
      ],
    },
    {
      id: 'brigitte',
      nameKey: 'commissariat.characters.brigitte',
      avatarColor: '#0d9488',
      clues: [
        { type: 'adjacentToDecor', decor: 'radio' },
        { type: 'relativeTo', target: 'chantal', direction: 'S' },
      ],
    },
    {
      id: 'vincent',
      nameKey: 'commissariat.characters.vincent',
      avatarColor: '#ea580c',
      clues: [
        { type: 'adjacentToDecor', decor: 'coffee-machine' },
        { type: 'relativeTo', target: 'gerard', direction: 'S' },
      ],
    },
    {
      id: 'denis',
      nameKey: 'commissariat.characters.denis',
      avatarColor: '#65a30d',
      clues: [
        { type: 'adjacentToDecor', decor: 'window' },
        { type: 'notAlone' },
      ],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'gerard',
  murdererId: 'sabine',
  solution: {
    gerard: '3-0',
    sabine: '2-1',
    farouk: '1-0',
    alice: '1-1',
    marion: '1-2',
    renaud: '4-0',
    chantal: '4-1',
    brigitte: '4-2',
    vincent: '3-2',
    denis: '4-3',
  },
}
