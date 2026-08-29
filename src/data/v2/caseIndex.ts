import type { PuzzleDef } from '../../core/model/types'
import { transalpinDef } from './la-nuit-du-transalpin'
import { valmorinDef } from './le-chai-de-valmorin'
import { phareDef } from './le-phare-des-aiguilles'
import { cormoranDef } from './premier-cas'

/** Authoring order is also the intended play order: each case leans on the last one's techniques. */
export const v2Cases: PuzzleDef[] = [cormoranDef, valmorinDef, transalpinDef, phareDef]

export function getV2CaseById(id: string): PuzzleDef | undefined {
  return v2Cases.find((c) => c.id === id)
}
