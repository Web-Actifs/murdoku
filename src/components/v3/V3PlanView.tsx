import { useState, type CSSProperties, type DragEvent } from 'react'
import { cellKey } from '../../core3/model/geometry'
import type { Cell, SceneObject } from '../../core3/model/types'
import { useV3Session } from '../../store/v3Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { HAIRLINE, INK, LABEL_TILT, WALL, paperTilt, patternStyle, personColor } from '../game/planStyle'
import { footprintOf } from '../v2/footprint'
import { V3ObjectArt, cellsOnFloor } from './V3ObjectArt'
import { useV3Text } from './useV3Text'
import { roomStyles } from './v3Style'

export const V3_PERSON_DRAG_TYPE = 'application/x-murdoku-v3-person'

const Z_FURNITURE = 1
const Z_TILE = 2
const Z_ROOM_LABEL = 20

/**
 * One level, drawn flat — the surface the player actually plays on. V2's plan,
 * with two additions that only make sense in a building:
 *
 * - a **locked level** is drawn in full and cannot be touched. The player can see
 *   the whole house from the first minute; what a door gates is access, not
 *   knowledge. Hiding the geometry would make the engine's own deductions
 *   unfair, since propagation reasons over the whole building.
 * - every occupied cell carries a **plumb badge** when somebody stands directly
 *   over or under it. That is the flat view's only way to show the axis the
 *   third dimension adds, and it is what makes "exactement au-dessus" checkable
 *   without leaving the plan.
 */
