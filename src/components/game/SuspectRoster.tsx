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
          const placedCellId = state.placements[character.id]
          const isPlaced = Boolean(placedCellId)
          const placedRoomName = placedCellId
            ? t(`cases:${caseDef.id}.rooms.${caseDef.grid.find((c) => c.id === placedCellId)?.roomId}`)
            : null

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
                className={`flex w-full cursor-grab items-start gap-3 rounded-[var(--radius-md)] border-2 p-3 text-left shadow-[var(--shadow-card)] transition-all active:cursor-grabbing disabled:cursor-default ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                    : isPlaced
                      ? 'border-[var(--color-success)] bg-[var(--color-surface-alt)]'
                      : 'border-[#241f1d] bg-[var(--color-surface)]'
                }`}
              >
                <span className="relative shrink-0">
                  <PersonAvatar
                    name={name}
                    color={character.avatarColor}
                    isVictim={character.isVictim}
                    variantKey={`${caseDef.id}:${character.id}`}
                  />
                  {isPlaced && (
                    <span
                      aria-hidden
                      className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success)] text-xs font-bold text-white ring-[1.5px] ring-[#241f1d]"
                    >
                      ✓
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-[1.05rem] font-bold italic tracking-tight">{name}</span>
                    {character.isVictim && (
                      <span className="rounded-full border border-[#241f1d] bg-[var(--color-danger)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                        {t('case.victimBadge')}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block rounded-[0.9rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 py-1 text-sm text-[var(--color-text-muted)]">
                    {renderClues(t, character.clues, caseDef.id)}
                  </span>
                  {placedRoomName && (
                    <span className="mt-1.5 inline-block rounded-full border border-[var(--color-success)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-success)]">
                      ✓ {placedRoomName}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
