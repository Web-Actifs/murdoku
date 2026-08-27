import { useTranslation } from 'react-i18next'
import { renderClues } from '../../i18n/renderClue'
import { useCaseSession } from '../../store/caseSession'
import { PersonAvatar } from './PersonAvatar'

export function ResultPanel() {
  const { t } = useTranslation(['common', 'cases', 'clues', 'decor'])
  const { caseDef, state } = useCaseSession()

  if (!state.revealed) return null

  const total = caseDef.characters.length
  const correct = caseDef.characters.filter((c) => state.placements[c.id] === caseDef.solution[c.id]).length
  const accusationCorrect = state.accusationId === caseDef.murdererId
  const murdererName = t(`cases:${caseDef.id}.characters.${caseDef.murdererId}`)

  const titleKey = state.gaveUp ? 'case.resultGaveUpTitle' : accusationCorrect ? 'case.resultCorrectTitle' : 'case.resultIncorrectTitle'
  const borderColor = state.gaveUp ? 'border-[var(--color-border)]' : accusationCorrect ? 'border-[var(--color-success)]' : 'border-[var(--color-danger)]'

  return (
    <div role="status" className={`rounded-[var(--radius-lg)] border-2 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] ${borderColor}`}>
      <h2 className="text-xl font-extrabold">{t(titleKey)}</h2>
      <p className="mt-1">{t('case.resultMurdererIs', { name: murdererName })}</p>
      {!state.gaveUp && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{t('case.resultPlacementsCorrect', { correct, total })}</p>}

      <h3 className="mt-4 text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{t('case.explanationsHeading')}</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {caseDef.characters.map((character) => {
          const wasCorrect = state.placements[character.id] === caseDef.solution[character.id]
          const name = t(`cases:${caseDef.id}.characters.${character.id}`)
          return (
            <li key={character.id} className="flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2 text-sm">
              <PersonAvatar name={name} color={character.avatarColor} isVictim={character.isVictim} size="sm" />
              <span>
                <span className="font-bold">{name}</span>{' '}
                {!state.gaveUp && (
                  <span className={wasCorrect ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                    ({t(wasCorrect ? 'case.explanationCorrect' : 'case.explanationCorrected')})
                  </span>
                )}
                <span className="block text-[var(--color-text-muted)]">{renderClues(t, character.clues, caseDef.id)}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
