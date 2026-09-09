import { useV3Session, type V3Mode } from '../../store/v3Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { personColor } from '../game/planStyle'
import { V3_PERSON_DRAG_TYPE } from './V3PlanView'
import { useV3Text } from './useV3Text'

/**
 * The guest list — known in full from the first minute, which is the point: in
 * V3 the unknown is not *who was in the house* but *which of its three levels
 * each of them was on*. Somebody with no cell yet is not missing from the case,
 * only from the plan.
 */
export function V3SuspectRoster() {
  const { def, puzzle, state, displayed, selectPerson, setMode, reset } = useV3Session()
  const text = useV3Text(def)
  const frozen = state.phase !== 'investigating'

  /** Where someone stands, said the way a reader would say it: the room, and the level. */
  const whereabouts = (personId: string): string | null => {
    const key = displayed[personId]
    if (!key) return null
    const cell = puzzle.board.cellsByKey.get(key)
    if (!cell) return null
    return `${text.room(cell.roomId)} · ${text.t(`v3:case.floors.${def.floors[cell.floor].id}`)}`
  }

  return (
    <section className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] lg:p-3">
      <div className="mb-3 flex items-center justify-between gap-2 lg:mb-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">{text.t('v3:ui.roster')}</h2>
        <div className="flex overflow-hidden rounded-full border-2 border-[#241f1d]">
          {(['place', 'cross'] as V3Mode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={frozen}
              onClick={() => setMode(mode)}
              className={`px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
                state.mode === mode ? 'bg-[#241f1d] text-[var(--color-surface)]' : 'text-[#241f1d]'
              }`}
            >
              {text.t(mode === 'place' ? 'v3:ui.modePlace' : 'v3:ui.modeCross')}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 lg:gap-1">
        {def.people.map((person, index) => {
          const placed = whereabouts(person.id)
          const selected = state.selectedPersonId === person.id
          return (
            <li key={person.id}>
              <button
                type="button"
                disabled={frozen}
                draggable={!frozen}
                onDragStart={(e) => {
                  e.dataTransfer.setData(V3_PERSON_DRAG_TYPE, person.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => selectPerson(person.id)}
                className={`flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border-2 p-1.5 text-left transition lg:gap-2 lg:p-1 ${
                  selected ? 'border-[var(--color-accent)] bg-[rgb(202_138_4/0.12)]' : 'border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <PersonAvatar
                  name={text.person(person.id)}
                  color={personColor(`ormes:${person.id}`)}
                  isVictim={person.id === def.victimId}
                  variantKey={`ormes:${person.id}`}
                  personIndex={index}
                  showMonogram
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-bold">{text.person(person.id)}</span>
                    {person.id === def.victimId && (
                      <span className="shrink-0 rounded-full bg-[var(--color-danger)] px-1.5 text-[0.55rem] font-bold uppercase text-white">
                        {text.t('v3:ui.victim')}
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-[0.7rem] italic text-[var(--color-text-muted)]">{text.role(person.id)}</span>
                  <span className={`block truncate text-[0.7rem] font-semibold ${placed ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                    {placed ?? text.t('v3:ui.unplaced')}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-[0.7rem] italic text-[var(--color-text-muted)] lg:mt-2">{text.t('v3:ui.placeHint')}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 text-[0.7rem] font-semibold text-[var(--color-text-muted)] underline hover:text-[var(--color-danger)] lg:mt-1"
      >
        {text.t('v3:ui.reset')}
      </button>
    </section>
  )
}
