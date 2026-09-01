import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ClueNames } from '../../i18n/renderV2Clue'

export interface V2Text extends ClueNames {
  t: (key: string, options?: Record<string, unknown>) => string
  title: string
  flavorText: string
  /** The wry one-liner under the title — tone, not summary; `flavorText` already covers the latter on the picker. */
  tagline: string
  intro: string
  /** Display name of one scene object, by its own id — "Hublot", not "a window". */
  object: (objectId: string) => string
  /** A person's one-line role ("le skipper") — empty when a case hasn't authored one. */
  role: (personId: string) => string
  /** A person's motive, in their own voice — never a fact the mechanical clues don't already carry. Empty when unauthored (the victim, mainly). */
  voice: (personId: string) => string
}

/**
 * Every V2 label in one place: the engine speaks in ids, the case bundle holds
 * the fiction. `objectType` is the generic noun a clue can say out loud ("une
 * fenêtre") while `object` is the specific thing drawn on the plan ("Hublot").
 */
export function useV2Text(caseId: string): V2Text {
  const { t } = useTranslation(['common', 'v2cases'])

  return useMemo(() => {
    const scoped = (path: string) => t(`v2cases:${caseId}.${path}`)
    // Roles and voices are optional per case/person — a missing one renders as
    // nothing rather than an i18next key-echo, so a case can adopt them gradually.
    const optional = (path: string) => t(`v2cases:${caseId}.${path}`, { defaultValue: '' })
    return {
      t: t as V2Text['t'],
      title: scoped('title'),
      flavorText: scoped('flavorText'),
      tagline: optional('tagline'),
      intro: scoped('intro'),
      person: (id: string) => scoped(`people.${id}`),
      zone: (id: string) => scoped(`zones.${id}`),
      object: (id: string) => scoped(`objects.${id}`),
      objectType: (type: string) => t(`clue.object.${type}`),
      role: (id: string) => optional(`roles.${id}`),
      voice: (id: string) => optional(`voices.${id}`),
    }
  }, [t, caseId])
}
