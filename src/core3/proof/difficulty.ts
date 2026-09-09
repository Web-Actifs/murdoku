import type { DeductionStep, Technique, Tier } from '../possibility/journal'
import { propagate } from '../possibility/propagate'
import type { Puzzle } from '../model/types'

export type DifficultyCategory = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/**
 * A step the proof cannot do without: removing it leaves at least one person
 * with no surviving justification for their placement (Claude/claude.md §37).
 * This is the "lock" moment the player has to find before the rest of the grid
 * can follow — the thing V1 lacked, where clues resolved independently.
 */
export interface Keystone {
  stepId: string
  /** Every step invalidated when stepId goes, itself included. */
  cascade: string[]
  /** People left without a proven placement once that cascade is gone. */
  unprovenPeople: string[]
}

export interface DifficultyReport {
  deductionCount: number
  /** Highest tier the journal actually exercised — never the puzzle's advertised level. */
  tier: Tier
  /** Longest chain of dependent steps, in steps (a seed-grounded step has depth 1). */
  maxChainDepth: number
  techniqueCounts: Record<Technique, number>
  keystones: Keystone[]
  /** Keystones that take other steps down with them — the genuine articulation points. */
  articulationCount: number
  /** Size of the largest cascade; 0 when the proof has no keystone at all. */
  maxCascade: number
  score: number
  category: DifficultyCategory
}

const TIER_RANK: Record<Tier, number> = { basic: 0, intermediate: 1, advanced: 2, expert: 3 }
const TIER_ORDER: Tier[] = ['basic', 'intermediate', 'advanced', 'expert']
const TIER_CATEGORY: Record<Tier, DifficultyCategory> = {
  basic: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  expert: 'expert',
}

/**
 * Longest dependency chain ending at each step. Premises pointing at ids absent
 * from the journal are ignored rather than trusted, so a hand-built or sliced
 * journal degrades to "seed-grounded" instead of throwing.
 */
export function chainDepths(journal: DeductionStep[]): Map<string, number> {
  const byId = new Map(journal.map((step) => [step.id, step]))
  const depths = new Map<string, number>()
  const visiting = new Set<string>()

  function depthOf(id: string): number {
    const cached = depths.get(id)
    if (cached !== undefined) return cached
    const step = byId.get(id)
    if (!step) return 0
    // A cyclic premise chain would be a propagation bug; refuse to loop on it.
    if (visiting.has(id)) return 1
    visiting.add(id)

    const known = step.premises.filter((p) => byId.has(p))
    const depth = known.length === 0 ? 1 : 1 + Math.max(...known.map(depthOf))

    visiting.delete(id)
    depths.set(id, depth)
    return depth
  }

  for (const step of journal) depthOf(step.id)
  return depths
}

/**
 * Every step that loses its justification when `stepId` is withdrawn: a step
 * falls only when *all* of its known premises have fallen. A step whose premises
 * survive in part is still proven by that remaining premise, which is exactly
 * what makes redundant reasoning (two independent routes to one conclusion) show
 * up as "not a keystone".
 */
export function removalClosure(journal: DeductionStep[], stepId: string): Set<string> {
  const byId = new Map(journal.map((step) => [step.id, step]))
  const invalid = new Set<string>([stepId])

  let changed = true
  while (changed) {
    changed = false
    for (const step of journal) {
      if (invalid.has(step.id)) continue
      const known = step.premises.filter((p) => byId.has(p))
      if (known.length > 0 && known.every((p) => invalid.has(p))) {
        invalid.add(step.id)
        changed = true
      }
    }
  }
  return invalid
}

/** People whose placement is still proven once `invalid` steps are struck out. */
function provenPeople(journal: DeductionStep[], invalid: ReadonlySet<string>): Set<string> {
  const proven = new Set<string>()
  for (const step of journal) {
    if (step.placed && !invalid.has(step.id)) proven.add(step.personId)
  }
  return proven
}

/**
 * Steps whose removal breaks the proof. An empty result on a journal that does
 * place people is a real signal, not a failure: the reasoning is "flat", every
 * conclusion reachable by more than one route, so the player can solve it in any
 * order — the exact feel V2 is built to avoid.
 */
export function findKeystones(journal: DeductionStep[]): Keystone[] {
  const baseline = provenPeople(journal, new Set())
  if (baseline.size === 0) return []

  const keystones: Keystone[] = []
  for (const step of journal) {
    const cascade = removalClosure(journal, step.id)
    const surviving = provenPeople(journal, cascade)
    const unprovenPeople = [...baseline].filter((personId) => !surviving.has(personId))
    if (unprovenPeople.length > 0) {
      keystones.push({ stepId: step.id, cascade: [...cascade], unprovenPeople })
    }
  }
  return keystones
}

export function highestTier(journal: DeductionStep[]): Tier {
  let rank = 0
  for (const step of journal) rank = Math.max(rank, TIER_RANK[step.tier])
  return TIER_ORDER[rank]
}

