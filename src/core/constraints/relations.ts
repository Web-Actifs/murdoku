import { cellKey, isDirection, unoccupiableCells } from '../model/geometry'
import type { Board, Cell, Puzzle } from '../model/types'
import type { Constraint } from './types'

const RELATIONAL_TYPES = new Set(['withPerson', 'direction', 'distance'])

/** A person-to-person clue with its `not` wrapper, if any, already peeled off. */
export interface Relation {
  inner: Extract<Constraint, { other: string }>
  negated: boolean
}

/**
 * Reads a constraint as a relation between two people, whether it is stated
 * plainly or denied. Null for everything else: static-domain clues (a fixed set
 * of cells, so `staticDomainForConstraint` answers them), alone/notAlone and
 * their denials (statements about a zone's occupancy rather than about one
 * person's position), and any nesting the vocabulary never produces, such as a
 * doubled `not`.
 */
export function asRelation(constraint: Constraint): Relation | null {
  const negated = constraint.type === 'not'
  const inner = negated ? constraint.of : constraint
  if (!RELATIONAL_TYPES.has(inner.type)) return null
  return { inner: inner as Relation['inner'], negated }
}

/**
 * `distance` is measured from the *other* person outwards — `other - me === exact`
 * — which is the one asymmetry in this vocabulary, and the reason mirroring a
 * clue flips the sign rather than copying it.
 */
export function relationHolds(relation: Relation['inner'], myCell: Cell, otherCell: Cell): boolean {
  switch (relation.type) {
    case 'withPerson':
      return myCell.zoneId === otherCell.zoneId
    case 'direction':
      return isDirection(myCell, otherCell, relation.dir)
    case 'distance': {
      const diff = relation.axis === 'row' ? otherCell.row - myCell.row : otherCell.col - myCell.col
      return diff === relation.exact
    }
  }
}

/** The relation as the witness actually states it — denial folded in, so `not` is not a special case downstream. */
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
 * Decided by evaluation rather than by pattern-matching the pairs the vocabulary
 * happens to contain today (`col +n` against `col -n`, `N` against `S`,
 * `withPerson` against itself, and each of those denied): the two statements are
 * compared over every placement of the two people the board actually permits,
 * and count as mirrors only when no legal configuration could ever tell them
 * apart. A new relational clue kind is then covered the day it is added, with
 * nothing here to update.
 *
 * Pairs sharing a row or a column are skipped: §2 rules them out entirely, so
 * two statements that differ only there differ only on configurations the player
 * will never be shown.
 */
export function isMirrorOf(a: Relation, b: Relation, board: Board): boolean {
  const cells = liveCells(board)

  for (const mine of cells) {
    for (const theirs of cells) {
      if (mine.row === theirs.row || mine.col === theirs.col) continue
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
 * clue on the board carries its own information.
 *
 * Why this is a defect and not a harmless duplicate: the engine only ever
 * narrows the domain of the person a clue is written on (see `relationalFilter`),
 * so stating a relation from both sides genuinely makes both sides load-bearing
 * — pruning cannot drop either, and a minimal clue set can still contain the
 * pair. Mechanically sound, and unreadable: the roster then shows "Victoire was
 * exactly 2 columns left of Pascal" beside "Pascal was exactly 2 columns right
 * of Victoire", and the player re-reads two cards to learn one fact.
 *
 * Hiding one side at render time would be worse than leaving both: the hidden
 * clue is doing real work, so the player would be shown a dossier that no longer
 * determines the solution. The pair has to be refused while the case is still
 * being built, which is what this is for.
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
