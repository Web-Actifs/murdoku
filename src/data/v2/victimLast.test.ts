import { describe, expect, it } from 'vitest'
import { victimResolvesLast } from '../../core/generate/verify'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import { propagate } from '../../core/possibility/propagate'
import { v2Cases } from './caseIndex'

/**
 * The §14 rule, checked against every published case at once and with the very
 * function the generator's acceptance gate uses — so a case can never be shipped
 * (hand-written or generated) whose body falls out mid-proof. Each case's own
 * spec file asserts its full placement order; this one exists so that adding a
 * fifth case cannot quietly skip the rule.
 */
describe('§14 — the victim is the last person every published case resolves', () => {
  it.each(v2Cases.map((def) => [def.id, def] as const))('%s closes on the body', (_id, def) => {
    const puzzle = loadPuzzle(def)
    const result = propagate(puzzle)

    expect(result.status).toBe('solved')

    const placed = result.journal.filter((step) => step.placed)
    expect(placed).toHaveLength(def.people.length)
    expect(placed[placed.length - 1].personId).toBe(def.victimId)
    expect(victimResolvesLast(result.journal, def.victimId)).toBe(true)
  })

  it('is not vacuously true — it fails when the body is resolved first', () => {
    const [def] = v2Cases
    const journal = propagate(loadPuzzle(def)).journal
    expect(victimResolvesLast(journal, journal.find((s) => s.placed)!.personId)).toBe(false)
  })
})
