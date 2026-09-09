import type { Puzzle } from '../model/types'
import { propagate } from '../possibility/propagate'
import { solvePuzzle } from './solver'

/**
 * The primitive V3 adds to the engine, and the reason a door can open on a
 * proof instead of on a button.
 *
 * A gate asks the player to establish one specific fact — *this* person stood on
 * *that* cell. The gate is only fair if the fact is already forced by the clues
 * the player has been given, and forced by moves they could make themselves. So
 * entailment is measured by propagation, not by search: the solver could tell us
 * the fact is true in every solution while no chain of hand-applicable steps
 * reaches it, and a door that opens only for an oracle is a door that never
 * opens.
 *
 * `false` here is an authoring error, not a runtime state. Every gate in a
 * shipped case is checked at build time (see the case's own test).
 */
export function entailsPlacement(puzzle: Puzzle, personId: string, cell: string): boolean {
  const result = propagate(puzzle)
  if (result.status === 'contradiction') return false
  const candidates = result.candidates.get(personId)
  return candidates !== undefined && candidates.size === 1 && candidates.has(cell)
}

/**
 * How far propagation gets on the clues revealed so far: who is pinned, and how
 * wide everyone else still is. Used by the case tests to state what each act is
 * *supposed* to give away — an act that already resolves the whole building has
 * no reason to be followed by another one.
 */
export function propagationSnapshot(puzzle: Puzzle): { pinned: Record<string, string>; widths: Record<string, number>; stuck: boolean } {
  const result = propagate(puzzle)
  const pinned: Record<string, string> = {}
  const widths: Record<string, number> = {}
  for (const [personId, set] of result.candidates) {
    widths[personId] = set.size
    if (set.size === 1) pinned[personId] = [...set][0]
  }
  return { pinned, widths, stuck: result.status !== 'solved' }
}

/**
 * The stronger, search-based notion: is the fact true in *every* placement the
 * clues admit? Kept apart from `entailsPlacement` because the two answer
 * different questions — this one is about the puzzle, that one about the player.
 * A fact can hold in every solution and still be out of a player's reach, which
 * is exactly the case a gate must never be built on.
 */
export function holdsInEverySolution(puzzle: Puzzle, personId: string, cell: string, limit = 200): boolean {
  const solutions = solvePuzzle(puzzle, { limit })
  return solutions.length > 0 && solutions.every((s) => s[personId] === cell)
}
