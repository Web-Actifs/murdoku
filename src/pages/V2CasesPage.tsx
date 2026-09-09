import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { loadPuzzle } from '../core/model/loadPuzzle'
import { analyzeDifficulty } from '../core/proof/difficulty'
import { V2DifficultyBadge } from '../components/v2/V2DifficultyBadge'
import { V2HowToPlay } from '../components/v2/V2HowToPlay'
import { v2Cases } from '../data/v2/caseIndex'

export function V2CasesPage() {
  const { t } = useTranslation(['common', 'v2cases'])

  const entries = useMemo(
    () =>
      v2Cases.map((def) => {
        const puzzle = loadPuzzle(def)
        const analyzed = analyzeDifficulty(puzzle)
        const difficulty = def.difficultyOverride
          ? { ...analyzed, category: def.difficultyOverride }
          : analyzed
        return { def, puzzle, difficulty }
      }),
    [],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">{t('v2.picker.heading')}</h1>
        <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-white">{t('v2.picker.badge')}</span>
        <span className="ml-auto">
          <V2HowToPlay />
        </span>
      </div>
      <p className="mt-2 max-w-[75ch] text-[var(--color-text-muted)]">{t('v2.picker.subheading')}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div>
          <span className="block text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">{t('v2.picker.v1Notice.title')}</span>
          <p className="mt-1 max-w-[60ch] text-sm text-[var(--color-text-muted)]">{t('v2.picker.v1Notice.description')}</p>
        </div>
        <Link
          to="/v1"
          className="inline-block shrink-0 rounded-[var(--radius-sm)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold transition-transform hover:scale-105"
        >
          {t('v2.picker.v1Notice.cta')}
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {entries.map(({ def, puzzle, difficulty }, i) => (
          <Link
            key={def.id}
            to={`/v2/jouer/${def.id}`}
            style={{ animationDelay: `${i * 70}ms` }}
            className="mk-card group rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-[#241f1d] hover:shadow-[0_10px_0_rgb(36_31_29/0.14)]"
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

      {/* V3 is a prototype on its own engine, not a sixth case: it gets a card of
          its own rather than a row in the list, so nobody starts it expecting the
          rules they just learned. */}
      <Link
        to="/v3"
        className="mt-10 block rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-accent)] bg-[rgb(202_138_4/0.07)] p-5 transition hover:bg-[rgb(202_138_4/0.14)]"
      >
        <span className="inline-block rounded-full bg-[#241f1d] px-2 py-[1px] text-[0.6rem] font-extrabold uppercase tracking-wide text-[var(--color-surface)]">
          Prototype · V3
        </span>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight">Murdoku Élévation — Le 12, rue des Ormes</h2>
        <p className="mt-1 max-w-[70ch] font-serif text-sm italic text-[var(--color-text-muted)]">
          Une maison sur trois niveaux. La règle des rangées ne vaut que par étage, une pièce peut traverser deux planchers, et les portes
          ne s’ouvrent que sur une déduction. Trois actes, quatorze témoignages.
        </p>
      </Link>

      <p className="mt-8 text-xs text-[var(--color-text-muted)]">
        {t('v2.picker.devNote')}{' '}
        <Link to="/v2/cormoran" className="font-semibold underline decoration-dotted">
          {t('v2.picker.devLink')}
        </Link>
      </p>
    </div>
  )
}
