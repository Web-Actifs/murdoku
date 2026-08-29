import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { loadPuzzle } from '../core/model/loadPuzzle'
import { analyzeDifficulty } from '../core/proof/difficulty'
import { V2DifficultyBadge } from '../components/v2/V2DifficultyBadge'
import { v2Cases } from '../data/v2/caseIndex'

export function V2CasesPage() {
  const { t } = useTranslation(['common', 'v2cases'])

  const entries = useMemo(
    () =>
      v2Cases.map((def) => {
        const puzzle = loadPuzzle(def)
        return { def, puzzle, difficulty: analyzeDifficulty(puzzle) }
      }),
    [],
  )

  return (
    <div>
      <Link to="/" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        ← {t('case.backToHome')}
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('v2.picker.heading')}</h1>
        <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-white">{t('v2.picker.badge')}</span>
      </div>
      <p className="mt-2 max-w-[75ch] text-[var(--color-text-muted)]">{t('v2.picker.subheading')}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {entries.map(({ def, puzzle, difficulty }) => (
          <Link
            key={def.id}
            to={`/v2/jouer/${def.id}`}
            className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1"
          >
            <V2DifficultyBadge category={difficulty.category} score={difficulty.score} />
            <h2 className="mt-3 text-xl font-bold">{t(`v2cases:${def.id}.title`)}</h2>
            <p className="mt-2 text-sm italic text-[var(--color-text-muted)]">{t(`v2cases:${def.id}.flavorText`)}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              {t('v2.picker.stats', {
                people: puzzle.people.length,
                rows: puzzle.board.rows,
                cols: puzzle.board.cols,
                steps: difficulty.deductionCount,
              })}
            </p>
            <span className="mt-4 inline-block rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-contrast)] transition-transform group-hover:scale-105">
              {t('home.play')}
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs text-[var(--color-text-muted)]">
        {t('v2.picker.devNote')}{' '}
        <Link to="/v2/cormoran" className="font-semibold underline decoration-dotted">
          {t('v2.picker.devLink')}
        </Link>
      </p>
    </div>
  )
}
