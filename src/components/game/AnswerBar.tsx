import { useTranslation } from 'react-i18next'
import { useCaseSession } from '../../store/caseSession'

export function AnswerBar() {
  const { t } = useTranslation(['common', 'cases'])
  const { caseDef, state, accuse, reveal, reset } = useCaseSession()

  const suspects = caseDef.characters.filter((c) => !c.isVictim)
  const allPlaced = caseDef.characters.every((c) => state.placements[c.id])
  const canSolve = allPlaced && Boolean(state.accusationId) && !state.revealed

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface-alt)] p-4">
      {!state.revealed && <p className="mb-3 text-sm text-[var(--color-text-muted)]">{t('case.selectHint')}</p>}

      <label className="block text-sm font-bold" htmlFor="accusation">
        {t('case.accusationHeading')}
      </label>
      <select
        id="accusation"
        className="mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
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

      <div className="mt-4 flex gap-2">
        {!state.revealed ? (
          <button
            type="button"
            disabled={!canSolve}
            onClick={reveal}
            className="flex-1 rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary-contrast)] transition-opacity disabled:opacity-40"
          >
            {t('case.solveButton')}
          </button>
        ) : (
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-[var(--radius-sm)] border-2 border-[var(--color-primary)] px-4 py-2 font-bold text-[var(--color-primary)]"
          >
            {t('case.resetButton')}
          </button>
        )}
      </div>
    </div>
  )
}