export function V3PlanView({ floor }: { floor: number }) {
  const { def, puzzle, state, displayed, blocked, accessible, clickCell, placeAtCell } = useV3Session()
  const text = useV3Text(def)
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const { board } = puzzle
  const open = accessible(floor)
  const frozen = state.phase !== 'investigating'
  const styles = roomStyles(def)
  const roomTilt = new Map(def.rooms.map((room, i) => [room.id, LABEL_TILT[i % LABEL_TILT.length]]))

  const cells = board.cells.filter((c) => c.floor === floor)
  const cellsHere = new Map(cells.map((c) => [`${c.row}:${c.col}`, c]))

  const furniture = board.objects.filter((o) => o.type !== 'window' && cellsOnFloor(o, floor).length > 0)
  const objectByCell = new Map<string, SceneObject>()
  for (const object of furniture) {
    for (const ref of object.cells) if (ref.floor === floor) objectByCell.set(cellKey(ref), object)
  }

  /** The room tag straddles the wall at the room's bottom-left cell on this level. */
  const roomLabelCell = new Map<string, string>()
  for (const room of def.rooms) {
    const own = cells.filter((c) => c.roomId === room.id)
    if (own.length === 0) continue
    const anchor = own.reduce((best, c) => (c.row > best.row || (c.row === best.row && c.col < best.col) ? c : best))
    roomLabelCell.set(cellKey(anchor), room.id)
  }

  const occupantAt = (key: string) => def.people.find((p) => displayed[p.id] === key)
  const crossedAt = (key: string) =>
    def.people.filter((p) => (state.exclusions[p.id] ?? []).includes(key) && displayed[p.id] !== key)

  const neighborOf = (cell: Cell, dr: number, dc: number) => cellsHere.get(`${cell.row + dr}:${cell.col + dc}`)
  const isWall = (cell: Cell, dr: number, dc: number) => {
    const n = neighborOf(cell, dr, dc)
    return !n || n.roomId !== cell.roomId
  }

  const edgeStyle = (cell: Cell, dr: number, dc: number) => {
    if (isWall(cell, dr, dc)) return WALL
    const mine = objectByCell.get(cellKey(cell))
    if (mine && objectByCell.get(`${cell.floor}:${cell.row + dr}:${cell.col + dc}`) === mine) return 'none'
    return HAIRLINE
  }

  const axis = hovered ? cellsHere.get(hovered.split(':').slice(1).join(':')) : undefined

  function handleDrop(e: DragEvent<HTMLButtonElement>, key: string) {
    e.preventDefault()
    setDragOver(null)
    const personId = e.dataTransfer.getData(V3_PERSON_DRAG_TYPE)
    if (personId) placeAtCell(personId, key)
  }

  return (
    <div className="relative">
      <div
        className="grid rounded-[3px]"
        style={{
          gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${board.rows}, minmax(0, 1fr))`,
          border: `3px solid ${INK}`,
          backgroundColor: INK,
          opacity: open ? 1 : 0.5,
          filter: open ? undefined : 'grayscale(0.65)',
        }}
      >
        {Array.from({ length: board.rows * board.cols }, (_, i) => ({ row: Math.floor(i / board.cols), col: i % board.cols }))
          .filter((c) => !cellsHere.has(`${c.row}:${c.col}`))
          .map((c) => (
            <span
              key={`void:${c.row}:${c.col}`}
              aria-hidden
              className="pointer-events-none bg-[var(--color-surface)]"
              style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
            />
          ))}

        {cells.map((cell) => {
          const style = styles.get(cell.roomId)!
          return (
            <span
              key={`floor:${cellKey(cell)}`}
              aria-hidden
              className="pointer-events-none"
              style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1, backgroundColor: style.bg, ...patternStyle(style) }}
            />
          )
        })}

        {furniture.map((object) => {
          const own = cellsOnFloor(object, floor)
          const footprint = footprintOf(own)
          return (
            <span
              key={`art:${object.id}`}
              className="pointer-events-none relative flex items-start justify-center"
              style={{
                gridColumn: `${footprint.minCol + 1} / span ${footprint.cols}`,
                gridRow: `${footprint.minRow + 1} / span ${footprint.rows}`,
                zIndex: Z_FURNITURE,
              }}
            >
              <V3ObjectArt object={object} floor={floor} className="absolute inset-0 h-full w-full opacity-70" />
              <span className="relative mt-[3px] max-w-[160%] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[rgb(255_243_226/0.85)] px-1 text-[0.5rem] font-bold uppercase leading-[1.5] tracking-wide text-[#241f1d]/80">
                {text.object(object.id)}
              </span>
            </span>
          )
        })}

        {cells.map((cell) => {
          const key = cellKey(cell)
          const occupant = occupantAt(key)
          const isBlocked = blocked.has(key)
          const roomIdForLabel = roomLabelCell.get(key)
          const crossed = crossedAt(key)
          const onAxis = axis && (axis.row === cell.row || axis.col === cell.col)

          const above = def.people.find((p) => displayed[p.id] === `${floor + 1}:${cell.row}:${cell.col}`)
          const below = def.people.find((p) => displayed[p.id] === `${floor - 1}:${cell.row}:${cell.col}`)

          return (
            <button
              key={key}
              type="button"
              disabled={!open || frozen || (isBlocked && !occupant)}
              onClick={() => clickCell(key)}
              onMouseEnter={() => setHovered(key)}
              onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
              onDragOver={(e) => {
                if (!open || frozen || isBlocked) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOver(key)
              }}
              onDragLeave={() => setDragOver((c) => (c === key ? null : c))}
              onDrop={(e) => handleDrop(e, key)}
              aria-label={`${text.room(cell.roomId)} — rangée ${cell.row + 1}, travée ${cell.col + 1}`}
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
                borderTop: edgeStyle(cell, -1, 0),
                borderLeft: edgeStyle(cell, 0, -1),
                borderRight: neighborOf(cell, 0, 1) ? 'none' : WALL,
                borderBottom: neighborOf(cell, 1, 0) ? 'none' : WALL,
                zIndex: roomIdForLabel ? Z_ROOM_LABEL : Z_TILE,
                backgroundColor: onAxis ? 'rgb(59 130 246 / 0.16)' : undefined,
              }}
              className={`relative flex aspect-square min-h-14 items-center justify-center p-1 transition-shadow duration-150 disabled:cursor-default ${
                (state.selectedPersonId && !isBlocked && open && !frozen) || dragOver === key
                  ? 'shadow-[inset_0_0_0_3px_var(--color-accent)]'
                  : 'enabled:hover:shadow-[inset_0_0_0_3px_rgb(36_31_29/0.35)]'
              }`}
            >
              {isBlocked && state.selectedPersonId !== null && open && !frozen && (
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[rgb(200_50_31/0.12)]" />
              )}

              {occupant && (
                <span
                  draggable={open && !frozen}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(V3_PERSON_DRAG_TYPE, occupant.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="mk-settle inline-block cursor-grab active:cursor-grabbing"
                  style={{ '--mk-tilt': `${paperTilt(key)}deg` } as CSSProperties}
                >
                  <PersonAvatar
                    name={text.person(occupant.id)}
                    color={personColor(`ormes:${occupant.id}`)}
                    isVictim={occupant.id === def.victimId}
                    variantKey={`ormes:${occupant.id}`}
                    personIndex={def.people.findIndex((p) => p.id === occupant.id)}
                    showMonogram
                    size="base"
                  />
                </span>
              )}

              {/* The plumb badges: who is directly overhead, who is directly underfoot. */}
              {(above || below) && (
                <span className="pointer-events-none absolute left-0.5 top-0.5 flex flex-col gap-0.5">
                  {above && <PlumbBadge dir="up" initial={text.person(above.id).charAt(0)} />}
                  {below && <PlumbBadge dir="down" initial={text.person(below.id).charAt(0)} />}
                </span>
              )}

              {crossed.length > 0 && !occupant && (
                <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex flex-wrap justify-end gap-0.5">
                  {crossed.map((person) => (
                    <span
                      key={person.id}
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-[#241f1d]/60 bg-[var(--color-surface)] text-[0.55rem] font-bold text-[#241f1d] line-through"
                    >
                      {text.person(person.id).charAt(0)}
                    </span>
                  ))}
                </span>
              )}

              {roomIdForLabel && (
                <span
                  className="pointer-events-none absolute -bottom-[9px] left-1/2 max-w-[190%] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface)] px-1.5 py-[1px] text-[0.55rem] font-extrabold uppercase leading-[1.35] tracking-[0.04em] text-[#241f1d] shadow-[0_1.5px_0_rgb(36_31_29/0.35)]"
                  style={{ transform: `translateX(-50%) rotate(${roomTilt.get(roomIdForLabel) ?? 0}deg)` }}
                >
                  {text.room(roomIdForLabel)}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!open && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-6deg] rounded-[var(--radius-md)] border-[3px] border-[#241f1d] bg-[var(--color-surface)] px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-[#241f1d] shadow-[0_3px_0_rgb(36_31_29/0.35)]">
            {text.t('v3:ui.floorLocked')}
          </span>
        </div>
      )}
    </div>
  )
}

function PlumbBadge({ dir, initial }: { dir: 'up' | 'down'; initial: string }) {
  return (
    <span
      className="flex h-4 items-center gap-[1px] rounded-full border border-[#241f1d]/60 bg-[rgb(255_243_226/0.92)] px-1 text-[0.5rem] font-bold leading-none text-[#241f1d]"
      title={dir === 'up' ? 'directement au-dessus' : 'directement en dessous'}
    >
      <span aria-hidden>{dir === 'up' ? '▲' : '▼'}</span>
      {initial}
    </span>
  )
}
