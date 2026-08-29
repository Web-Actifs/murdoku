import { useTranslation } from 'react-i18next'
import { useCaseSession } from '../../store/caseSession'

export function AnswerBar() {
  const { t } = useTranslation(['common', 'cases'])
  const { caseDef, state, accuse, reveal, reset, useHint, giveUp } = useCaseSession()

  const suspects = caseDef.characters.filter((c) => !c.isVictim)
  const allPlaced = caseDef.characters.every((c) => state.placements[c.id])
  const canSolve = allPlaced && Boolean(state.accusationId) && !state.revealed
  const hintsRemaining = caseDef.hintsAllowed - state.hintsUsed

  return (
    <details open className="group rounded-[var(--radius-lg)] bg-[var(--color-surface-alt)] p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold">
        {t('case.accusationHeading')}
        <span aria-hidden className="text-2xl leading-none text-[var(--color-text)] transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!state.revealed && <p className="w-full text-sm text-[var(--color-text-muted)] lg:w-auto lg:flex-1">{t('case.selectHint')}</p>}

        <select
          id="accusation"
          aria-label={t('case.accusationHeading')}
          className="min-w-[220px] flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
          value={state.accusationId ?? ''}
          disabled={state.revealed}
          onChange={(e) => accuse(e.target.value)}
        >
          <option value="" disabled>
            {t('case.accusationPlaceholder')}
          </option>
          {suspects.map((s) => (
            <option key={s.id} value={s.id}>
              {t(`cases:${caseDef.id}.characters.${s.id}`)}
            </option>
          ))}
        </select>

        {!state.revealed ? (
          <button
            type="button"
            disabled={!canSolve}
            onClick={reveal}
            className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary-contrast)] transition-opacity disabled:opacity-40"
          >
            {t('case.solveButton')}
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)]"
          >
            {t('case.resetButton')}
          </button>
        )}

        {!state.revealed && (
          <>
            <button
              type="button"
              disabled={hintsRemaining <= 0}
              onClick={useHint}
              className="rounded-[var(--radius-sm)] border-2 border-[var(--color-accent)] px-3 py-2 text-sm font-bold text-[var(--color-accent)] transition-opacity disabled:opacity-40"
            >
              {hintsRemaining > 0 ? t('case.hintButton', { remaining: hintsRemaining }) : t('case.hintButtonNone')}
            </button>
            <button
              type="button"
              onClick={giveUp}
              className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] underline decoration-dotted hover:text-[var(--color-danger)]"
            >
              {t('case.giveUpButton')}
            </button>
          </>
        )}
      </div>
    </details>
  )
}
