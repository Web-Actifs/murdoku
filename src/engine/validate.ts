import { cellById } from './grid'
import { solveCase } from './solver'
import type { CaseDef } from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Confirms a case is a well-formed puzzle: exactly one assignment satisfies every
 * clue, it matches the authored solution, and the authored murderer is indeed the
 * only person sharing the victim's cell's room.
 */
export function validateCase(caseDef: CaseDef): ValidationResult {
  const errors: string[] = []

  const characterIds = new Set(caseDef.characters.map((c) => c.id))
  if (!characterIds.has(caseDef.victimId)) errors.push(`victimId "${caseDef.victimId}" is not a known character`)
  if (!characterIds.has(caseDef.murdererId)) errors.push(`murdererId "${caseDef.murdererId}" is not a known character`)

  for (const character of caseDef.characters) {
    if (!caseDef.solution[character.id]) errors.push(`No authored solution cell for character "${character.id}"`)
  }

  if (errors.length > 0) return { valid: false, errors }

  const solutions = solveCase(caseDef, { limit: 2 })

  if (solutions.length === 0) {
    errors.push('No assignment satisfies every clue — the case is unsolvable as authored.')
  } else if (solutions.length > 1) {
    errors.push('More than one assignment satisfies every clue — the case is ambiguous.')
  } else {
    const [found] = solutions
    for (const character of caseDef.characters) {
      if (found[character.id] !== caseDef.solution[character.id]) {
        errors.push(
          `Authored solution disagrees with the unique solved placement for "${character.id}": authored ${caseDef.solution[character.id]}, solved ${found[character.id]}`,
        )
      }
    }
  }

  const victimCellId = caseDef.solution[caseDef.victimId]
  if (victimCellId) {
    const victimRoomId = cellById(caseDef.grid, victimCellId).roomId
    const roommates = caseDef.characters.filter(
      (c) => c.id !== caseDef.victimId && cellById(caseDef.grid, caseDef.solution[c.id]).roomId === victimRoomId,
    )
    if (roommates.length !== 1) {
      errors.push(`Victim's room must contain exactly one other character (found ${roommates.length})`)
    } else if (roommates[0].id !== caseDef.murdererId) {
      errors.push(`Character sharing the victim's room ("${roommates[0].id}") does not match murdererId ("${caseDef.murdererId}")`)
    }
  }

  return { valid: errors.length === 0, errors }
}
