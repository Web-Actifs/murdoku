import { describe, expect, it } from 'vitest'
import { findMirroredTestimony } from '../../core/constraints/relations'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import { v2Cases } from './caseIndex'

/**
 * No published case may state one relation from both sides — checked against
 * every case at once and with the very function the generator's acceptance gate
 * uses, so a fifth case cannot quietly skip the rule.
 *
 * The regression this exists for was reported from the play screen rather than
 * from a failing test: the roster showed "Victoire était à 2 colonnes à gauche
 * de Pascal" on one card and "Pascal était à 2 colonnes à droite de Victoire" on
 * the next. Every test then in the suite passed — the case solved by propagation,
 * had a unique solution, and each clue was load-bearing under the existing
 * minimality check — because propagation only narrows the domain of the person a
 * clue is written on, which makes both halves of a mirrored pair genuinely
 * necessary. Minimal as executed, repetitive as read: this is the assertion that
 * tells those two apart.
 */
describe('no published case makes two witnesses repeat one another', () => {
  it.each(v2Cases.map((def) => [def.id, def] as const))('%s states every relation exactly once', (_id, def) => {
    const found = findMirroredTestimony(loadPuzzle(def))
    const detail = found && `${found.personId} and ${found.otherId}: ${JSON.stringify(found.constraint)} / ${JSON.stringify(found.otherConstraint)}`
    expect(detail).toBeNull()
  })

  it('is not vacuously true — it fails the moment a case says it twice', () => {
    const [def] = v2Cases
    const doctored = structuredClone(def)
    const [speaker, listener] = doctored.people.filter((p) => !p.isVictim)
    doctored.people.find((p) => p.id === speaker.id)!.constraints.push({ type: 'withPerson', other: listener.id })
    doctored.people.find((p) => p.id === listener.id)!.constraints.push({ type: 'withPerson', other: speaker.id })

    expect(findMirroredTestimony(loadPuzzle(doctored))).not.toBeNull()
  })
})
