import { useEffect, useState } from 'react'
import { hintForStep } from '../../core/hints/getHint'
import { notebookFrom, personStatus } from '../../core/hints/notebook'
import type { MarkAnnotation, PersonStatus } from '../../core/hints/notebook'
import type { DeductionStep } from '../../core/possibility/journal'
import { renderV2Clues } from '../../i18n/renderV2Clue'
import { renderV2Hint } from '../../i18n/renderV2Hint'
import { useV2Session } from '../../store/v2Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { personColor } from '../game/planStyle'
import { V2_PERSON_DRAG_TYPE } from './V2FloorPlanGrid'
import { useV2Progress } from './useV2Progress'
import { useV2Text, type V2Text } from './useV2Text'

/** Long enough for the shake to finish, short enough that the next drag can refuse again. */
const REFUSE_MS = 420

/**
 * The step that actually settled a mark, narrated at the same depth as a
 * level-3 hint — "which person, which rule" — so a suspect who is already
 * placed reads the same reasoning a hint would have offered while placing
 * them. `decisiveStep` is 0 for a mark the seed alone already settles (no
 * step to point at) and unset while the mark is still `open` — both cases
 * fall through to no explanation, which is correct: there is none to give
 * without spoiling reasoning the player hasn't reached.
 */
function whyThisMark(journal: DeductionStep[], mark: MarkAnnotation, text: V2Text): string | undefined {
  if (!mark.decisiveStep) return undefined
  const step = journal[mark.decisiveStep - 1]
  return step ? renderV2Hint(text.t, hintForStep(step, 3), text) : undefined
}

/**
 * One suspect's "faire le point" line(s) — never more than what the player's
 * own frontier already covers (Claude/claude.md §30-32): a wrong guess placed
 * ahead of the proof reads exactly like a right one until the player's own
 * reasoning catches up to it.
 */
function statusLines(journal: DeductionStep[], status: PersonStatus, text: V2Text): string[] {
  const lines: string[] = []

  if (status.placement) {
    const why = whyThisMark(journal, status.placement, text)
    if (status.placement.verdict === 'established') {
      lines.push([text.t('v2.notebook.placement.established'), why].filter(Boolean).join(' '))
    } else if (status.placement.verdict === 'refuted') {
      lines.push([text.t('v2.notebook.placement.refuted'), why].filter(Boolean).join(' '))
    } else {
      lines.push(text.t('v2.notebook.placement.open'))
    }
  } else if (status.candidatesNow.length === 1) {
    lines.push(text.t('v2.notebook.candidates.forced'))
  } else if (status.candidatesNow.length > 1) {
    lines.push(text.t('v2.notebook.candidates.left', { count: status.candidatesNow.length }))
  }

  const refuted = status.exclusions.filter((mark) => mark.verdict === 'refuted')
  if (refuted.length > 0) {
    const why = whyThisMark(journal, refuted[0], text)
    lines.push([text.t('v2.notebook.exclusion.refuted', { count: refuted.length }), why].filter(Boolean).join(' '))
  }

  return lines
}

export function V2SuspectRoster() {
  const { puzzle, state, journal, displayed, solution, selectPerson, runAudit } = useV2Session()
  const { frontier } = useV2Progress()
  const text = useV2Text(puzzle.id)
  const frozen = state.phase !== 'investigating'
  const gaveUp = state.phase === 'gaveUp'
  // Giving up asks for the whole proof outright, so the frontier gate that
  // protects an in-progress notebook from turning into an oracle no longer
  // applies: read the full journal against the solution itself, not against
  // whatever the player's own notebook happened to reach before quitting.
  const showPoint = state.audited || gaveUp
  const statusNotebook = gaveUp ? notebookFrom(solution) : state.notebook
  const statusFrontier = gaveUp ? journal.length : frontier
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

      {!showPoint && (
        <button
          type="button"
          onClick={runAudit}
          className="mk-press mt-2 rounded-[var(--radius-sm)] border-2 border-[var(--color-accent)] px-3 py-1.5 text-sm font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
        >
          {text.t('v2.notebook.open')}
        </button>
      )}

      <ul className="mt-3 grid gap-3">
        {puzzle.people.map((person, i) => {
          const name = text.person(person.id)
          const role = text.role(person.id)
          const voice = text.voice(person.id)
          const isVictim = person.id === puzzle.victimId
          const isSelected = state.selectedPersonId === person.id
          const cell = displayed[person.id]
          const zoneName = cell ? text.zone(puzzle.board.cellsByKey.get(cell)!.zoneId) : null
          const clues = renderV2Clues(text.t, person.constraints, text)
          const pointLines = showPoint ? statusLines(journal, personStatus(journal, statusNotebook, statusFrontier, person.id), text) : []

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
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-serif text-[1.05rem] font-bold italic tracking-tight">{name}</span>
                    {role && <span className="text-xs font-semibold not-italic text-[var(--color-text-muted)]">— {role}</span>}
                    {isVictim && (
                      <span className="rounded-full border border-[#241f1d] bg-[var(--color-danger)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                        {text.t('case.victimBadge')}
                      </span>
                    )}
                  </span>

                  {isVictim ? (
                    <span className="mt-1 block rounded-[0.9rem] border-2 border-[var(--color-danger)] bg-[rgb(200_50_31/0.08)] px-2.5 py-1 text-sm font-semibold text-[var(--color-danger)]">
                      {text.t('v2.play.victimLine')}
                    </span>
                  ) : (
                    voice && <span className="mt-1 block px-0.5 text-sm italic text-[var(--color-text-muted)]">« {voice} »</span>
                  )}

                  {(clues.length > 0 || !isVictim) && (
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
                  )}

                  {zoneName && (
                    <span
                      key={cell}
                      className="mk-pop mt-1.5 inline-block rounded-full border border-[var(--color-success)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-success)]"
                    >
                      ✓ {zoneName}
                    </span>
                  )}

                  {pointLines.length > 0 && (
                    <span className="mt-1.5 flex flex-col gap-0.5 border-t border-dashed border-[var(--color-border)] pt-1.5 text-xs text-[var(--color-text-muted)]">
                      {pointLines.map((line, li) => (
                        <span key={li} className="flex gap-1.5">
                          <span aria-hidden className="text-[var(--color-accent)]">
                            •
                          </span>
                          {line}
                        </span>
                      ))}
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
