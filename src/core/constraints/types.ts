export type Direction = 'N' | 'S' | 'E' | 'W'

/**
 * Every clue phrase becomes one of these — never free text (see Claude/claude.md §52).
 *
 * There is deliberately no person-to-person "adjacentTo": two orthogonally
 * touching cells always share either a row or a column (that's what orthogonal
 * means), and §2 forbids any two people from sharing either, anywhere on the
 * board. So two *people* can never be adjacent under this ruleset — only
 * `withPerson` ("avec", same zone, no adjacency required) makes sense between
 * people. `adjacentToObjectType` stays valid because objects aren't subject to
 * the row/column rule.
 */
export type Constraint =
  | { type: 'inZone'; zoneId: string }
  /** Same grid-wide union-by-type domain as `adjacentToObjectType` below — same gotcha. */
  | { type: 'onObjectType'; objectType: string }
  /**
   * Domain is the union over *every* object of this type on the board
   * (Claude/claude.md §50 — never pick one arbitrarily), grid-wide, not scoped
   * to the subject's own zone. Two objects of the same type in different rooms
   * silently widens everyone's domain across both — pair with `inZone` to
   * disambiguate. Same gotcha V1 hit with `adjacentToDecor` (see the
   * project-murdoku-engine-gotchas memory), inherent to the union-by-type
   * design, not a bug to fix here.
   */
  | { type: 'adjacentToObjectType'; objectType: string }
  /**
   * Claude/claude.md §10/§52's dedicated window relation ("devant une
   * fenêtre"), distinct from `adjacentToObjectType` ("à côté de", a
   * *different*, neighbouring cell — §5/§19/§20 apply that rule uniformly to
   * every object type, windows included, and it is not a special case). This
   * one designates the window's *own* occupiable cell(s) — the floor a person
   * stands on to look out — same domain shape as `onObjectType`, but kept as
   * its own type rather than reused, because "on a window" narrates nothing
   * a player would ever say, and because §10 leaves room for a window's
   * facing cells to one day differ from its own (a wide sill facing two
   * tiles, say) even though today they coincide.
   */
  | { type: 'inFrontOfObjectType'; objectType: string }
  | { type: 'withPerson'; other: string }
  | { type: 'direction'; other: string; dir: Direction }
  | { type: 'distance'; other: string; axis: 'row' | 'col'; exact: number }
  | { type: 'inRow'; row: 'top' | 'bottom' | number }
  | { type: 'inColumn'; column: 'left' | 'right' | number }
  | { type: 'alone'; zoneId?: string }
  | { type: 'notAlone'; zoneId?: string }
  | { type: 'not'; of: Constraint }
