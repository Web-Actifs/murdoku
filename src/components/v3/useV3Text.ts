import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Constraint } from '../../core3/constraints/types'
import type { PuzzleDef } from '../../core3/model/types'
import { renderV3Clue, type V3ClueNames } from '../../i18n/renderV3Clue'

export interface V3Text extends V3ClueNames {
  t: (key: string, options?: Record<string, unknown>) => string
  title: string
  tagline: string
  intro: string
  /** "le salon" — the bare name, for labels. */
  room: (id: string) => string
  /** A person's one-line role ("la cuisinière"). */
  role: (id: string) => string
  object: (id: string) => string
  act: (gateOrStart: string) => string
  gate: (gateId: string, part: 'title' | 'locked' | 'opened') => string
  link: (linkId: string, part: 'name' | 'found') => string
  clue: (personId: string, constraint: Constraint) => string
}

/**
 * Every V3 label in one place: the engine speaks in ids, the bundle holds the
 * fiction. Rooms come in two shapes on purpose — `room` for a label on the plan,
 * `roomIn` for a sentence — because French prepositions do not survive being
 * assembled at render time ("dans le" vs "à la" vs "à l'").
 */
export function useV3Text(def: PuzzleDef): V3Text {
  const { t } = useTranslation(['v3'])

  return useMemo(() => {
    const s = (path: string) => t(`v3:${path}`)
    const names: V3ClueNames = {
      person: (id) => s(`case.people.${id}`),
      roomIn: (id) => s(`case.roomsIn.${id}`),
      floorName: (floor) => s(`case.floors.${def.floors[floor]?.id ?? floor}`),
      objectPhrase: (type, relation) => s(`case.objectPhrase.${type}.${relation}`),
    }

    return {
      ...names,
      t: t as V3Text['t'],
      title: s('case.title'),
      tagline: s('case.tagline'),
      intro: s('case.intro'),
      room: (id) => s(`case.rooms.${id}`),
      role: (id) => s(`case.roles.${id}`),
      object: (id) => s(`case.objects.${id}`),
      act: (id) => s(`case.acts.${id}`),
      gate: (id, part) => s(`case.gates.${id}.${part}`),
      link: (id, part) => s(`case.links.${id}.${part}`),
      clue: (personId, constraint) => renderV3Clue(personId, constraint, names, t as V3Text['t']),
    }
  }, [t, def])
}
