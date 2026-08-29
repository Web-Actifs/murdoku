import type { Hint } from '../core/hints/types'
import type { ClueNames } from './renderV2Clue'

type Translate = (key: string, options?: Record<string, unknown>) => string

/** Hint params that carry a person id rather than a ready-to-print name. */
const PERSON_PARAMS = ['person', 'by', 'other', 'confinedPerson']

/**
 * `getHint` hands back a key plus ids, never a sentence (Claude/claude.md §31).
 * Resolving those ids is the caller's job, and the caller is the only one who
 * knows the case's cast and rooms.
 */
export function renderV2Hint(t: Translate, hint: Hint, names: ClueNames): string {
  if (hint.exhausted) return t(hint.i18nKey)

  const params: Record<string, string | number> = { ...hint.params }
  for (const key of PERSON_PARAMS) {
    const value = params[key]
    if (typeof value === 'string') params[key] = names.person(value)
  }
  if (typeof params.zone === 'string') params.zone = names.zone(params.zone)

  return t(hint.i18nKey, params)
}
