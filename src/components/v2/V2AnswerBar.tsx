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
                className={`px-3 py-1.5 text-sm font-bold disabled:opacity-40 ${
                  state.mode === mode ? 'bg-[#241f1d] text-[var(--color-surface)]' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
              >
                {text.t(mode === 'place' ? 'v2.play.modePlace' : 'v2.play.modeCross')}
              </button>
            ))}
          </span>

          {!frozen ? (
            <button
              type="button"
              disabled={!outcome.complete}
              onClick={submit}
              title={outcome.complete ? undefined : text.t('v2.play.solveBlocked', { placed: outcome.placed, total: outcome.total })}
              className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary-contrast)] transition-opacity disabled:opacity-40"
            >
              {text.t('v2.play.solveButton')}
            </button>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)]"
            >
              {text.t('case.resetButton')}
            </button>
          )}

          {!frozen && (
            <>
              <button
                type="button"
                onClick={() => askHint(1)}
                className="rounded-[var(--radius-sm)] border-2 border-[var(--color-accent)] px-3 py-2 text-sm font-bold text-[var(--color-accent)]"
              >
                {text.t('v2.play.hintButton')}
              </button>
              <button
                type="button"
                onClick={giveUp}
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-danger)]"
              >
                {text.t('case.giveUpButton')}
              </button>
            </>
          )}
        </div>

        {state.hint && !frozen && (
          <div className="rounded-[var(--radius-md)] border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-3">
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
                    className={`h-7 w-7 rounded-full text-xs font-bold ${
                      state.hintLevel === level
                        ? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)]'
                        : 'border border-[var(--color-border)] bg-[var(--color-surface)]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </span>
              <button
                type="button"
                onClick={dismissHint}
                className="ml-auto text-xs font-semibold text-[var(--color-text-muted)] underline decoration-dotted"
              >
                {text.t('v2.play.hintDismiss')}
              </button>
            </div>

            <p className="mt-2 text-sm">{renderV2Hint(text.t, state.hint, text)}</p>

            {state.hint.apply && (
              <button
                type="button"
                onClick={applyCurrentHint}
                className="mt-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-bold text-white"
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
