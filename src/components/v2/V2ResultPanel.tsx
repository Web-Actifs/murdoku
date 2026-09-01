import { useEffect, useState } from 'react'
import { rowColClash, violatedConstraints } from '../../core/constraints/domain'
import { toAssignment } from '../../core/hints/notebook'
import { assignedCell } from '../../core/model/geometry'
import type { Assignment } from '../../core/model/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { renderV2Clue } from '../../i18n/renderV2Clue'
import { useV2Session } from '../../store/v2Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { personColor } from '../game/planStyle'
import { useV2Text } from './useV2Text'
import { GIVE_UP_PANEL_MS, VERDICT_PANEL_GAP_MS, boardRevealMs } from './verdictChoreography'

/** The murderer's name is the payoff, so it lands a beat after the panel itself. */
const CULPRIT_CARD_DELAY_MS = 180

export function V2ResultPanel() {
  const { puzzle, state, solution, outcome, murdererId, resume, reset } = useV2Session()
  const text = useV2Text(puzzle.id)
  const reducedMotion = useReducedMotion()
  // Remounted per phase by the play screen, so the timer starts fresh on every submission.
  const [revealed, setRevealed] = useState(reducedMotion)

  const { phase } = state
  const solved = outcome.solved
  const placed = outcome.placed

  useEffect(() => {
    if (phase === 'investigating') return
    const wait = reducedMotion ? 0 : phase === 'gaveUp' ? GIVE_UP_PANEL_MS : boardRevealMs(placed, solved) + VERDICT_PANEL_GAP_MS
    const timer = window.setTimeout(() => setRevealed(true), wait)
    return () => window.clearTimeout(timer)
  }, [phase, placed, solved, reducedMotion])

  if (state.phase === 'investigating' || !revealed) return null

  const gaveUp = state.phase === 'gaveUp'
  const won = !gaveUp && outcome.solved
  const victimZone = assignedCell(puzzle.board, solution, puzzle.victimId)?.zoneId

  const titleKey = gaveUp ? 'v2.result.gaveUpTitle' : won ? 'v2.result.solvedTitle' : 'v2.result.wrongTitle'
  const border = gaveUp ? 'border-[var(--color-border)]' : won ? 'border-[var(--color-success)]' : 'border-[var(--color-danger)]'

  // A wrong grid proves nothing, so it gets no name: in V2 the murderer is a
  // consequence of the plan being right, not a separate guess to be graded.
  const revealsMurderer = won || gaveUp

  // "3/5 correct" alone leaves the player guessing which clue their own
  // placement broke. A wrong cell can fail one of that person's own clues,
  // clash with someone else's row/column, or — rarer — pass every local check
  // and still not be the one combination that makes the whole plan work.
  // Submitting requires everyone placed (outcome.complete), so every value here
  // is a real cell by the time this reads it — the cast just says so to TS.
  const assignment = toAssignment(state.notebook) as Assignment
  const whyEntries =
    !gaveUp && !won
      ? outcome.misplaced.map((personId) => {
          const person = puzzle.people.find((p) => p.id === personId)!
          const cell = assignedCell(puzzle.board, assignment, personId)!
          const reasons = violatedConstraints(person.constraints, cell, assignment, puzzle.board, puzzle.people).map((c) =>
            renderV2Clue(text.t, c, text),
          )
          if (reasons.length === 0) {
            const clash = rowColClash(personId, cell, assignment, puzzle.board)
            reasons.push(
              clash
                ? text.t(clash.axis === 'row' ? 'v2.result.whyRowClash' : 'v2.result.whyColClash', { name: text.person(clash.with) })
                : text.t('v2.result.whyFallback'),
            )
          }
          return { personId, reasons }
        })
      : []

  return (
    <div
      role="status"
      className={`mk-verdict rounded-[var(--radius-lg)] border-2 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] ${border}`}
    >
      <h2 className="text-xl font-extrabold">{text.t(titleKey)}</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {text.t('v2.result.placementsCorrect', { correct: outcome.correct, total: outcome.total })}
        {state.hintsUsed > 0 && ` ${text.t('v2.result.hintsUsed', { count: state.hintsUsed })}`}
      </p>

      {whyEntries.length > 0 && (
        <div className="mk-verdict mt-3 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
          <span className="block text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">
            {text.t('v2.result.whyHeading')}
          </span>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {whyEntries.map(({ personId, reasons }) => (
              <li key={personId} className="text-sm">
                <strong>{text.person(personId)}</strong>
                <span className="mt-0.5 flex flex-col text-[var(--color-text-muted)]">
                  {reasons.map((reason, i) => (
                    <span key={i} className="flex gap-1.5">
                      <span aria-hidden className="text-[var(--color-danger)]">
                        •
                      </span>
                      {reason}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {revealsMurderer && (
        <div
          className="mk-verdict mt-4 flex items-start gap-3 rounded-[var(--radius-md)] border-2 border-[#241f1d] bg-[var(--color-surface-alt)] p-3"
          style={{ animationDelay: `${CULPRIT_CARD_DELAY_MS}ms` }}
        >
          {murdererId && (
            <span
              className={`inline-block shrink-0 rounded-[3px] ${won ? 'mk-culprit-out' : ''}`}
              style={won ? { animationDelay: `${CULPRIT_CARD_DELAY_MS}ms, ${CULPRIT_CARD_DELAY_MS + 380}ms` } : undefined}
            >
              <PersonAvatar
                name={text.person(murdererId)}
                color={personColor(`${puzzle.id}:${murdererId}`)}
                variantKey={`${puzzle.id}:${murdererId}`}
                size="lg"
              />
            </span>
          )}
          <span>
            <span className="block text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">{text.t('v2.result.verdictHeading')}</span>
            <span className="mt-1 block text-lg font-extrabold">
              {murdererId
                ? text.t('v2.result.murdererIs', { name: text.person(murdererId) })
                : text.t('v2.result.noMurderer')}
            </span>
            {murdererId && victimZone && (
              <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                {text.t('v2.result.murdererWhy', {
                  name: text.person(murdererId),
                  victim: text.person(puzzle.victimId),
                  zone: text.zone(victimZone),
                })}
              </span>
            )}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!gaveUp && !won && (
          <button
            type="button"
            onClick={resume}
            className="mk-press rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary-contrast)]"
          >
            {text.t('case.closeResult')}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="mk-press rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)]"
        >
          {text.t('case.resetButton')}
        </button>
      </div>
    </div>
  )
}
