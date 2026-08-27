import type { CaseDef } from '../engine/types'
import { aeroportCase } from './cases/aeroport'
import { boxeCase } from './cases/boxe'
import { casinoCase } from './cases/casino'
import { cirqueCase } from './cases/cirque'
import { commissariatCase } from './cases/commissariat'
import { garageCase } from './cases/garage'
import { manoirCase } from './cases/manoir'
import { museeCase } from './cases/musee'
import { plageCase } from './cases/plage'
import { theatreCase } from './cases/theatre'

export const cases: CaseDef[] = [
  garageCase,
  boxeCase,
  plageCase,
  aeroportCase,
  commissariatCase,
  museeCase,
  casinoCase,
  cirqueCase,
  theatreCase,
  manoirCase,
]

export function getCaseById(id: string): CaseDef | undefined {
  return cases.find((c) => c.id === id)
}
