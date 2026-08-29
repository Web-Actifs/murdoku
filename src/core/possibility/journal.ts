/** Player-facing difficulty of a deduction — drives which hint levels can use it. */
export type Tier = 'basic' | 'intermediate' | 'advanced' | 'expert'

export type Technique =
  | 'rowColElimination'
  | 'lockedCandidates'
  | 'relationalFilter'
  /**
   * The negated form of a relation. Kept apart from `relationalFilter` because it
   * is a different move to make at the table: instead of "some position of the
   * partner still fits my clue", the player has to check that *every* remaining
   * position of the partner would force the relation — and so make the denial
   * impossible. Counting it separately also lets difficulty see the two as
   * distinct skills rather than one.
   */
  | 'relationalExclusion'
  /** `alone`: one person's zone, closed to everyone else — in both directions. */
  | 'zoneExclusivity'
  /** `notAlone`: a zone with nobody left to share it is no place for the subject. */
  | 'zoneCompany'
  | 'nakedSingle'

export type Reason =
  | { type: 'rowTaken'; by: string; row: number }
  | { type: 'colTaken'; by: string; col: number }
  | { type: 'confinedToRow'; confinedPerson: string; row: number }
  | { type: 'confinedToCol'; confinedPerson: string; col: number }
  /**
   * `constraintType` is the *inner* relation even when negated, so a consumer
   * never has to unwrap a clue to know which relation is at stake; `negated`
   * flips the sentence, and is left off entirely for the positive form.
   */
  | { type: 'relational'; constraintType: string; other: string; negated?: true }
  /** The subject wanted to be alone there, but `by` is already committed to that zone. */
  | { type: 'zoneTaken'; by: string; zoneId: string }
  /** `by` claims that zone for themselves alone, so the subject must stay out of it. */
  | { type: 'zoneClaimedAlone'; by: string; zoneId: string }
  /** The subject refuses to have been alone, and nobody else could have been there. */
  | { type: 'zoneNeedsCompany'; zoneId: string }
  | { type: 'onlyOptionLeft' }

/**
 * One propagation step, structured so it can drive the solver, a difficulty
 * analyzer, and human-readable hints from the same data (Claude/claude.md §30-31)
 * — never free text assembled ad hoc.
 */
export interface DeductionStep {
  id: string
  technique: Technique
  tier: Tier
  /** Whose candidate set changed. */
  personId: string
  /** personId's full candidate set right before this step (Claude/claude.md §30). */
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
