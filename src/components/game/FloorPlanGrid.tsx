import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { gridBounds } from '../../engine/grid'
import { useCaseSession } from '../../store/caseSession'
import { DecorIcon } from '../icons/DecorIcon'
import { PersonAvatar } from './PersonAvatar'

/*
 * Floor plan chrome, styled after a printed puzzle-book plan:
 * - one heavy ink wall around the plan and between rooms, hairlines inside a room
 * - muted retro fills, some rooms tiled (checkerboard / diamond lattice)
 * - room names on little rounded "sticker" tags overlapping the wall
 */

const INK = '#241f1d'
const WALL = `3px solid ${INK}`
const HAIRLINE = '1px solid rgb(36 31 29 / 0.16)'

type RoomStyle = { bg: string; tile: string; pattern: 'flat' | 'check' | 'diamond' }

const roomPalette: RoomStyle[] = [
  { bg: '#a9c5be', tile: '#93b4ac', pattern: 'diamond' }, // dusty teal
  { bg: '#e2a794', tile: '#cd8b76', pattern: 'check' }, // faded rust
  { bg: '#c9c2dd', tile: '#b5accd', pattern: 'flat' }, // washed purple
  { bg: '#dfc98d', tile: '#cbb373', pattern: 'check' }, // mustard
  { bg: '#b7cad9', tile: '#a1b8ca', pattern: 'diamond' }, // powder blue
  { bg: '#d0d4c6', tile: '#bec3b2', pattern: 'flat' }, // stone
  { bg: '#c6b6a0', tile: '#b3a189', pattern: 'check' }, // taupe
]

const LABEL_TILT = [-2, 1.6, -1.2, 2.2, -1.6, 1.1]

function patternStyle(style: RoomStyle): CSSProperties {
  if (style.pattern === 'check') {
    return {
      backgroundImage: `conic-gradient(${style.tile} 0 25%, ${style.bg} 0 50%, ${style.tile} 0 75%, ${style.bg} 0)`,
      backgroundSize: '100% 100%',
    }
  }
  if (style.pattern === 'diamond') {
    return {
      backgroundImage:
        `repeating-linear-gradient(45deg, ${style.tile} 0 1.5px, transparent 1.5px 13px),` +
        `repeating-linear-gradient(-45deg, ${style.tile} 0 1.5px, transparent 1.5px 13px)`,
    }
  }
  return {}
}

export const CHARACTER_DRAG_TYPE = 'application/x-murdoku-character'

export function FloorPlanGrid() {
  const { t } = useTranslation(['cases'])
  const { caseDef, state, clickCell, placeAtCell } = useCaseSession()
  const { grid, rooms, characters } = caseDef
  const bounds = gridBounds(grid)
  const [dragOverCellId, setDragOverCellId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.selectedCharacterId) {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [state.selectedCharacterId])

  const roomStyle = new Map(rooms.map((room, i) => [room.id, roomPalette[i % roomPalette.length]]))
  const roomTilt = new Map(rooms.map((room, i) => [room.id, LABEL_TILT[i % LABEL_TILT.length]]))
  const cellAt = new Map(grid.map((c) => [`${c.x},${c.y}`, c]))

  const displayPlacements = state.revealed ? caseDef.solution : state.placements
  const characterAt = (cellId: string) => characters.find((c) => displayPlacements[c.id] === cellId)
  const playerHadWrongGuessAt = (cellId: string) => {
    if (!state.revealed || state.gaveUp) return false
    const correct = characters.find((c) => caseDef.solution[c.id] === cellId)
    const guessed = characters.find((c) => state.placements[c.id] === cellId)
    return correct?.id !== guessed?.id
  }

  /** Label sits on the room's bottom-left cell so the sticker straddles the wall. */
  const roomLabelCellId = new Map<string, string>()
  for (const room of rooms) {
    const cells = grid.filter((c) => c.roomId === room.id)
    const anchor = cells.reduce((best, c) => (c.y > best.y || (c.y === best.y && c.x < best.x) ? c : best))
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
    <div ref={containerRef} className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 pb-6 shadow-[var(--shadow-card)]">
      <div
        className="grid rounded-[3px]"
        style={{
          gridTemplateColumns: `repeat(${bounds.maxX - bounds.minX + 1}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${bounds.maxY - bounds.minY + 1}, minmax(0, 1fr))`,
          border: `3px solid ${INK}`,
          backgroundColor: INK,
        }}
      >
        {grid.map((cell) => {
          const occupant = characterAt(cell.id)
          const style = roomStyle.get(cell.roomId) ?? roomPalette[0]
          const roomIdForLabel = roomLabelCellId.get(cell.id)
          const canPlaceHere = Boolean(state.selectedCharacterId) && !occupant
          const isPickedUp = state.selectedCharacterId === occupant?.id
          const isDragTarget = dragOverCellId === cell.id
          const isWrongGuess = playerHadWrongGuessAt(cell.id)

          const neighbor = (dx: number, dy: number) => cellAt.get(`${cell.x + dx},${cell.y + dy}`)
          const isWall = (dx: number, dy: number) => {
            const n = neighbor(dx, dy)
            return !n || n.roomId !== cell.roomId
          }

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
                backgroundColor: style.bg,
                ...patternStyle(style),
                borderTop: isWall(0, -1) ? WALL : HAIRLINE,
                borderLeft: isWall(-1, 0) ? WALL : HAIRLINE,
                borderRight: neighbor(1, 0) ? 'none' : WALL,
                borderBottom: neighbor(0, 1) ? 'none' : WALL,
                zIndex: roomIdForLabel ? 20 : undefined,
              }}
              className={`relative flex aspect-square min-h-14 items-center justify-center p-1 transition-shadow enabled:hover:z-30 disabled:cursor-default ${
                canPlaceHere || isDragTarget
                  ? 'shadow-[inset_0_0_0_3px_var(--color-accent)]'
                  : 'enabled:hover:shadow-[inset_0_0_0_3px_rgb(36_31_29/0.35)]'
              }`}
            >
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
                    variantKey={`${caseDef.id}:${occupant.id}`}
                    size="md"
                  />
                  {state.revealed && !state.gaveUp && (
                    <span
                      aria-hidden
                      className={`absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ring-[1.5px] ring-[#241f1d] ${
                        isWrongGuess ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-success)]'
                      }`}
                    >
                      {isWrongGuess ? '✗' : '✓'}
                    </span>
                  )}
                </span>
              ) : (
                cell.decor && cell.decor.length > 0 && (
                  <span className="flex h-full w-full items-center justify-center gap-0.5">
                    {cell.decor.map((d) => (
                      <DecorIcon key={d} type={d} className="h-[72%] w-[72%] max-w-full" />
                    ))}
                  </span>
                )
              )}

              {roomIdForLabel && (
                <span
                  className="pointer-events-none absolute -bottom-[9px] left-1/2 max-w-[190%] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface)] px-1.5 py-[1px] text-[0.5rem] font-extrabold uppercase leading-[1.35] tracking-[0.04em] text-[#241f1d] shadow-[0_1.5px_0_rgb(36_31_29/0.35)]"
                  style={{ transform: `translateX(-50%) rotate(${roomTilt.get(roomIdForLabel) ?? 0}deg)` }}
                >
                  {t(`cases:${caseDef.id}.rooms.${roomIdForLabel}`)}
                </span>
              )}

              {isPickedUp && <span className="absolute inset-0 border-2 border-dashed border-[var(--color-accent)]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
