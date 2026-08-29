import { describe, expect, it } from 'vitest'
import { parsePlan } from './parsePlan'

describe('parsePlan', () => {
  it('turns a rectangular plan into cells, skipping holes', () => {
    const plan = `
      AA.
      AA.
    `
    const cells = parsePlan(plan, { A: 'salon' })
    expect(cells).toHaveLength(4)
    expect(cells.every((c) => c.zoneId === 'salon')).toBe(true)
    expect(cells.find((c) => c.row === 0 && c.col === 2)).toBeUndefined()
  })

  it('supports concave shapes via holes anywhere in the grid', () => {
    const plan = `
      AAA
      A.A
      AAA
    `
    const cells = parsePlan(plan, { A: 'salon' })
    expect(cells).toHaveLength(8)
    expect(cells.find((c) => c.row === 1 && c.col === 1)).toBeUndefined()
  })

  it('maps distinct characters through the legend to distinct zones', () => {
    const plan = `
      AB
    `
    const cells = parsePlan(plan, { A: 'salon', B: 'cuisine' })
    expect(cells.find((c) => c.col === 0)?.zoneId).toBe('salon')
    expect(cells.find((c) => c.col === 1)?.zoneId).toBe('cuisine')
  })

  it('rejects a character missing from the legend', () => {
    expect(() => parsePlan('AX', { A: 'salon' })).toThrow(/Unknown plan character/)
  })

  it('rejects rows of unequal length instead of silently padding', () => {
    const plan = 'AAA\nAA'
    expect(() => parsePlan(plan, { A: 'salon' })).toThrow(/expected 3/)
  })
})