function countTechniques(journal: DeductionStep[]): Record<Technique, number> {
  const counts: Record<Technique, number> = {
    rowColElimination: 0,
    lockedCandidates: 0,
    relationalFilter: 0,
    relationalExclusion: 0,
    zoneExclusivity: 0,
    zoneCompany: 0,
    nakedSingle: 0,
  }
  for (const step of journal) counts[step.technique] += 1
  return counts
}

/**
 * Aggregate score, 0-100. Weights are deliberately ordered so that *shape of
 * reasoning* beats *volume of reasoning* (§37): the ceiling of technique needed
 * and the length of the single thread you must follow dominate, raw step count
 * is the weakest term, and how much rides on the most load-bearing step is worth
 * more than how many steps exist. Caps keep a large-but-shallow puzzle from
 * inflating past a small-but-deep one.
 */
function scoreOf(input: {
  tier: Tier
  maxChainDepth: number
  deductionCount: number
  maxCascade: number
  articulationCount: number
  distinctTechniques: number
}): number {
  const tierWeight: Record<Tier, number> = { basic: 0, intermediate: 12, advanced: 30, expert: 45 }
  const raw =
    tierWeight[input.tier] +
    Math.min(input.maxChainDepth, 12) * 2.5 +
    Math.min(input.deductionCount, 40) * 0.4 +
    Math.min(input.maxCascade, 12) * 1.5 +
    Math.min(input.articulationCount, 10) * 1 +
    Math.max(0, input.distinctTechniques - 1) * 3
  return Math.round(Math.max(0, Math.min(100, raw)))
}

const THRESHOLDS: { max: number; category: DifficultyCategory }[] = [
  { max: 25, category: 'beginner' },
  { max: 55, category: 'intermediate' },
  { max: 78, category: 'advanced' },
]

const CATEGORY_ORDER: DifficultyCategory[] = ['beginner', 'intermediate', 'advanced', 'expert']

/**
 * Score picks a category inside a band the tier alone bounds on both sides:
 * a journal needing an advanced technique is never announced as beginner,
 * however few steps it took (§38's floor) — but a journal that only ever
 * needed, say, intermediate technique is never bought all the way to
 * "expert" purely on chain length either, one rung above tier is the most
 * score can add. Measured on generated Cormoran-shell puzzles (2026-08-29):
 * without this ceiling, long-but-only-intermediate chains routinely scored
 * "expert" alongside genuinely harder journals that actually needed more
 * advanced techniques — indistinguishable by category despite being a
 * different kind of puzzle. Revisit the ceiling width (currently +1) once
 * `propagate` grows techniques above `intermediate` and there's real
 * `advanced`/`expert`-tier data to calibrate against.
 */
function categoryOf(score: number, tier: Tier): DifficultyCategory {
  const fromScore = THRESHOLDS.find((t) => score < t.max)?.category ?? 'expert'
  const tierIndex = CATEGORY_ORDER.indexOf(TIER_CATEGORY[tier])
  const floor = tierIndex
  const ceiling = Math.min(tierIndex + 1, CATEGORY_ORDER.length - 1)
  const clamped = Math.min(Math.max(CATEGORY_ORDER.indexOf(fromScore), floor), ceiling)
  return CATEGORY_ORDER[clamped]
}

/** The analyzer proper: everything is read off the proof, nothing off the board. */
export function analyzeJournal(journal: DeductionStep[]): DifficultyReport {
  const depths = chainDepths(journal)
  const maxChainDepth = journal.length === 0 ? 0 : Math.max(...[...depths.values()])
  const keystones = findKeystones(journal)
  const cascades = keystones.map((k) => k.cascade.length)
  const maxCascade = cascades.length === 0 ? 0 : Math.max(...cascades)
  const articulationCount = keystones.filter((k) => k.cascade.length > 1).length
  const techniqueCounts = countTechniques(journal)
  const tier = highestTier(journal)
  const distinctTechniques = Object.values(techniqueCounts).filter((n) => n > 0).length

  const score = scoreOf({
    tier,
    maxChainDepth,
    deductionCount: journal.length,
    maxCascade,
    articulationCount,
    distinctTechniques,
  })

  return {
    deductionCount: journal.length,
    tier,
    maxChainDepth,
    techniqueCounts,
    keystones,
    articulationCount,
    maxCascade,
    score,
    category: categoryOf(score, tier),
  }
}

export interface PuzzleDifficulty extends DifficultyReport {
  /** 'stuck' means propagation alone can't finish it — a search-only puzzle (§36). */
  propagationStatus: 'solved' | 'stuck' | 'contradiction'
}

/** Convenience wrapper matching §55's `analyzeDifficulty(puzzle)`. */
export function analyzeDifficulty(puzzle: Puzzle): PuzzleDifficulty {
  const { journal, status } = propagate(puzzle)
  return { ...analyzeJournal(journal), propagationStatus: status }
}
