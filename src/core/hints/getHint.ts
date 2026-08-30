import { parseCellKey } from '../model/geometry'
import type { DeductionStep, Reason } from '../possibility/journal'
import type { Hint, HintLevel, PlayerAssignment } from './types'

/** Player-facing cell name, 1-based like the plan's own coordinates. */
export function formatCell(key: string): string {
  const { row, col } = parseCellKey(key)
  return `R${row + 1}C${col + 1}`
}

function formatCells(keys: string[]): string {
  return keys.map(formatCell).join(', ')
}

/**
 * Does the player's grid already show what this step establishes?
 *
 * - A placing step is reflected once the player has that person on that cell.
 * - A pure elimination is reflected once the player has committed that person to
 *   *some* cell the step did not rule out. Committing them to a ruled-out cell
 *   leaves the step unreflected on purpose: that step is precisely the proof the
 *   player's current placement is wrong, so it is the most useful thing to say.
 *
 * The player's grid only records placements (like `Assignment` in solve/solver),
 * never pencil marks, so an elimination for a person the player hasn't placed at
 * all also counts as not yet reflected.
 */
export function isStepReflected(step: DeductionStep, player: PlayerAssignment): boolean {
  const current = player[step.personId]
  if (step.placed !== undefined) return current === step.placed
  if (current === undefined) return false
  return !step.removed.includes(current)
}

/** First step of the proof the player's grid does not yet account for. */
export function nextUnreflectedStep(journal: DeductionStep[], player: PlayerAssignment): DeductionStep | undefined {
  return journal.find((step) => !isStepReflected(step, player))
}

function axisOf(reason: Reason): { axis: 'row' | 'col'; index: number } | undefined {
  switch (reason.type) {
    case 'rowTaken':
      return { axis: 'row', index: reason.row }
    case 'confinedToRow':
      return { axis: 'row', index: reason.row }
    case 'colTaken':
      return { axis: 'col', index: reason.col }
    case 'confinedToCol':
      return { axis: 'col', index: reason.col }
    default:
      return undefined
  }
}

/**
 * Levels 1 and 4 name the technique, but one technique can fire for opposite
 * reasons — so the key carries the variant too, and the text never has to
 * interpolate "row"/"col" raw or paper over who claimed the zone.
 */
function variantSuffix(reason: Reason): string {
  const axis = axisOf(reason)
  if (axis) return axis.axis === 'row' ? 'Row' : 'Col'
  if (reason.type === 'zoneTaken') return 'Taken'
  if (reason.type === 'zoneClaimedAlone') return 'ClaimedAlone'
  return ''
}

const RELATION_KEY_PART: Record<string, string> = {
  withPerson: 'WithPerson',
  direction: 'Direction',
  distance: 'Distance',
}

/**
 * A denied relation reads nothing like the plain one ("he was with her" against
 * "wherever she is, he cannot have been with her"), so it gets its own family of
 * keys rather than a shared sentence with a negation bolted on.
 */
function reasonKeySuffix(reason: Reason): string {
  if (reason.type !== 'relational') return reason.type
  const base = reason.negated ? 'relationalNot' : 'relational'
  return base + (RELATION_KEY_PART[reason.constraintType] ?? '')
}

/** Structured "why" of a step, flattened into interpolation params. Rows and columns are 1-based. */
function reasonParams(reason: Reason): Record<string, string | number> {
  switch (reason.type) {
    case 'rowTaken':
      return { by: reason.by, row: reason.row + 1 }
    case 'colTaken':
      return { by: reason.by, col: reason.col + 1 }
    case 'confinedToRow':
      return { confinedPerson: reason.confinedPerson, row: reason.row + 1 }
    case 'confinedToCol':
      return { confinedPerson: reason.confinedPerson, col: reason.col + 1 }
    case 'relational':
      return { other: reason.other, relation: reason.constraintType }
    case 'zoneTaken':
    case 'zoneClaimedAlone':
      return { by: reason.by, zone: reason.zoneId }
    case 'zoneNeedsCompany':
      return { zone: reason.zoneId }
    case 'onlyOptionLeft':
      return {}
  }
}

