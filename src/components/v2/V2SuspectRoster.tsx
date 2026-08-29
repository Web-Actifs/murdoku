import { renderV2Clues } from '../../i18n/renderV2Clue'
import { useV2Session } from '../../store/v2Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { personColor } from '../game/planStyle'
import { V2_PERSON_DRAG_TYPE } from './V2FloorPlanGrid'
import { useV2Text } from './useV2Text'

export function V2SuspectRoster() {
  const { puzzle, state, displayed, selectPerson } = useV2Session()
  const text = useV2Text(puzzle.id)
  const frozen = state.phase !== 'investigating'

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{text.t('v2.play.testimoniesHeading')}</h2>
        <span className="text-xs text-[var(--color-text-muted)]">{text.t('v2.play.testimoniesNote')}</span>
      </div>

      <ul className="mt-3 grid gap-3">
        {puzzle.people.map((person) => {
          const name = text.person(person.id)
          const isSelected = state.selectedPersonId === person.id
          const cell = displayed[person.id]
          const zoneName = cell ? text.zone(puzzle.board.cellsByKey.get(cell)!.zoneId) : null
          const clues = renderV2Clues(text.t, person.constraints, text)

          return (
            <li key={person.id}>
              <button
                type="button"
                disabled={frozen}
                onClick={() => selectPerson(person.id)}
                draggable={!frozen}
                onDragStart={(e) => {
                  e.dataTransfer.setData(V2_PERSON_DRAG_TYPE, person.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className={`flex w-full cursor-grab items-start gap-3 rounded-[var(--radius-md)] border-2 p-3 text-left shadow-[var(--shadow-card)] transition-all active:cursor-grabbing disabled:cursor-default ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                    : cell
                      ? 'border-[var(--color-success)] bg-[var(--color-surface-alt)]'
                      : 'border-[#241f1d] bg-[var(--color-surface)]'
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
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success)] text-xs font-bold text-white ring-[1.5px] ring-[#241f1d]"
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
                    <span className="mt-1.5 inline-block rounded-full border border-[var(--color-success)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-success)]">
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
