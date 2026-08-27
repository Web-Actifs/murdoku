import type { CaseDef, GridCell } from '../../engine/types'

const grid: GridCell[] = [
  // Entrée
  { id: '0-0', x: 0, y: 0, roomId: 'entree', decor: ['spotlight'] },
  { id: '1-0', x: 1, y: 0, roomId: 'entree' },
  { id: '0-1', x: 0, y: 1, roomId: 'entree' },
  { id: '1-1', x: 1, y: 1, roomId: 'entree', decor: ['suitcase'] },
  // Régie
  { id: '2-0', x: 2, y: 0, roomId: 'regie', decor: ['chair'] },
  { id: '3-0', x: 3, y: 0, roomId: 'regie' },
  { id: '2-1', x: 2, y: 1, roomId: 'regie' },
  { id: '3-1', x: 3, y: 1, roomId: 'regie', decor: ['computer'] },
  // Piste
  { id: '4-0', x: 4, y: 0, roomId: 'piste' },
  { id: '5-0', x: 5, y: 0, roomId: 'piste', decor: ['trapeze'] },
  { id: '4-1', x: 4, y: 1, roomId: 'piste' },
  { id: '5-1', x: 5, y: 1, roomId: 'piste' },
  { id: '4-2', x: 4, y: 2, roomId: 'piste', decor: ['bench'] },
  { id: '5-2', x: 5, y: 2, roomId: 'piste' },
  // Loges
  { id: '0-2', x: 0, y: 2, roomId: 'loges', decor: ['mirror'] },
  { id: '1-2', x: 1, y: 2, roomId: 'loges' },
  { id: '0-3', x: 0, y: 3, roomId: 'loges' },
  { id: '1-3', x: 1, y: 3, roomId: 'loges', decor: ['clothes-rack'] },
  // Ménagerie
  { id: '2-2', x: 2, y: 2, roomId: 'menagerie', decor: ['cage'] },
  { id: '3-2', x: 3, y: 2, roomId: 'menagerie' },
  { id: '2-3', x: 2, y: 3, roomId: 'menagerie' },
  { id: '3-3', x: 3, y: 3, roomId: 'menagerie' },
  { id: '4-3', x: 4, y: 3, roomId: 'menagerie' },
  { id: '5-3', x: 5, y: 3, roomId: 'menagerie', decor: ['crate'] },
]

export const cirqueCase: CaseDef = {
  id: 'cirque',
  titleKey: 'cirque.title',
  flavorTextKey: 'cirque.flavorText',
  difficulty: 5,
  hintsAllowed: 4,
  grid,
  rooms: [
    { id: 'entree', nameKey: 'cirque.rooms.entree' },
    { id: 'regie', nameKey: 'cirque.rooms.regie' },
    { id: 'piste', nameKey: 'cirque.rooms.piste' },
    { id: 'loges', nameKey: 'cirque.rooms.loges' },
    { id: 'menagerie', nameKey: 'cirque.rooms.menagerie' },
  ],
  characters: [
    {
      id: 'maurice',
      nameKey: 'cirque.characters.maurice',
      avatarColor: '#b91c1c',
      isVictim: true,
      clues: [
        { type: 'adjacentToDecor', decor: 'chair' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'sylviane',
      nameKey: 'cirque.characters.sylviane',
      avatarColor: '#7c3aed',
      clues: [{ type: 'adjacentToDecor', decor: 'computer' }],
    },
    {
      id: 'ludo',
      nameKey: 'cirque.characters.ludo',
      avatarColor: '#0891b2',
      clues: [
        { type: 'adjacentToDecor', decor: 'spotlight' },
        { type: 'inRow', row: 'top' },
      ],
    },
    {
      id: 'fanny',
      nameKey: 'cirque.characters.fanny',
      avatarColor: '#db2777',
      clues: [{ type: 'adjacentToDecor', decor: 'suitcase' }],
    },
    {
      id: 'gaston',
      nameKey: 'cirque.characters.gaston',
      avatarColor: '#ca8a04',
      clues: [
        { type: 'adjacentToDecor', decor: 'trapeze' },
        { type: 'relativeTo', target: 'maurice', direction: 'E' },
      ],
    },
    {
      id: 'odette',
      nameKey: 'cirque.characters.odette',
      avatarColor: '#16a34a',
      clues: [
        { type: 'inRoom', roomId: 'piste' },
        { type: 'inRow', row: 1 },
        { type: 'adjacentToCharacter', target: 'gaston' },
      ],
    },
    {
      id: 'regis',
      nameKey: 'cirque.characters.regis',
      avatarColor: '#2563eb',
      clues: [
        { type: 'adjacentToDecor', decor: 'mirror' },
        { type: 'relativeTo', target: 'ludo', direction: 'S' },
      ],
    },
    {
      id: 'coralie',
      nameKey: 'cirque.characters.coralie',
      avatarColor: '#0d9488',
      clues: [{ type: 'adjacentToDecor', decor: 'clothes-rack' }],
    },
    {
      id: 'bastien',
      nameKey: 'cirque.characters.bastien',
      avatarColor: '#ea580c',
      clues: [
        { type: 'adjacentToDecor', decor: 'cage' },
        { type: 'relativeTo', target: 'maurice', direction: 'S' },
      ],
    },
    {
      id: 'michele',
      nameKey: 'cirque.characters.michele',
      avatarColor: '#65a30d',
      clues: [{ type: 'adjacentToDecor', decor: 'crate' }],
    },
  ],
  globalConstraints: [{ type: 'noRoomEmpty' }],
  victimId: 'maurice',
  murdererId: 'sylviane',
  solution: {
    maurice: '3-0',
    sylviane: '2-1',
    ludo: '1-0',
    fanny: '0-1',
    gaston: '4-0',
    odette: '4-1',
    regis: '1-2',
    coralie: '0-3',
    bastien: '3-2',
    michele: '4-3',
  },
}
