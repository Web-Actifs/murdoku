import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DifficultyBadge } from '../components/game/DifficultyBadge'
import { cases } from '../data/caseIndex'

export function HomePage() {
  const { t } = useTranslation(['common', 'cases'])
  const sortedCases = [...cases].sort((a, b) => a.difficulty - b.difficulty)

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight">{t('home.heading')}</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">{t('home.subheading')}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {sortedCases.map((c) => (
          <Link
            key={c.id}
            to={`/affaires/${c.id}`}
            className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1"
          >
            <DifficultyBadge difficulty={c.difficulty} />
            <h2 className="mt-3 text-xl font-bold">{t(`cases:${c.titleKey}`)}</h2>
            {c.flavorTextKey && <p className="mt-2 text-sm italic text-[var(--color-text-muted)]">{t(`cases:${c.flavorTextKey}`)}</p>}
            <span className="mt-4 inline-block rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-contrast)] transition-transform group-hover:scale-105">
              {t('home.play')}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
