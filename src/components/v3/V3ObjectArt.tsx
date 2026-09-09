import type { SceneObject as SceneObject2 } from '../../core/model/types'
import type { SceneObject } from '../../core3/model/types'
import { V2ObjectArt } from '../v2/V2ObjectArt'

/**
 * V3's furniture is drawn by V2's illustrator.
 *
 * The drawings are the expensive part and none of them care about floors, so
 * rather than redraw twelve pieces this maps each V3 object type onto the nearest
 * thing V2 already knows how to draw, and hands it a flattened copy of the cells.
 * An unmapped type falls through to V2's own crate-like generic, which is a
 * perfectly honest way to say "a piece of furniture".
 *
 * The staircase is the one that has to be handled here rather than by an alias:
 * it is a single object across two levels, so a caller must pass only the cells
 * of the level being drawn — hence `cellsOnFloor`.
 */
const ALIAS: Record<string, string> = {
  tapis: 'tapis',
  lit: 'lit',
  window: 'window',
  fourneau: 'fourneau',
  evier: 'lavabo',
  chaudiere: 'generatrice',
  cheminee: 'poele',
  casier: 'comptoir',
  armoire: 'malle',
  escalier: 'passerelle',
  portemanteau: 'plante',
  lucarne: 'volet',
}

/** The object's cells on one level, re-based to plain row/col — V2's art has no floors. */
export function cellsOnFloor(object: SceneObject, floor: number): { row: number; col: number }[] {
  return object.cells.filter((c) => c.floor === floor).map(({ row, col }) => ({ row, col }))
}

export function V3ObjectArt({ object, floor, className }: { object: SceneObject; floor: number; className?: string }) {
  const cells = cellsOnFloor(object, floor)
  if (cells.length === 0) return null

  const shim: SceneObject2 = {
    id: object.id,
    type: ALIAS[object.type] ?? object.type,
    occupiable: object.occupiable,
    cells,
  }
  return <V2ObjectArt object={shim} className={className} />
}
