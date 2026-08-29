import type { DecorType } from '../../engine/types'

/**
 * V2 scene-object types drawn with an existing plan icon. Types with no faithful
 * icon (a vat, a catwalk, a helm station) are deliberately absent: the plan falls
 * back to the object's own name in small caps rather than to a near-enough
 * picture that would misdescribe the scene.
 */
const ICON_BY_OBJECT_TYPE: Record<string, DecorType> = {
  window: 'window',
  volet: 'window',
  table: 'table',
  tableBasse: 'table',
  banquette: 'sofa',
  couchette: 'deckchair',
  lit: 'deckchair',
  banc: 'bench',
  tabouret: 'chair',
  strapontin: 'chair',
  plante: 'plant',
  malle: 'suitcase',
  samovar: 'coffee-machine',
  fourneau: 'fireplace',
  poele: 'fireplace',
  barrique: 'crate',
}

export function iconForObjectType(type: string): DecorType | undefined {
  return ICON_BY_OBJECT_TYPE[type]
}