const NOTHING_LEFT: Omit<Hint, 'level'> = { i18nKey: 'hint.none', params: {}, cells: [], exhausted: true }

/**
 * The reveal levels that read one single step and nothing else — so they can be
 * asked about *any* step, not only the one the player is standing in front of.
 * Level 5 is absent on purpose: placing needs the rest of the journal to look
 * ahead through eliminations, which only `getHint` has.
 */
export type StepHintLevel = 1 | 2 | 3 | 4

/**
 * One step of the proof, rendered at a given depth of reveal. Split out of
 * `getHint` so a step the player has *already* worked out can be narrated back
 * to them with the same vocabulary that would have hinted at it.
 */
export function hintForStep(step: DeductionStep, level: StepHintLevel): Hint {
  const base = { level, stepId: step.id, exhausted: false }
  const person = step.personId

  switch (level) {
    case 1: {
      const axis = axisOf(step.reason)
      return {
        ...base,
        i18nKey: `hint.l1.${step.technique}${variantSuffix(step.reason)}`,
        // Deliberately identity-free: an axis number narrows the search without
        // naming anyone, which is what a level-1 nudge is for.
        params: axis ? { index: axis.index + 1 } : {},
        cells: [],
      }
    }

    case 2:
      return {
        ...base,
        i18nKey: `hint.l2.${step.technique}`,
        // `remaining` is 1 exactly when this step closes the person down to one
        // cell; the cell itself stays hidden until level 4, or levels 2 and 5
        // would collapse into each other.
        params: step.placed !== undefined ? { person, remaining: 1 } : { person, ruledOut: step.removed.length },
        cells: [],
      }

    case 3:
      return {
        ...base,
        i18nKey: `hint.l3.${reasonKeySuffix(step.reason)}`,
        params: { person, ...reasonParams(step.reason) },
        cells: [],
      }

    case 4: {
      const cells = step.placed !== undefined ? [step.placed] : step.removed
      return {
        ...base,
        i18nKey: `hint.l4.${step.technique}${variantSuffix(step.reason)}`,
        params: {
          person,
          ...reasonParams(step.reason),
          cells: formatCells(cells),
          ...(step.placed !== undefined ? { cell: formatCell(step.placed) } : {}),
        },
        cells,
      }
    }
  }
}

/**
 * Progressive reveal over one single step of the proof (Claude/claude.md §32).
 * Nothing is recomputed: the journal produced by `propagate` is the source of
 * truth, this only decides how much of the first step the player hasn't reached
 * yet is allowed to surface.
 *
 * 1 — the technique and a vague locus, never an identity.
 * 2 — whose domain is moving, and by how much.
 * 3 — the structured reason: why those cells fall.
 * 4 — the complete deduction, cells included, still without touching the grid.
 * 5 — the placement itself, ready to apply.
 */
export function getHint(journal: DeductionStep[], player: PlayerAssignment, level: HintLevel): Hint {
  const step = nextUnreflectedStep(journal, player)
  if (!step) return { level, ...NOTHING_LEFT }

  const base = { level, stepId: step.id, exhausted: false }

  switch (level) {
    case 1:
    case 2:
    case 3:
    case 4:
      return hintForStep(step, level)

    case 5: {
      // An elimination has nothing to place, so look forward to the first
      // placement the player still owes — in practice the very next step, since
      // propagation emits a naked single the moment a domain closes.
      const target = journal
        .slice(journal.indexOf(step))
        .find((s) => s.placed !== undefined && !isStepReflected(s, player))
      if (!target) return { ...base, i18nKey: 'hint.l5.nothingToPlace', params: {}, cells: [], exhausted: false }

      const cell = target.placed!
      return {
        level,
        stepId: target.id,
        exhausted: false,
        i18nKey: 'hint.l5.place',
        params: { person: target.personId, cell: formatCell(cell) },
        cells: [cell],
        apply: { personId: target.personId, cell },
      }
    }
  }
}

/** Applies a level-5 hint to the player's grid; any other hint leaves it untouched. */
export function applyHint(player: PlayerAssignment, hint: Hint): PlayerAssignment {
  if (!hint.apply) return { ...player }
  return { ...player, [hint.apply.personId]: hint.apply.cell }
}
