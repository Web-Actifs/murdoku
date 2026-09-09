/** Player-facing difficulty of a deduction — drives which hint levels can use it. */
export type Tier = 'basic' | 'intermediate' | 'advanced' | 'expert'

export type Technique =
  | 'rowColElimination'
  | 'lockedCandidates'
  | 'relationalFilter'
  /**
   * The negated form of a relation: instead of "some position of the partner
   * still fits my clue", the player has to check that *every* remaining position
   * would force the relation, and so make the denial impossible.
   */
  | 'relationalExclusion'
  /** `alone`: one person's volume, closed to everyone else — in both directions. */
  | 'zoneExclusivity'
  /** `notAlone`: a volume with nobody left to share it is no place for the subject. */
  | 'zoneCompany'
  | 'nakedSingle'

/**
 * Every reason that eliminates on a row or a column carries the floor it happened
 * on, because in V3 that is half the statement: "la travée 3 est prise" is only
 * true of one level, and a hint that leaves the level out is not just vague, it
 * is wrong.
 */
export type Reason =
  | { type: 'rowTaken'; by: string; floor: number; row: number }
  | { type: 'colTaken'; by: string; floor: number; col: number }
  | { type: 'confinedToRow'; confinedPerson: string; floor: number; row: number }
  | { type: 'confinedToCol'; confinedPerson: string; floor: number; col: number }
  /** `constraintType` is the *inner* relation even when negated; `negated` flips the sentence. */
  | { type: 'relational'; constraintType: string; other: string; negated?: true }
  /** The subject wanted to be alone there, but `by` is already committed to that volume. */
  | { type: 'zoneTaken'; by: string; zoneId: string }
  /** `by` claims that volume for themselves alone, so the subject must stay out of it. */
  | { type: 'zoneClaimedAlone'; by: string; zoneId: string }
  /** The subject refuses to have been alone, and nobody else could have been there. */
  | { type: 'zoneNeedsCompany'; zoneId: string }
  | { type: 'onlyOptionLeft' }

/**
 * One propagation step, structured so it can drive the solver, a difficulty
 * analyzer and human-readable hints from the same data (§30-31) — never free
 * text assembled ad hoc.
 */
export interface DeductionStep {
  id: string
  technique: Technique
  tier: Tier
  /** Whose candidate set changed. */
  personId: string
  /** personId's full candidate set right before this step (§30). */
  before: string[]
  /** personId's full candidate set right after this step. */
  after: string[]
  /** Cell keys removed from personId's candidates this step. */
  removed: string[]
  /** Set when this step leaves personId with exactly one candidate. */
  placed?: string
  reason: Reason
  /** Ids of prior steps that made this one possible; empty means "from the seed". */
  premises: string[]
}
