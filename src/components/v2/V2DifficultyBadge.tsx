import { useTranslation } from 'react-i18next'
import type { DifficultyCategory } from '../../core/proof/difficulty'

/**
 * V1's badge reads an authored 1-6 level; V2 has no such field — difficulty is
 * measured off the proof itself, so the badge shows the four analyzer categories
 * and fills the pips from the measured score instead.
 */
const PIPS: Record<DifficultyCategory, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 }

const COLOR: Record<DifficultyCategory, string> = {
  beginner: '#22a35a',
  intermediate: '#ca8a04',
  advanced: '#ea580c',
  expert: '#7c3aed',
}

export function V2DifficultyBadge({
  category,
  score,
  showDescription = false,
}: {
  category: DifficultyCategory
  score?: number
  showDescription?: boolean
}) {
  const { t } = useTranslation(['common'])
  const filled = PIPS[category]

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white"
        style={{ backgroundColor: COLOR[category] }}
        title={t(`v2.difficulty.${category}.description`)}
      >
        <span aria-hidden className="inline-flex items-center gap-[1px] leading-none">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className={`mk-pop inline-block ${i < filled ? '' : 'opacity-50'}`} style={{ animationDelay: `${i * 55}ms` }}>
              {i < filled ? '●' : '○'}
            </span>
          ))}
        </span>
        <span className="ml-0.5">{t(`v2.difficulty.${category}.label`)}</span>
      </span>
      {score !== undefined && (
        <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          {t('v2.difficulty.score', { score })}
        </span>
      )}
      {showDescription && <span className="text-xs text-[var(--color-text-muted)]">{t(`v2.difficulty.${category}.description`)}</span>}
    </span>
  )
}
