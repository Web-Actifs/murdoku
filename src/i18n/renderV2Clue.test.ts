import { describe, expect, it } from 'vitest'
import type { Constraint } from '../core/constraints/types'
import { v2Cases } from '../data/v2/caseIndex'
import commonEn from './en/common.json'
import commonEs from './es/common.json'
import commonFr from './fr/common.json'
import { renderV2Clue } from './renderV2Clue'

const names = {
  person: (id: string) => `«${id}»`,
  zone: (id: string) => `[${id}]`,
  objectType: (type: string) => `<${type}>`,
}

/** Echoes back what a real `t` would have been asked for, so key choice is what the test sees. */
function stub(key: string, options?: Record<string, unknown>): string {
  const params = Object.entries(options ?? {})
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(',')
  return params ? `${key}(${params})` : key
}

const render = (constraint: Constraint) => renderV2Clue(stub, constraint, names)

describe('renderV2Clue', () => {
  it('names the zone, the object type and the other person', () => {
    expect(render({ type: 'inZone', zoneId: 'cabine' })).toBe('clue.is.inZone(zone=[cabine])')
    expect(render({ type: 'onObjectType', objectType: 'couchette' })).toBe('clue.is.onObject(object=<couchette>)')
    expect(render({ type: 'adjacentToObjectType', objectType: 'window' })).toBe('clue.is.adjacentToObject(object=<window>)')
    expect(render({ type: 'withPerson', other: 'armand' })).toBe('clue.is.withPerson(name=«armand»)')
    expect(render({ type: 'direction', other: 'oscar', dir: 'N' })).toBe('clue.is.directionN(name=«oscar»)')
  })

  it('reads a distance in the speaker’s own voice, not the engine’s', () => {
    // other.row - me.row === 1 means the other person is one row *below* the speaker.
    expect(render({ type: 'distance', other: 'pascal', axis: 'row', exact: 1 })).toBe(
      'clue.is.distanceAbove(count=1,name=«pascal»,unit=clue.unit.row(count=1))',
    )
    expect(render({ type: 'distance', other: 'noemie', axis: 'row', exact: -2 })).toBe(
      'clue.is.distanceBelow(count=2,name=«noemie»,unit=clue.unit.row(count=2))',
    )
    expect(render({ type: 'distance', other: 'raymond', axis: 'col', exact: 1 })).toBe(
      'clue.is.distanceLeft(count=1,name=«raymond»,unit=clue.unit.col(count=1))',
    )
    expect(render({ type: 'distance', other: 'raymond', axis: 'col', exact: -1 })).toBe(
      'clue.is.distanceRight(count=1,name=«raymond»,unit=clue.unit.col(count=1))',
    )
    expect(render({ type: 'distance', other: 'raymond', axis: 'row', exact: 0 })).toBe('clue.is.sameRow(name=«raymond»)')
  })

  it('reads rows and columns 1-based, with named edges', () => {
    expect(render({ type: 'inRow', row: 'top' })).toBe('clue.is.rowTop')
    expect(render({ type: 'inRow', row: 'bottom' })).toBe('clue.is.rowBottom')
    expect(render({ type: 'inRow', row: 2 })).toBe('clue.is.rowN(n=3)')
    expect(render({ type: 'inColumn', column: 'left' })).toBe('clue.is.colLeft')
    expect(render({ type: 'inColumn', column: 'right' })).toBe('clue.is.colRight')
    expect(render({ type: 'inColumn', column: 4 })).toBe('clue.is.colN(n=5)')
  })

  it('distinguishes an unqualified solitude claim from one about a named zone', () => {
    expect(render({ type: 'alone' })).toBe('clue.is.alone')
    expect(render({ type: 'alone', zoneId: 'cuisine' })).toBe('clue.is.aloneInZone(zone=[cuisine])')
    expect(render({ type: 'notAlone' })).toBe('clue.is.notAlone')
    expect(render({ type: 'notAlone', zoneId: 'cuisine' })).toBe('clue.is.notAloneInZone(zone=[cuisine])')
  })

  it('switches to the denied family for a negated clue, and back again for a double negation', () => {
    expect(render({ type: 'not', of: { type: 'inColumn', column: 'left' } })).toBe('clue.no.colLeft')
    expect(render({ type: 'not', of: { type: 'inZone', zoneId: 'onze' } })).toBe('clue.no.inZone(zone=[onze])')
    expect(render({ type: 'not', of: { type: 'not', of: { type: 'inZone', zoneId: 'onze' } } })).toBe('clue.is.inZone(zone=[onze])')
  })
})

function lookup(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle)
}

/** i18next resolves `x` to `x_one`/`x_other`; a bare `x` is never written for a counted noun. */
function resolves(bundle: unknown, key: string): boolean {
  return typeof lookup(bundle, key) === 'string' || ['_one', '_other'].every((s) => typeof lookup(bundle, key + s) === 'string')
}

const BUNDLES = [
  ['fr', commonFr],
  ['en', commonEn],
  ['es', commonEs],
] as const

describe('v2 clue i18n coverage', () => {
  const keys = new Set<string>()
  const objectTypes = new Set<string>()

  for (const puzzle of v2Cases) {
    for (const object of puzzle.objects) objectTypes.add(object.type)
    for (const person of puzzle.people) {
      for (const constraint of person.constraints) {
        for (const part of renderV2Clue(stub, constraint, names).split(/[(,]/)) {
          if (part.startsWith('clue.')) keys.add(part)
        }
      }
    }
  }

  it('exercises the four authored cases', () => {
    expect(keys.size).toBeGreaterThanOrEqual(10)
    expect(objectTypes.size).toBeGreaterThanOrEqual(20)
  })

  for (const [language, bundle] of BUNDLES) {
    it(`resolves every clue sentence used by a real case in ${language}`, () => {
      expect([...keys].filter((key) => !resolves(bundle, key))).toEqual([])
    })

    it(`labels every scene object type in ${language}`, () => {
      expect([...objectTypes].filter((type) => !resolves(bundle, `clue.object.${type}`))).toEqual([])
    })

    // Only the sentences a real case happens to use are covered above; a clue the
    // author has not reached for yet must not be a missing key waiting to happen.
    it(`covers both polarities of every clue shape in ${language}`, () => {
      const shapes = [
        'inZone',
        'onObject',
        'adjacentToObject',
        'withPerson',
        'directionN',
        'directionS',
        'directionE',
        'directionW',
        'distanceAbove',
        'distanceBelow',
        'distanceLeft',
        'distanceRight',
        'sameRow',
        'sameCol',
        'rowTop',
        'rowBottom',
        'rowN',
        'colLeft',
        'colRight',
        'colN',
        'alone',
        'aloneInZone',
        'notAlone',
        'notAloneInZone',
      ]
      const missing = shapes.flatMap((shape) => [`clue.is.${shape}`, `clue.no.${shape}`]).filter((key) => !resolves(bundle, key))
      expect(missing).toEqual([])
    })
  }
})
