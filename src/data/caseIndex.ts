import type { CaseDef } from '../engine/types'
import { boxeCase } from './cases/boxe'
import { garageCase } from './cases/garage'

export const cases: CaseDef[] = [garageCase, boxeCase]

export function getCaseById(id: string): CaseDef | undefined {
  return cases.find((c) => c.id === id)
}
