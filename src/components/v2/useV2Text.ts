import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ClueNames } from '../../i18n/renderV2Clue'

export interface V2Text extends ClueNames {
  t: (key: string, options?: Record<string, unknown>) => string
  title: string
  flavorText: string
  intro: string
  /** Display name of one scene object, by its own id — "Hublot", not "a window". */
  object: (objectId: string) => string
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
    return {
      t: t as V2Text['t'],
      title: scoped('title'),
      flavorText: scoped('flavorText'),
      intro: scoped('intro'),
      person: (id: string) => scoped(`people.${id}`),
      zone: (id: string) => scoped(`zones.${id}`),
      object: (id: string) => scoped(`objects.${id}`),
      objectType: (type: string) => t(`clue.object.${type}`),
    }
  }, [t, caseId])
}
