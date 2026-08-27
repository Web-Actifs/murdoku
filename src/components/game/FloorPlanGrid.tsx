import { useState, type DragEvent } from 'react'
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

export const CHARACTER_DRAG_TYPE = 'application/x-murdoku-character'

export function FloorPlanGrid() {
  const { t } = useTranslation(['cases'])
  const { caseDef, state, clickCell, placeAtCell } = useCaseSession()
  const { grid, rooms, characters } = caseDef
  const bounds = gridBounds(grid)
  const [dragOverCellId, setDragOverCellId] = useState<string | null>(null)

  const roomColor = new Map(rooms.map((room, i) => [room.id, roomPalette[i % roomPalette.length]]))
  const characterAt = (cellId: string) => characters.find((c) => state.placements[c.id] === cellId)

  const roomLabelCellId = new Map<string, string>()
  for (const room of rooms) {
    const cells = grid.filter((c) => c.roomId === room.id)
    const anchor = cells.reduce((best, c) => (c.y < best.y || (c.y === best.y && c.x < best.x) ? c : best))
    roomLabelCellId.set(anchor.id, room.id)
  }

  function handleDragOver(e: DragEvent<HTMLButtonElement>, cellId: string) {
    if (state.revealed) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCellId(cellId)
  }

  function handleDrop(e: DragEvent<HTMLButtonElement>, cellId: string) {
    e.preventDefault()
    setDragOverCellId(null)
    const characterId = e.dataTransfer.getData(CHARACTER_DRAG_TYPE)
    if (characterId) placeAtCell(characterId, cellId)
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
        const isDragTarget = dragOverCellId === cell.id

        return (
          <button
            key={cell.id}
            type="button"
            onClick={() => clickCell(cell.id)}
            onDragOver={(e) => handleDragOver(e, cell.id)}
            onDragLeave={() => setDragOverCellId((id) => (id === cell.id ? null : id))}
            onDrop={(e) => handleDrop(e, cell.id)}
            disabled={state.revealed}
            style={{
              gridColumn: cell.x - bounds.minX + 1,
              gridRow: cell.y - bounds.minY + 1,
              backgroundColor: color?.bg,
              borderColor: color?.border,
            }}
            className={`relative flex aspect-square min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 p-1 transition-transform enabled:hover:z-10 enabled:hover:scale-105 disabled:cursor-default ${
              canPlaceHere || isDragTarget ? 'ring-2 ring-[var(--color-accent)] ring-offset-1' : ''
            } ${isDragTarget ? 'scale-105' : ''}`}
          >
            {roomIdForLabel && (
              <span className="absolute left-1 top-1 max-w-[90%] truncate text-[0.6rem] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {t(`cases:${caseDef.id}.rooms.${roomIdForLabel}`)}
              </span>
            )}

            {occupant ? (
              <span
                draggable={!state.revealed}
                onDragStart={(e) => {
                  e.dataTransfer.setData(CHARACTER_DRAG_TYPE, occupant.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <PersonAvatar
                  name={t(`cases:${caseDef.id}.characters.${occupant.id}`)}
                  color={occupant.avatarColor}
                  isVictim={occupant.isVictim}
                  size="md"
                />
              </span>
            ) : (
              cell.decor?.map((d) => (
                <span key={d} className="flex h-[65%] w-[65%] items-center justify-center rounded-full bg-white/70 shadow-sm">
                  <DecorIcon type={d} className="h-2/3 w-2/3 text-[var(--color-text)]" />
                </span>
              ))
            )}

            {isPickedUp && <span className="absolute inset-0 rounded-md border-2 border-dashed border-[var(--color-accent)]" />}
          </button>
        )
      })}
    </div>
  )
}
