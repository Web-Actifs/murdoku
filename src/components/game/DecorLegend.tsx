import { useTranslation } from 'react-i18next'
import type { DecorType } from '../../engine/types'
import { useCaseSession } from '../../store/caseSession'
import { DecorIcon } from '../icons/DecorIcon'

export function DecorLegend() {
  const { t } = useTranslation(['decorLabels'])
  const { caseDef } = useCaseSession()

  const types = Array.from(new Set(caseDef.grid.flatMap((cell) => cell.decor ?? []))) as DecorType[]
  if (types.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-sm shadow-[var(--shadow-card)]">
      {types.map((type) => (
        <span key={type} className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-alt)]">
            <DecorIcon type={type} className="h-4 w-4 text-[var(--color-text)]" />
          </span>
          <span className="text-[var(--color-text-muted)]">{t(`decorLabels:${type}`)}</span>
        </span>
      ))}
    </div>
  )
}
