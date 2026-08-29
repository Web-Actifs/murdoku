export type HintLevel = 1 | 2 | 3 | 4 | 5

/** personId -> cell key, with holes: the player's grid mid-investigation. */
export type PlayerAssignment = Record<string, string | undefined>

/**
 * A hint is data, never a sentence (Claude/claude.md §31): the engine names an
 * i18n key and its interpolation params, the UI turns that into French, English
 * or Spanish. `person`/`by`/`other`/`confinedPerson` params carry person *ids* —
 * the caller resolves them to display names, exactly as renderClue does.
 */
export interface Hint {
  level: HintLevel
  i18nKey: string
  params: Record<string, string | number>
  /** Journal step this hint is drawn from; undefined only when nothing is left. */
  stepId?: string
  /** Cell keys the UI may highlight — empty at the levels not allowed to show them. */
  cells: string[]
  /** Level 5 only: the placement to write into the player's grid. */
  apply?: { personId: string; cell: string }
  /** True when the player's grid already reflects every step of the journal. */
  exhausted: boolean
}
