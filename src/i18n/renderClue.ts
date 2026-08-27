import type { ClueDef } from '../engine/types'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** Turns a structured clue into a localized sentence, e.g. "était juste à côté de l'établi." */
export function renderClueSentence(t: Translate, clue: ClueDef, caseId: string): string {
  const characterName = (id: string) => t(`cases:${caseId}.characters.${id}`)
  const roomName = (id: string) => t(`cases:${caseId}.rooms.${id}`)

  switch (clue.type) {
    case 'adjacentToDecor':
      return t('clues:adjacentToDecor', { decor: t(`decor:${clue.decor}`) })
    case 'inRoom':
      return t('clues:inRoom', { room: roomName(clue.roomId) })
    case 'inRow':
      if (clue.row === 'top') return t('clues:inRowTop')
      if (clue.row === 'bottom') return t('clues:inRowBottom')
      return t('clues:inRowN', { n: clue.row + 1 })
    case 'inColumn':
      if (clue.column === 'left') return t('clues:inColumnLeft')
      if (clue.column === 'right') return t('clues:inColumnRight')
      return t('clues:inColumnN', { n: clue.column + 1 })
    case 'relativeTo':
      return t(`clues:relativeTo${clue.direction}`, { name: characterName(clue.target) })
    case 'adjacentToCharacter':
      return t('clues:adjacentToCharacter', { name: characterName(clue.target) })
    case 'alone':
      return t('clues:alone')
    case 'notAlone':
      return t('clues:notAlone')
  }
}

export function renderClues(t: Translate, clues: ClueDef[], caseId: string): string {
  return clues.map((clue) => renderClueSentence(t, clue, caseId)).join(' ')
}
