import { useTranslation } from 'react-i18next'
import { renderClues } from '../../i18n/renderClue'
import { useCaseSession } from '../../store/caseSession'
import { CHARACTER_DRAG_TYPE } from './FloorPlanGrid'
import { PersonAvatar } from './PersonAvatar'

export function SuspectRoster() {
  const { t } = useTranslation(['common', 'cases', 'clues', 'decor'])
  const { caseDef, state, selectSuspect } = useCaseSession()

  return (
    <div>
      <h2 className="text-lg font-bold">{t('case.suspectsHeading')}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {caseDef.characters.map((character) => {
          const name = t(`cases:${caseDef.id}.characters.${character.id}`)
          const isSelected = state.selectedCharacterId === character.id
          const isPlaced = Boolean(state.placements[character.id])

          return (
            <li key={character.id}>
              <button
                type="button"
                disabled={state.revealed}
                onClick={() => selectSuspect(character.id)}
                draggable={!state.revealed}
                onDragStart={(e) => {
                  e.dataTransfer.setData(CHARACTER_DRAG_TYPE, character.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className={`flex w-full cursor-grab items-start gap-3 rounded-[var(--radius-md)] border-2 bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-card)] transition-opacity active:cursor-grabbing disabled:cursor-default ${
                  isSelected ? 'border-[var(--color-accent)]' : 'border-transparent'
                } ${isPlaced && !isSelected ? 'opacity-60' : ''}`}
              >
                <PersonAvatar name={name} color={character.avatarColor} isVictim={character.isVictim} />
                <span>
                  <span className="flex items-center gap-2 font-bold">
                    {name}
                    {character.isVictim && (
                      <span className="rounded-full bg-[var(--color-danger)] px-2 py-0.5 text-[0.65rem] font-bold uppercase text-white">
                        {t('case.victimBadge')}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-[var(--color-text-muted)]">
                    {renderClues(t, character.clues, caseDef.id)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
