import { useTranslation } from 'react-i18next'
import { useCaseSession } from '../../store/caseSession'

export function ResultPanel() {
  const { t } = useTranslation(['common', 'cases'])
  const { caseDef, state } = useCaseSession()

  if (!state.revealed) return null

  const total = caseDef.characters.length
  const correct = caseDef.characters.filter((c) => state.placements[c.id] === caseDef.solution[c.id]).length
  const accusationCorrect = state.accusationId === caseDef.murdererId
  const murdererName = t(`cases:${caseDef.id}.characters.${caseDef.murdererId}`)

  return (
    <div
      role="status"
      className={`rounded-[var(--radius-lg)] border-2 p-5 shadow-[var(--shadow-card)] ${
        accusationCorrect ? 'border-[var(--color-success)] bg-[var(--color-surface)]' : 'border-[var(--color-danger)] bg-[var(--color-surface)]'
      }`}
    >
      <h2 className="text-xl font-extrabold">{t(accusationCorrect ? 'case.resultCorrectTitle' : 'case.resultIncorrectTitle')}</h2>
      <p className="mt-1">{t('case.resultMurdererIs', { name: murdererName })}</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('case.resultPlacementsCorrect', { correct, total })}</p>
    </div>
  )
}
