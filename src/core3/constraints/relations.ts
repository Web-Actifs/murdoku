import { cellKey, isDirection, mayCoexist, sameShaft, unoccupiableCells } from '../model/geometry'
import type { Board, Cell, Puzzle } from '../model/types'
import type { Constraint } from './types'

const RELATIONAL_TYPES = new Set(['withPerson', 'direction', 'distance', 'above', 'below', 'sameShaft'])

/** A person-to-person clue with its `not` wrapper, if any, already peeled off. */
export interface Relation {
  inner: Extract<Constraint, { other: string }>
  negated: boolean
}

/**
 * Reads a constraint as a relation between two people, plain or denied. Null for
 * everything else: static-domain clues (a fixed set of cells, answered by
 * `staticDomainForConstraint`), `alone`/`notAlone` and their denials (statements
 * about a volume's occupancy, not about one person's position), and any nesting
 * the vocabulary never produces, such as a doubled `not`.
 */
export function asRelation(constraint: Constraint): Relation | null {
  const negated = constraint.type === 'not'
  const inner = negated ? constraint.of : constraint
  if (!RELATIONAL_TYPES.has(inner.type)) return null
  return { inner: inner as Relation['inner'], negated }
}

/**
 * `distance` is measured from the *other* person outwards — `other - me ===
 * exact` — on all three axes, which is the one asymmetry in this vocabulary and
 * the reason mirroring a clue flips the sign.
 *
 * `above`/`below` are not directions with a floor bolted on: they carry a
 * same-shaft requirement (identical row *and* column), which is what makes them
 * the strongest clue in the game and, at `exact: 1`, the person-to-person
 * adjacency the flat ruleset cannot express.
 */
export function relationHolds(relation: Relation['inner'], myCell: Cell, otherCell: Cell): boolean {
  switch (relation.type) {
    case 'withPerson':
      return myCell.zoneId === otherCell.zoneId
    case 'direction':
      return isDirection(myCell, otherCell, relation.dir)
    case 'distance': {
      const diff =
        relation.axis === 'row'
          ? otherCell.row - myCell.row
          : relation.axis === 'col'
            ? otherCell.col - myCell.col
            : otherCell.floor - myCell.floor
      return diff === relation.exact
    }
    case 'above': {
      if (!sameShaft(myCell, otherCell)) return false
      const gap = myCell.floor - otherCell.floor
      return relation.exact === undefined ? gap > 0 : gap === relation.exact
    }
    case 'below': {
      if (!sameShaft(myCell, otherCell)) return false
      const gap = otherCell.floor - myCell.floor
      return relation.exact === undefined ? gap > 0 : gap === relation.exact
    }
    case 'sameShaft':
      return sameShaft(myCell, otherCell) && myCell.floor !== otherCell.floor
  }
}

/** The relation as the witness states it — denial folded in, so `not` is not a special case downstream. */
function statedOf(relation: Relation, myCell: Cell, otherCell: Cell): boolean {
  return relationHolds(relation.inner, myCell, otherCell) !== relation.negated
}

/** Cells a person could actually stand on — a difference nobody can occupy is a difference nobody can read. */
function liveCells(board: Board): Cell[] {
  const blocked = unoccupiableCells(board)
  return board.cells.filter((cell) => !blocked.has(cellKey(cell)))
}

/**
 * Do two clues — one carried by A about B, one carried by B about A — say the
 * very same thing?
 *
 * Decided by evaluation over every placement the building actually permits,
 * rather than by pattern-matching the pairs the vocabulary happens to contain
 * (`col +n` against `col -n`, `N` against `S`, `above` against `below`,
 * `sameShaft` against itself, and each of those denied). A new relational kind
 * is covered the day it is added, with nothing here to update.
 *
 * Pairs that could not coexist are skipped: §2 rules them out on the same level,
 * so two statements differing only there differ only on configurations the
 * player will never be shown.
 */
export function isMirrorOf(a: Relation, b: Relation, board: Board): boolean {
  const cells = liveCells(board)

  for (const mine of cells) {
    for (const theirs of cells) {
      if (!mayCoexist(mine, theirs) || cellKey(mine) === cellKey(theirs)) continue
      if (statedOf(a, mine, theirs) !== statedOf(b, theirs, mine)) return false
    }
  }
  return true
}

export interface MirroredTestimony {
  personId: string
  otherId: string
  constraint: Constraint
  otherConstraint: Constraint
}

/**
 * The first pair of witnesses caught repeating each other, or null when every
 * clue carries its own information. Stating a relation from both sides is
 * mechanically sound and unreadable: propagation only narrows the domain of the
 * person a clue is written on, so both sides stay load-bearing and survive
 * pruning, and the player re-reads two cards to learn one fact.
 */
export function findMirroredTestimony(puzzle: Puzzle): MirroredTestimony | null {
  const { board, people } = puzzle

  for (const person of people) {
    for (const constraint of person.constraints) {
      const mine = asRelation(constraint)
      if (!mine) continue

      const other = people.find((p) => p.id === mine.inner.other)
      if (!other) continue

      for (const otherConstraint of other.constraints) {
        const theirs = asRelation(otherConstraint)
        if (!theirs || theirs.inner.other !== person.id) continue
        if (isMirrorOf(mine, theirs, board)) {
          return { personId: person.id, otherId: other.id, constraint, otherConstraint }
        }
      }
    }
  }
  return null
}
