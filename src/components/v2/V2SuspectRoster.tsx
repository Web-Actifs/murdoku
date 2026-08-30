import { useEffect, useState } from 'react'
import { renderV2Clues } from '../../i18n/renderV2Clue'
import { useV2Session } from '../../store/v2Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { personColor } from '../game/planStyle'
import { V2_PERSON_DRAG_TYPE } from './V2FloorPlanGrid'
import { useV2Text } from './useV2Text'

/** Long enough for the shake to finish, short enough that the next drag can refuse again. */
const REFUSE_MS = 420

export function V2SuspectRoster() {
  const { puzzle, state, displayed, selectPerson } = useV2Session()
  const text = useV2Text(puzzle.id)
  const frozen = state.phase !== 'investigating'
  const [refusedId, setRefusedId] = useState<string | null>(null)

  useEffect(() => {
    if (!refusedId) return
    const timer = window.setTimeout(() => setRefusedId(null), REFUSE_MS)
    return () => window.clearTimeout(timer)
  }, [refusedId])

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{text.t('v2.play.testimoniesHeading')}</h2>
        <span className="text-xs text-[var(--color-text-muted)]">{text.t('v2.play.testimoniesNote')}</span>
      </div>

      <ul className="mt-3 grid gap-3">
        {puzzle.people.map((person, i) => {
          const name = text.person(person.id)
          const isSelected = state.selectedPersonId === person.id
          const cell = displayed[person.id]
          const zoneName = cell ? text.zone(puzzle.board.cellsByKey.get(cell)!.zoneId) : null
          const clues = renderV2Clues(text.t, person.constraints, text)

          return (
            <li key={person.id} className="mk-card" style={{ animationDelay: `${i * 55}ms` }}>
              <button
                type="button"
                disabled={frozen}
                onClick={() => selectPerson(person.id)}
                draggable={!frozen}
                onDragStart={(e) => {
                  e.dataTransfer.setData(V2_PERSON_DRAG_TYPE, person.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                // A drag that ends with no drop effect landed nowhere legal, which is the only
                // moment the player gets no other feedback that nothing happened.
                onDragEnd={(e) => {
                  if (e.dataTransfer.dropEffect === 'none') setRefusedId(person.id)
                }}
                className={`flex w-full cursor-grab items-start gap-3 rounded-[var(--radius-md)] border-2 p-3 text-left transition-all duration-150 active:cursor-grabbing disabled:cursor-default ${
                  refusedId === person.id ? 'mk-refuse' : ''
                } ${
                  isSelected
                    ? '-translate-y-[2px] border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[0_5px_0_rgb(36_31_29/0.2)]'
                    : cell
                      ? 'border-[var(--color-success)] bg-[var(--color-surface-alt)] shadow-[var(--shadow-card)] enabled:hover:-translate-y-[1px]'
                      : 'border-[#241f1d] bg-[var(--color-surface)] shadow-[var(--shadow-card)] enabled:hover:-translate-y-[1px]'
                }`}
              >
                <span className="relative shrink-0">
                  <PersonAvatar
                    name={name}
                    color={personColor(`${puzzle.id}:${person.id}`)}
                    isVictim={person.id === puzzle.victimId}
                    variantKey={`${puzzle.id}:${person.id}`}
                  />
                  {cell && (
                    <span
                      aria-hidden
                      className="mk-pop absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success)] text-xs font-bold text-white ring-[1.5px] ring-[#241f1d]"
                    >
                      ✓
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-[1.05rem] font-bold italic tracking-tight">{name}</span>
                    {person.id === puzzle.victimId && (
                      <span className="rounded-full border border-[#241f1d] bg-[var(--color-danger)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                        {text.t('case.victimBadge')}
                      </span>
                    )}
                  </span>

                  <span className="mt-1 block rounded-[0.9rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 py-1 text-sm text-[var(--color-text-muted)]">
                    {clues.length === 0 ? (
                      text.t('v2.play.noClue')
                    ) : (
                      <span className="flex flex-col gap-0.5">
                        {clues.map((clue) => (
                          <span key={clue} className="flex gap-1.5">
                            <span aria-hidden className="text-[var(--color-accent)]">
                              •
                            </span>
                            {clue}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>

                  {zoneName && (
                    <span
                      key={cell}
                      className="mk-pop mt-1.5 inline-block rounded-full border border-[var(--color-success)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-success)]"
                    >
                      ✓ {zoneName}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
