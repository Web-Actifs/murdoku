import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../core/model/loadPuzzle'
import { v2Cases } from '../data/v2/caseIndex'
import commonEn from './en/common.json'
import commonEs from './es/common.json'
import commonFr from './fr/common.json'

const v2casesFr = import.meta.glob('./fr/v2cases/*.json', { eager: true })
const v2casesEn = import.meta.glob('./en/v2cases/*.json', { eager: true })
const v2casesEs = import.meta.glob('./es/v2cases/*.json', { eager: true })

function bundleOf(glob: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const path in glob) result[path.split('/').pop()!.replace('.json', '')] = (glob[path] as { default: unknown }).default
  return result
}

function lookup(bundle: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], bundle)
}

/** i18next resolves a counted key to `_one`/`_other`, never to the bare name. */
function resolves(bundle: unknown, key: string): boolean {
  return typeof lookup(bundle, key) === 'string' || ['_one', '_other'].every((s) => typeof lookup(bundle, key + s) === 'string')
}

/** Every key the V2 screens ask for by hand; the interpolated ones are expanded here. */
const UI_KEYS = [
  'home.v2Preview.title',
  'home.v2Preview.description',
  'home.v2Preview.cta',
  'home.v2Preview.devLink',
  'home.play',
  'case.backToHome',
  'case.legendHeading',
  'case.victimBadge',
  'case.resetButton',
  'case.giveUpButton',
  'case.closeResult',
  'v2.picker.heading',
  'v2.picker.badge',
  'v2.picker.subheading',
  'v2.picker.stats',
  'v2.picker.devNote',
  'v2.picker.devLink',
  'v2.play.backToCases',
  'v2.play.barHeading',
  'v2.play.placeHint',
  'v2.play.crossHint',
  'v2.play.modePlace',
  'v2.play.modeCross',
  'v2.play.solveButton',
  'v2.play.solveBlocked',
  'v2.play.hintButton',
  'v2.play.hintHeading',
  'v2.play.hintLevel',
  'v2.play.hintApply',
  'v2.play.hintDismiss',
  'v2.play.testimoniesHeading',
  'v2.play.testimoniesNote',
  'v2.play.noClue',
  'v2.play.victimLine',
  'v2.play.objectOccupiable',
  'v2.play.objectBlocked',
  'v2.play.blockedTag',
  'v2.play.blockedNote',
  'v2.play.rulesNote',
  'v2.trail.heading',
  'v2.trail.steps',
  'v2.trail.discovery',
  'v2.trail.waiting',
  'v2.trail.chapterCurrent',
  'v2.trail.revealsLeft',
  'v2.trail.lastThread',
  'v2.trail.closed',
  'chapter.progress',
  'chapter.givens',
  'chapter.lock',
  'chapter.thread',
  'v2.notebook.open',
  'v2.notebook.placement.established',
  'v2.notebook.placement.open',
  'v2.notebook.placement.refuted',
  'v2.notebook.exclusion.refuted',
  'v2.notebook.candidates.left',
  'v2.notebook.candidates.forced',
  'v2.result.solvedTitle',
  'v2.result.wrongTitle',
  'v2.result.gaveUpTitle',
  'v2.result.placementsCorrect',
  'v2.result.hintsUsed',
  'v2.result.verdictHeading',
  'v2.result.murdererIs',
  'v2.result.murdererWhy',
  'v2.result.noMurderer',
  'v2.result.whyHeading',
  'v2.result.whyRowClash',
  'v2.result.whyColClash',
  'v2.result.whyFallback',
  'v2.difficulty.score',
  ...(['beginner', 'intermediate', 'advanced', 'expert'] as const).flatMap((category) => [
    `v2.difficulty.${category}.label`,
    `v2.difficulty.${category}.description`,
  ]),
]

const LOCALES = [
  ['fr', commonFr, bundleOf(v2casesFr)],
  ['en', commonEn, bundleOf(v2casesEn)],
  ['es', commonEs, bundleOf(v2casesEs)],
] as const

describe('v2 UI i18n coverage', () => {
  for (const [language, common] of LOCALES) {
    it(`resolves every V2 screen string in ${language}`, () => {
      expect(UI_KEYS.filter((key) => !resolves(common, key))).toEqual([])
    })
  }
})

describe('v2 case bundle coverage', () => {
  // Names every id the board can put on screen, so a case can never ship with a
  // room, a person or a piece of furniture showing its raw engine id.
  const required = v2Cases.flatMap((def) => {
    const puzzle = loadPuzzle(def)
    return [
      `${def.id}.title`,
      `${def.id}.flavorText`,
      `${def.id}.intro`,
      ...puzzle.zones.map((zone) => `${def.id}.zones.${zone.id}`),
      ...puzzle.people.map((person) => `${def.id}.people.${person.id}`),
      ...puzzle.board.objects.map((object) => `${def.id}.objects.${object.id}`),
    ]
  })

  it('covers all four cases', () => {
    expect(v2Cases).toHaveLength(4)
    expect(required.length).toBeGreaterThan(80)
  })

  for (const [language, , bundle] of LOCALES) {
    it(`names every zone, person and scene object in ${language}`, () => {
      expect(required.filter((key) => !resolves(bundle, key))).toEqual([])
    })
  }
})

/**
 * `roles`/`voices` are optional (a case with none renders exactly as before),
 * but once authored they must not drift the way the `.ts` source comments
 * already have (Opus's playtest finding, 2026-08-31): a voice with no role,
 * or a cast that differs between languages, would be silent until a player —
 * or a translator — noticed.
 */
describe('v2 case voice/role coverage', () => {
  const idsOf = (bundle: Record<string, unknown>, caseId: string, field: 'roles' | 'voices'): string[] =>
    Object.keys((bundle[caseId] as Record<string, Record<string, string>> | undefined)?.[field] ?? {}).sort()

  for (const def of v2Cases) {
    it(`${def.id}: every voice names a person who also has a role, in every language`, () => {
      for (const [, , bundle] of LOCALES) {
        const roles = idsOf(bundle, def.id, 'roles')
        const voices = idsOf(bundle, def.id, 'voices')
        expect(voices.filter((id) => !roles.includes(id))).toEqual([])
      }
    })

    it(`${def.id}: roles and voices name the same cast across fr/en/es`, () => {
      const [fr, en, es] = LOCALES.map(([, , bundle]) => bundle)
      expect(idsOf(en, def.id, 'roles')).toEqual(idsOf(fr, def.id, 'roles'))
      expect(idsOf(es, def.id, 'roles')).toEqual(idsOf(fr, def.id, 'roles'))
      expect(idsOf(en, def.id, 'voices')).toEqual(idsOf(fr, def.id, 'voices'))
      expect(idsOf(es, def.id, 'voices')).toEqual(idsOf(fr, def.id, 'voices'))
    })
  }
})
