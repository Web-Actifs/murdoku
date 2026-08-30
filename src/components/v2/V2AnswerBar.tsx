import type { HintLevel } from '../../core/hints/types'
import { renderV2Hint } from '../../i18n/renderV2Hint'
import { useV2Session } from '../../store/v2Session'
import { useV2Text } from './useV2Text'

const LEVELS: HintLevel[] = [1, 2, 3, 4, 5]

export function V2AnswerBar() {
  const { puzzle, state, outcome, askHint, applyCurrentHint, dismissHint, setMode, submit, giveUp, reset } = useV2Session()
  const text = useV2Text(puzzle.id)
  const frozen = state.phase !== 'investigating'

  return (
    <details open className="group rounded-[var(--radius-lg)] bg-[var(--color-surface-alt)] p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold">
        {text.t('v2.play.barHeading')}
        <span aria-hidden className="text-2xl leading-none text-[var(--color-text)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {!frozen && (
            <p className="w-full text-sm text-[var(--color-text-muted)] lg:w-auto lg:flex-1">
              {state.mode === 'place' ? text.t('v2.play.placeHint') : text.t('v2.play.crossHint')}
            </p>
          )}

          <span className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border-2 border-[#241f1d]">
            {(['place', 'cross'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={frozen}
                onClick={() => setMode(mode)}
                aria-pressed={state.mode === mode}
                className={`mk-press px-3 py-1.5 text-sm font-bold disabled:opacity-40 ${
                  state.mode === mode
                    ? 'bg-[#241f1d] text-[var(--color-surface)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'
                }`}
              >
                {text.t(mode === 'place' ? 'v2.play.modePlace' : 'v2.play.modeCross')}
              </button>
            ))}
          </span>

          {!frozen ? (
            <button
              // Remounting on the flip replays the cue, so the last placement is what announces "you can submit now".
              key={outcome.complete ? 'ready' : 'incomplete'}
              type="button"
              disabled={!outcome.complete}
              onClick={submit}
              title={outcome.complete ? undefined : text.t('v2.play.solveBlocked', { placed: outcome.placed, total: outcome.total })}
              className={`mk-press rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary-contrast)] disabled:opacity-40 ${
                outcome.complete ? 'mk-ready' : ''
              }`}
            >
              {text.t('v2.play.solveButton')}
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="mk-press rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-contrast)]"
            >
              {text.t('case.resetButton')}
            </button>
          )}

          {!frozen && (
            <>
              <button
                type="button"
                onClick={() => askHint(1)}
                className="mk-press rounded-[var(--radius-sm)] border-2 border-[var(--color-accent)] px-3 py-2 text-sm font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
              >
                {text.t('v2.play.hintButton')}
              </button>
              <button
                type="button"
                onClick={giveUp}
                className="mk-press rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-danger)]"
              >
                {text.t('case.giveUpButton')}
              </button>
            </>
          )}
        </div>

        {state.hint && !frozen && (
          <div className="mk-slip rounded-[var(--radius-md)] border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">{text.t('v2.play.hintHeading')}</span>
              <span className="flex gap-1">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => askHint(level)}
                    aria-label={text.t('v2.play.hintLevel', { level })}
                    aria-pressed={state.hintLevel === level}
                    className={`mk-press h-7 w-7 rounded-full text-xs font-bold ${
                      state.hintLevel === level
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)] shadow-[0_0_0_3px_rgb(36_31_29/0.12)]'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </span>
              <button
                type="button"
                onClick={dismissHint}
                className="mk-press ml-auto text-xs font-semibold text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-text)]"
              >
                {text.t('v2.play.hintDismiss')}
              </button>
            </div>

            {/* Keyed on the request count so re-asking visibly re-answers, even at the same level. */}
            <p key={state.hintsUsed} className="mk-slip mt-2 text-sm">
              {renderV2Hint(text.t, state.hint, text)}
            </p>

            {state.hint.apply && (
              <button
                type="button"
                onClick={applyCurrentHint}
                className="mk-press mt-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-bold text-white"
              >
                {text.t('v2.play.hintApply')}
              </button>
            )}
          </div>
        )}
      </div>
    </details>
  )
}
