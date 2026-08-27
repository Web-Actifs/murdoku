import { useTranslation } from 'react-i18next'
import type { Difficulty } from '../../engine/types'

const colorByTier: Record<Difficulty, string> = {
  1: '#22a35a',
  2: '#65a30d',
  3: '#ca8a04',
  4: '#ea580c',
  5: '#dc2626',
  6: '#7c3aed',
}

export function DifficultyBadge({ difficulty, showDescription = false }: { difficulty: Difficulty; showDescription?: boolean }) {
  const { t } = useTranslation(['common'])

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white"
        style={{ backgroundColor: colorByTier[difficulty] }}
        title={t(`difficulty.${difficulty}.description`)}
      >
        {'●'.repeat(difficulty)}
        {'○'.repeat(6 - difficulty)}
        <span className="ml-0.5">{t(`difficulty.${difficulty}.label`)}</span>
      </span>
      {showDescription && <span className="text-xs text-[var(--color-text-muted)]">{t(`difficulty.${difficulty}.description`)}</span>}
    </span>
  )
}
