import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../model/loadPuzzle'
import { propagate } from '../possibility/propagate'
import { cascadeDef } from '../testing/fixtures'
import { applyHint, getHint, isStepReflected, nextUnreflectedStep } from './getHint'
import type { HintLevel, PlayerAssignment } from './types'

const puzzle = loadPuzzle(cascadeDef)
const { journal, placements } = propagate(puzzle)
const PEOPLE = ['austin', 'brycen', 'diane']

function paramValues(params: Record<string, string | number>): string[] {
  return Object.values(params).map(String)
}

describe('getHint — progressive reveal on the cascade fixture', () => {
  const empty: PlayerAssignment = {}

  it('always talks about the same first unsolved step across levels 1 to 4', () => {
    const first = nextUnreflectedStep(journal, empty)!
    expect(first.id).toBe(journal[0].id)
    for (const level of [1, 2, 3, 4] as HintLevel[]) {
      expect(getHint(journal, empty, level).stepId).toBe(first.id)
    }
  })

  it('level 1 names a technique and a locus but never an identity', () => {
    const hint = getHint(journal, empty, 1)
    expect(hint.i18nKey).toMatch(/^hint\.l1\./)
    expect(hint.cells).toEqual([])
    for (const personId of PEOPLE) {
      expect(paramValues(hint.params)).not.toContain(personId)
    }
    expect(JSON.stringify(hint)).not.toContain('austin')
  })

  it('level 2 finally names who is moving, without showing any cell', () => {
    const hint = getHint(journal, empty, 2)
    expect(hint.i18nKey).toBe(`hint.l2.${journal[0].technique}`)
    expect(hint.params.person).toBe(journal[0].personId)
    expect(hint.cells).toEqual([])
  })

  it('level 3 adds the structured reason, still without the cells', () => {
    const hint = getHint(journal, empty, 3)
    expect(hint.i18nKey).toBe('hint.l3.confinedToCol')
    // Columns surface 1-based, the way the player counts them on the plan.
    expect(hint.params).toMatchObject({ person: 'brycen', confinedPerson: 'austin', col: 1 })
    expect(hint.cells).toEqual([])
  })

  it('level 4 gives the whole deduction, cells included, but touches nothing', () => {
    const hint = getHint(journal, empty, 4)
    expect(hint.i18nKey).toBe('hint.l4.lockedCandidatesCol')
    expect(hint.cells).toEqual(journal[0].removed)
    expect(hint.params.cells).toBe('R1C1')
    expect(hint.apply).toBeUndefined()
    expect(applyHint(empty, hint)).toEqual({})
  })

  it('level 5 produces a playable state with the cell actually placed', () => {
    const hint = getHint(journal, empty, 5)
    expect(hint.i18nKey).toBe('hint.l5.place')
    expect(hint.apply).toEqual({ personId: 'brycen', cell: placements.brycen })

    const next = applyHint(empty, hint)
    expect(next).toEqual({ brycen: placements.brycen })
    expect(next).not.toBe(empty)
  })

  it('walks the whole investigation when level 5 is used repeatedly', () => {
    let player: PlayerAssignment = {}
    for (let i = 0; i < 10 && !getHint(journal, player, 5).exhausted; i++) {
      const hint = getHint(journal, player, 5)
      if (!hint.apply) break
      player = applyHint(player, hint)
    }
    expect(player).toEqual(placements)
    expect(getHint(journal, player, 5).exhausted).toBe(true)
    expect(getHint(journal, player, 1).i18nKey).toBe('hint.none')
  })
})

describe('isStepReflected — what the player already knows', () => {
  it('counts a placing step as reflected only on the exact cell', () => {
    const placingStep = journal.find((s) => s.placed !== undefined)!
    expect(isStepReflected(placingStep, { [placingStep.personId]: placingStep.placed })).toBe(true)
    expect(isStepReflected(placingStep, { [placingStep.personId]: '9:9' })).toBe(false)
    expect(isStepReflected(placingStep, {})).toBe(false)
  })

  it('keeps an elimination unreflected when the player sits on a ruled-out cell', () => {
    const elimination = journal.find((s) => s.placed === undefined && s.removed.length > 0)!
    const wrong = elimination.removed[0]
    expect(isStepReflected(elimination, { [elimination.personId]: wrong })).toBe(false)
    expect(isStepReflected(elimination, { [elimination.personId]: '2:1' })).toBe(true)
  })

  it('surfaces the step that disproves a wrong placement first', () => {
    const elimination = journal.find((s) => s.placed === undefined && s.removed.length > 0)!
    const player: PlayerAssignment = { [elimination.personId]: elimination.removed[0] }
    expect(nextUnreflectedStep(journal, player)!.id).toBe(elimination.id)
  })
})
