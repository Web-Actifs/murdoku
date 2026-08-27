import type { CaseDef } from '../engine/types'
import { garageCase } from './cases/garage'

export const cases: CaseDef[] = [garageCase]

export function getCaseById(id: string): CaseDef | undefined {
  return cases.find((c) => c.id === id)
}
