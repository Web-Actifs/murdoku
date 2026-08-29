import type { DeductionStep } from './journal'
import type { PropagationResult } from './propagate'

/** How short and direct the demonstration is — "obvious" vs "six moves ahead". */
export type ContradictionStrength = 'immediate' | 'direct' | 'indirect'

/**
 * Why a propagation run ended in contradiction, as a demonstration a person can
 * read rather than just a name (`contradictionPersonId`) and a pile of steps.
 * Built for `hypothesis.ts`'s refutations, but nothing here is hypothesis-specific
 * — it applies just as well to a genuinely broken case an author is debugging:
 * `traceContradiction(propagate(puzzle))` names the clue combination at fault
 * instead of leaving the author to bisect a 12-clue case by hand.
 */
export interface ContradictionTrace {
  /** Who ran out of places to be. */
  personId: string
  /** Id of the step that emptied their domain — the last line of the demonstration. */
  terminalStepId?: string
  /**
   * Every step the contradiction rests on, in journal order. Premises always
   * precede their consumer, so this reads top-to-bottom as the proof itself.
   */
  chain: DeductionStep[]
  /** chain.length — how many deductions a reader must follow. */
  length: number
  /** Longest premise chain inside the trace; 1 means "immediate from the seed". */
  depth: number
  /** Distinct people the argument had to travel through, in first-appearance order. */
  peopleInvolved: string[]
  strength: ContradictionStrength
}

/**
 * Traces a `'contradiction'` result back to the minimal demonstration of why.
 * Returns undefined for any other status — there is nothing to explain.
 */
export function traceContradiction(run: PropagationResult): ContradictionTrace | undefined {
  if (run.status !== 'contradiction') return undefined

  // The *first* emptied domain is the honest terminus: anything the loop emitted
  // afterwards is fallout, not part of the shortest demonstration.
  const terminal = run.journal.find((step) => step.after.length === 0)
  if (!terminal) {
    // No step ever emptied a domain — the person was seeded empty from their own
    // clues alone, before propagation even ran. Nothing to trace, but the person
    // is still known: see propagate.ts's seed-time contradiction check.
    return { personId: run.contradictionPersonId ?? '', chain: [], length: 0, depth: 0, peopleInvolved: [], strength: 'immediate' }
  }

  const chain = ancestryOf(run.journal, terminal.id)
  const depth = depthWithin(chain, terminal.id)

  const peopleInvolved: string[] = []
  for (const step of chain) {
    if (!peopleInvolved.includes(step.personId)) peopleInvolved.push(step.personId)
  }

  return {
    personId: terminal.personId,
    terminalStepId: terminal.id,
    chain,
    length: chain.length,
    depth,
    peopleInvolved,
    strength: strengthOf(depth),
  }
}

/**
 * Transitive premise closure of a step, returned in journal order. Steps are
 * emitted only after their premises, so journal order is already a topological
 * order — the chain reads as a demonstration without any extra sorting.
 */
function ancestryOf(journal: DeductionStep[], terminalId: string): DeductionStep[] {
  const byId = new Map(journal.map((step) => [step.id, step]))
  const keep = new Set<string>()
  const stack = [terminalId]

  while (stack.length > 0) {
    const id = stack.pop()!
    if (keep.has(id)) continue
    const step = byId.get(id)
    if (!step) continue
    keep.add(id)
    for (const premise of step.premises) stack.push(premise)
  }

  return journal.filter((step) => keep.has(step.id))
}

/** Longest premise chain ending at `terminalId`, counted inside the trace only. */
function depthWithin(chain: DeductionStep[], terminalId: string): number {
  const byId = new Map(chain.map((step) => [step.id, step]))
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

  return depthOf(terminalId)
}

function strengthOf(depth: number): ContradictionStrength {
  if (depth <= 2) return 'immediate'
  if (depth <= 4) return 'direct'
  return 'indirect'
}
