import type { Constraint } from '../core3/constraints/types'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** Resolves the ids a constraint carries into display strings the sentence can interpolate. */
export interface V3ClueNames {
  person: (id: string) => string
  /** "au salon" — with its preposition, so a sentence never has to guess the gender of a room. */
  roomIn: (id: string) => string
  /** "le rez-de-chaussée". */
  floorName: (floor: number) => string
  /** The full predicate for an object type in one of three relations — "sur le tapis de la cuisine". */
  objectPhrase: (type: string, relation: 'on' | 'near' | 'front') => string
}

interface Phrase {
  key: string
  params: Record<string, string | number>
}

/**
 * `distance` is authored from the *other* person's point of view — the engine
 * checks `other - me === exact` — so a positive row gap means the other person is
 * further down the plan, i.e. the speaker is further north. Flipping it here is
 * what keeps every sentence in the speaker's own voice.
 *
 * The `floor` axis has one case the flat axes do not: a gap of zero. On a row or
 * a column that means the two shared it and were therefore on different levels,
 * which is a real statement in V3; on the floor axis it just means "same level".
 */
function distancePhrase(axis: 'row' | 'col' | 'floor', exact: number, other: string, t: Translate): Phrase {
  if (exact === 0) {
    const key = axis === 'row' ? 'sameRow' : axis === 'col' ? 'sameCol' : 'sameFloor'
    return { key, params: { other } }
  }
  const dir =
    axis === 'row'
      ? t(exact > 0 ? 'v3:clue.dirNorth' : 'v3:clue.dirSouth')
      : axis === 'col'
        ? t(exact > 0 ? 'v3:clue.dirWest' : 'v3:clue.dirEast')
        : t(exact > 0 ? 'v3:clue.dirDown' : 'v3:clue.dirUp')
  return { key: `${axis}Gap`, params: { count: Math.abs(exact), dir, other } }
}

function phraseOf(constraint: Constraint, names: V3ClueNames, t: Translate, negated: boolean): Phrase {
  const no = negated ? 'not' : ''
  const cap = (key: string) => (negated ? `not${key[0].toUpperCase()}${key.slice(1)}` : key)

  switch (constraint.type) {
    case 'inZone':
      return { key: cap('inZone'), params: { room: names.roomIn(constraint.zoneId) } }
    case 'onFloor':
      return { key: cap('onFloor'), params: { floor: names.floorName(constraint.floor) } }
    case 'onObjectType':
      return { key: cap('onObject'), params: { phrase: names.objectPhrase(constraint.objectType, 'on') } }
    case 'adjacentToObjectType':
      return { key: cap('nearObject'), params: { phrase: names.objectPhrase(constraint.objectType, 'near') } }
    case 'inFrontOfObjectType':
      return { key: cap('frontObject'), params: { phrase: names.objectPhrase(constraint.objectType, 'front') } }
    case 'withPerson':
      return { key: cap('withPerson'), params: { other: names.person(constraint.other) } }
    case 'direction':
      return { key: `${no}direction.${constraint.dir}`, params: { other: names.person(constraint.other) } }
    case 'distance':
      // A denied exact offset has no natural French sentence of its own, so it
      // borrows the plain one and is marked as a denial by the card, not by the verb.
      return distancePhrase(constraint.axis, constraint.exact, names.person(constraint.other), t)
    case 'above':
      if (negated) return { key: 'notAbove', params: { other: names.person(constraint.other) } }
      return constraint.exact === undefined
        ? { key: 'above', params: { other: names.person(constraint.other) } }
        : { key: 'aboveExact', params: { count: constraint.exact, other: names.person(constraint.other) } }
    case 'below':
      if (negated) return { key: 'notBelow', params: { other: names.person(constraint.other) } }
      return constraint.exact === undefined
        ? { key: 'below', params: { other: names.person(constraint.other) } }
        : { key: 'belowExact', params: { count: constraint.exact, other: names.person(constraint.other) } }
    case 'sameShaft':
      return { key: cap('sameShaft'), params: { other: names.person(constraint.other) } }
    case 'inRow':
      if (constraint.row === 'top') return { key: cap('rowTop'), params: {} }
      if (constraint.row === 'bottom') return { key: cap('rowBottom'), params: {} }
      return { key: cap('rowIndex'), params: { n: constraint.row + 1 } }
    case 'inColumn':
      if (constraint.column === 'left') return { key: cap('colLeft'), params: {} }
      if (constraint.column === 'right') return { key: cap('colRight'), params: {} }
      return { key: cap('colIndex'), params: { n: constraint.column + 1 } }
    case 'alone':
      return constraint.zoneId
        ? { key: negated ? 'notAloneZone' : 'aloneZone', params: { room: names.roomIn(constraint.zoneId) } }
        : { key: negated ? 'notAlone' : 'alone', params: {} }
    case 'notAlone':
      return constraint.zoneId
        ? { key: negated ? 'aloneZone' : 'notAloneZone', params: { room: names.roomIn(constraint.zoneId) } }
        : { key: negated ? 'alone' : 'notAlone', params: {} }
    case 'not':
      return phraseOf(constraint.of, names, t, !negated)
  }
}

/**
 * One testimony, as the witness would say it. The engine never stores a
 * sentence (§52); this is the only place a `Constraint` becomes French, so a
 * clue can be re-worded, translated or re-generated without the solver noticing.
 */
export function renderV3Clue(personId: string, constraint: Constraint, names: V3ClueNames, t: Translate): string {
  const phrase = phraseOf(constraint, names, t, false)
  return t(`v3:clue.${phrase.key}`, { person: names.person(personId), ...phrase.params })
}
