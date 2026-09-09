export type Direction = 'N' | 'S' | 'E' | 'W'

/** `floor` joins the two flat axes — see `distance` below. */
export type Axis = 'row' | 'col' | 'floor'

/**
 * V2's vocabulary plus everything the vertical axis makes sayable. Every clue
 * phrase becomes one of these — never free text (Claude/claude.md §52).
 *
 * What V2 could not express, and why:
 *
 * - **Person-to-person adjacency.** V2 has none, and cannot: two orthogonally
 *   touching cells always share a row or a column, which §2 forbids between any
 *   two people. Stack them instead — same row, same column, one floor apart —
 *   and nothing is violated, because V3 applies §2 *per floor*. `above` with
 *   `exact: 1` is therefore the adjacency clue the flat game is missing:
 *   "Hortense était juste au-dessus de Léon."
 *
 * - **Sharing a row.** `distance` with `exact: 0` is rejected outright in V2 for
 *   the same reason. Here it is not only legal but informative: it says the two
 *   people were on the same row *and therefore on different floors*, without
 *   saying which.
 *
 * The object-relation gotcha is inherited unchanged: `onObjectType` and
 * `adjacentToObjectType` take the union over *every* object of that type in the
 * whole building (§50 — never pick one arbitrarily), which now spans floors as
 * well as rooms. Two tables on two levels widen the domain across both; pair
 * with `inZone` or `onFloor` to disambiguate.
 */
export type Constraint =
  /** The *volume*, so this follows a room across floors and across a discovered link. */
  | { type: 'inZone'; zoneId: string }
  /** New in V3: "elle n'a pas quitté le rez-de-chaussée". */
  | { type: 'onFloor'; floor: number }
  | { type: 'onObjectType'; objectType: string }
  | { type: 'adjacentToObjectType'; objectType: string }
  | { type: 'inFrontOfObjectType'; objectType: string }
  | { type: 'withPerson'; other: string }
  /**
   * Compass only, and floor-blind: north is north on every level (§21). The
   * vertical relation is `above`/`below`, deliberately not a fifth direction —
   * they carry a same-shaft requirement no compass direction has.
   */
  | { type: 'direction'; other: string; dir: Direction }
  /**
   * Measured from the *other* person outwards: `other - me === exact`, V2's
   * convention kept so mirroring a clue still flips the sign. `axis: 'floor'`
   * with `exact: 0` means "on the same level", which is a perfectly ordinary
   * statement here.
   */
  | { type: 'distance'; other: string; axis: Axis; exact: number }
  /**
   * Same row *and* same column as `other`, strictly higher up. `exact` pins the
   * number of levels; without it, any number of them. The subject is above.
   */
  | { type: 'above'; other: string; exact?: number }
  /** The mirror of `above`, kept for authoring: a witness says what they heard from below. */
  | { type: 'below'; other: string; exact?: number }
  /** Same row and column, either way round — one of them is over the other. */
  | { type: 'sameShaft'; other: string }
  | { type: 'inRow'; row: 'top' | 'bottom' | number }
  | { type: 'inColumn'; column: 'left' | 'right' | number }
  | { type: 'alone'; zoneId?: string }
  | { type: 'notAlone'; zoneId?: string }
  | { type: 'not'; of: Constraint }
