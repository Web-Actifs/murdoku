import { useTranslation } from 'react-i18next'
import { gridBounds } from '../../engine/grid'
import { useCaseSession } from '../../store/caseSession'
import { DecorIcon } from '../icons/DecorIcon'
import { PersonAvatar } from './PersonAvatar'

const roomPalette = [
  { bg: '#e7f3ee', border: '#bfe3d3' },
  { bg: '#eef0fb', border: '#cdd3f2' },
  { bg: '#fdf0e6', border: '#f3d3b3' },
  { bg: '#fdeaf1', border: '#f4c6dc' },
  { bg: '#eef7e3', border: '#cfe9ac' },
  { bg: '#e9f6fb', border: '#bfe6f5' },
]

export function FloorPlanGrid() {
  const { t } = useTranslation(['cases'])
  const { caseDef, state, clickCell } = useCaseSession()
  const { grid, rooms, characters } = caseDef
  const bounds = gridBounds(grid)

  const roomColor = new Map(rooms.map((room, i) => [room.id, roomPalette[i % roomPalette.length]]))
  const characterAt = (cellId: string) => characters.find((c) => state.placements[c.id] === cellId)

  const roomLabelCellId = new Map<string, string>()
  for (const room of rooms) {
    const cells = grid.filter((c) => c.roomId === room.id)
    const anchor = cells.reduce((best, c) => (c.y < best.y || (c.y === best.y && c.x < best.x) ? c : best))
    roomLabelCellId.set(anchor.id, room.id)
  }

  return (
    <div
      className="grid gap-1.5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
      style={{
        gridTemplateColumns: `repeat(${bounds.maxX - bounds.minX + 1}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${bounds.maxY - bounds.minY + 1}, minmax(0, 1fr))`,
      }}
    >
      {grid.map((cell) => {
        const occupant = characterAt(cell.id)
        const color = roomColor.get(cell.roomId)
        const roomIdForLabel = roomLabelCellId.get(cell.id)
        const canPlaceHere = Boolean(state.selectedCharacterId) && !occupant
        const isPickedUp = state.selectedCharacterId === occupant?.id

        return (
          <button
            key={cell.id}
            type="button"
            onClick={() => clickCell(cell.id)}
            disabled={state.revealed}
            style={{
              gridColumn: cell.x - bounds.minX + 1,
              gridRow: cell.y - bounds.minY + 1,
              backgroundColor: color?.bg,
              borderColor: color?.border,
            }}
            className={`relative flex aspect-square min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 p-1 transition-transform enabled:hover:z-10 enabled:hover:scale-105 disabled:cursor-default ${
              canPlaceHere ? 'ring-2 ring-[var(--color-accent)] ring-offset-1' : ''
            }`}
          >
            {roomIdForLabel && (
              <span className="absolute left-1 top-1 max-w-[90%] truncate text-[0.6rem] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t(`cases:${caseDef.id}.rooms.${roomIdForLabel}`)}
              </span>
            )}

            {occupant ? (
              <PersonAvatar
                name={t(`cases:${caseDef.id}.characters.${occupant.id}`)}
                color={occupant.avatarColor}
                isVictim={occupant.isVictim}
                size="sm"
              />
            ) : (
              cell.decor?.map((d) => <DecorIcon key={d} type={d} className="h-5 w-5 text-[var(--color-text-muted)] opacity-70" />)
            )}

            {isPickedUp && <span className="absolute inset-0 rounded-md border-2 border-dashed border-[var(--color-accent)]" />}
          </button>
        )
      })}
    </div>
  )
}
