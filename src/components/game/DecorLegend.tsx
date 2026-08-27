import { useTranslation } from 'react-i18next'
import type { DecorType } from '../../engine/types'
import { useCaseSession } from '../../store/caseSession'
import { DecorIcon } from '../icons/DecorIcon'

export function DecorLegend() {
  const { t } = useTranslation(['common', 'decorLabels'])
  const { caseDef } = useCaseSession()

  const types = Array.from(new Set(caseDef.grid.flatMap((cell) => cell.decor ?? []))) as DecorType[]

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm shadow-[var(--shadow-card)]">
      {types.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {types.map((type) => (
            <span
              key={type}
              className="flex items-center gap-1.5 rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface-alt)] py-0.5 pl-1 pr-2.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <DecorIcon type={type} className="h-5 w-5" />
              </span>
              <span className="text-xs font-semibold text-[var(--color-text)]">{t(`decorLabels:${type}`)}</span>
            </span>
          ))}
        </div>
      )}
      <p className={`text-xs text-[var(--color-text-muted)] ${types.length > 0 ? 'border-t border-[var(--color-border)] pt-2' : ''}`}>
        {t('case.rowColumnHint')}
      </p>
    </div>
  )
}
