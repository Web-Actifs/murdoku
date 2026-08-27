export type Direction = 'N' | 'S' | 'E' | 'W'

export type DecorType =
  | 'plant'
  | 'chair'
  | 'sofa'
  | 'tv'
  | 'tool-bench'
  | 'toolbox'
  | 'car'
  | 'tire-stack'
  | 'speaker'
  | 'window'
  | 'table'
  | 'locker'
  | 'punching-bag'
  | 'dumbbell'
  | 'trophy'

export interface GridCell {
  id: string
  x: number
  y: number
  roomId: string
  decor?: DecorType[]
}

export interface RoomDef {
  id: string
  nameKey: string
}

export type ClueDef =
  | { type: 'relativeTo'; target: string; direction: Direction }
  | { type: 'adjacentToDecor'; decor: DecorType }
  | { type: 'adjacentToCharacter'; target: string }
  | { type: 'inRoom'; roomId: string }
  | { type: 'inRow'; row: 'top' | 'bottom' | number }
  | { type: 'inColumn'; column: 'left' | 'right' | number }
  | { type: 'alone' }
  | { type: 'notAlone' }

/** Facts about the whole scene rather than one character — e.g. "no room was empty". */
export type GlobalConstraintDef = { type: 'noRoomEmpty' }

export interface CharacterDef {
  id: string
  nameKey: string
  avatarColor: string
  /** All clues must hold at once (AND) — a character can have one fact or several, like the paper original. */
  clues: ClueDef[]
  isVictim?: boolean
}

export interface CaseDef {
  id: string
  titleKey: string
  flavorTextKey?: string
  grid: GridCell[]
  rooms: RoomDef[]
  characters: CharacterDef[]
  globalConstraints?: GlobalConstraintDef[]
  victimId: string
  murdererId: string
  solution: Record<string, string>
}

export type Assignment = Record<string, string>
