import type { Constraint } from '../core/constraints/types'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** Resolves the ids a constraint carries into display strings the sentence can interpolate. */
export interface ClueNames {
  person: (id: string) => string
  zone: (id: string) => string
  objectType: (type: string) => string
}

interface Phrase {
  key: string
  params: Record<string, string | number>
  /** Set when the sentence needs a pluralized "row"/"column" noun for `count`. */
  unitKey?: string
}

/**
 * `distance` is authored from the *other* person's point of view — the engine
 * checks `other - me === exact` — so a positive row gap means the other person
 * is further down the plan, i.e. the speaker is above them. Flipping it here is
 * what keeps the sentence in the speaker's own voice, like every other clue.
 */
function distancePhrase(axis: 'row' | 'col', exact: number, name: string): Phrase {
  if (exact === 0) return { key: axis === 'row' ? 'sameRow' : 'sameCol', params: { name } }
  const direction = axis === 'row' ? (exact > 0 ? 'Above' : 'Below') : exact > 0 ? 'Left' : 'Right'
  return { key: `distance${direction}`, params: { count: Math.abs(exact), name }, unitKey: `clue.unit.${axis}` }
}

function phraseOf(constraint: Constraint, names: ClueNames): Phrase {
  switch (constraint.type) {
    case 'inZone':
      return { key: 'inZone', params: { zone: names.zone(constraint.zoneId) } }
    case 'onObjectType':
      return { key: 'onObject', params: { object: names.objectType(constraint.objectType) } }
    case 'inFrontOfObjectType':
      return { key: 'inFrontOfObject', params: { object: names.objectType(constraint.objectType) } }
    case 'adjacentToObjectType':
      return { key: 'adjacentToObject', params: { object: names.objectType(constraint.objectType) } }
    case 'withPerson':
      return { key: 'withPerson', params: { name: names.person(constraint.other) } }
    case 'direction':
      return { key: `direction${constraint.dir}`, params: { name: names.person(constraint.other) } }
    case 'distance':
      return distancePhrase(constraint.axis, constraint.exact, names.person(constraint.other))
    case 'inRow':
      if (constraint.row === 'top') return { key: 'rowTop', params: {} }
      if (constraint.row === 'bottom') return { key: 'rowBottom', params: {} }
      return { key: 'rowN', params: { n: constraint.row + 1 } }
    case 'inColumn':
      if (constraint.column === 'left') return { key: 'colLeft', params: {} }
      if (constraint.column === 'right') return { key: 'colRight', params: {} }
      return { key: 'colN', params: { n: constraint.column + 1 } }
    case 'alone':
      return constraint.zoneId ? { key: 'aloneInZone', params: { zone: names.zone(constraint.zoneId) } } : { key: 'alone', params: {} }
    case 'notAlone':
      return constraint.zoneId ? { key: 'notAloneInZone', params: { zone: names.zone(constraint.zoneId) } } : { key: 'notAlone', params: {} }
    case 'not':
      return phraseOf(constraint.of, names)
  }
}

/** Unwraps nested `not`s, so a double negation reads as the plain statement again. */
function polarityOf(constraint: Constraint): boolean {
  let affirmative = true
  let current = constraint
  while (current.type === 'not') {
    affirmative = !affirmative
    current = current.of
  }
  return affirmative
}

/**
 * Turns one authored constraint into a localized sentence in the suspect's own
 * voice, e.g. "était juste à côté d'une fenêtre." The engine's own `hint.*` copy
 * describes *deductions*; this describes the raw testimony the player starts from.
 */
export function renderV2Clue(t: Translate, constraint: Constraint, names: ClueNames): string {
  const phrase = phraseOf(constraint, names)
  const params: Record<string, string | number> = { ...phrase.params }
  if (phrase.unitKey) params.unit = t(phrase.unitKey, { count: Number(phrase.params.count) })
  return t(`clue.${polarityOf(constraint) ? 'is' : 'no'}.${phrase.key}`, params)
}

export function renderV2Clues(t: Translate, constraints: Constraint[], names: ClueNames): string[] {
  return constraints.map((constraint) => renderV2Clue(t, constraint, names))
}
