import { describe, expect, it } from 'vitest'
import { getHint } from '../core/hints/getHint'
import type { Hint } from '../core/hints/types'
import { loadPuzzle } from '../core/model/loadPuzzle'
import { propagate } from '../core/possibility/propagate'
import { cormoranDef } from '../data/v2/premier-cas'
import { renderV2Hint } from './renderV2Hint'

const names = {
  person: (id: string) => `«${id}»`,
  zone: (id: string) => `[${id}]`,
  objectType: (type: string) => `<${type}>`,
}

function stub(key: string, options?: Record<string, unknown>): string {
  const params = Object.entries(options ?? {})
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(',')
  return params ? `${key}(${params})` : key
}

function hintOf(overrides: Partial<Hint>): Hint {
  return { level: 3, i18nKey: 'hint.l3.rowTaken', params: {}, cells: [], exhausted: false, ...overrides }
}

describe('renderV2Hint', () => {
  it('resolves every person-carrying param to a display name', () => {
    const hint = hintOf({ params: { person: 'armand', by: 'helene', other: 'oscar', confinedPerson: 'pascal', row: 3 } })
    expect(renderV2Hint(stub, hint, names)).toBe('hint.l3.rowTaken(person=«armand»,by=«helene»,other=«oscar»,confinedPerson=«pascal»,row=3)')
  })

  it('resolves a zone id to the room name the player sees on the plan', () => {
    const hint = hintOf({ i18nKey: 'hint.l3.zoneTaken', params: { person: 'oscar', by: 'pascal', zone: 'cuisine' } })
    expect(renderV2Hint(stub, hint, names)).toBe('hint.l3.zoneTaken(person=«oscar»,by=«pascal»,zone=[cuisine])')
  })

  it('leaves cell coordinates and counts untouched', () => {
    const hint = hintOf({ i18nKey: 'hint.l4.nakedSingle', params: { person: 'armand', cell: 'R1C5', cells: 'R1C5' } })
    expect(renderV2Hint(stub, hint, names)).toBe('hint.l4.nakedSingle(person=«armand»,cell=R1C5,cells=R1C5)')
  })

  it('takes the exhausted hint as a bare sentence, with no params to resolve', () => {
    expect(renderV2Hint(stub, hintOf({ i18nKey: 'hint.none', exhausted: true, params: { person: 'armand' } }), names)).toBe('hint.none')
  })

  it('never leaves a raw person id in a hint drawn from a real case', () => {
    const puzzle = loadPuzzle(cormoranDef)
    const { journal } = propagate(puzzle)
    const ids = puzzle.people.map((p) => p.id)

    for (const level of [1, 2, 3, 4, 5] as const) {
      const rendered = renderV2Hint(stub, getHint(journal, {}, level), names)
      for (const id of ids) expect(rendered).not.toMatch(new RegExp(`[=,]${id}(?![»\\w])`))
    }
  })
})
