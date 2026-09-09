import { useState } from 'react'
import { cellKey } from '../../core3/model/geometry'
import type { Cell } from '../../core3/model/types'
import { useV3Session } from '../../store/v3Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { INK, personColor } from '../game/planStyle'
import { useV3Text } from './useV3Text'
import { ISO, isoDrawOrder, isoViewBox, isoX, isoY, roomStyles, tilePoints } from './v3Style'

/**
 * The dollhouse, pulled apart.
 *
 * This is the view the whole V3 concept exists for, and it earns its place by
 * showing two things no flat plan can:
 *
 * - **volumes that cross levels.** A room drawn on two floors is one place, and
 *   here you can see it: the mezzanine sits directly over the salon with nothing
 *   between them but air, and once the chute is found, a dashed line runs from
 *   the boiler room up into the scullery to say the same thing about two rooms
 *   that share no wall at all.
 * - **the plumb line.** Hover any tile and a dotted axis drops through every
 *   level at that row and column, which is exactly the geometry "exactement
 *   au-dessus" talks about.
 *
 * Isometric rather than perspective, and SVG rather than a 3D scene: the tiles
 * stay clickable, the portraits stay upright and unwarped (they are billboards
 * standing on their tile, like a photograph in a stand), and the whole thing
 * costs one `<svg>`.
 */
export function V3ExplodedView() {
  const { def, puzzle, state, displayed, blocked, accessible, clickCell, progress } = useV3Session()
  const text = useV3Text(def)
  const [hovered, setHovered] = useState<Cell | null>(null)

  const { board } = puzzle
  const styles = roomStyles(def)
  const vb = isoViewBox(board)
  const frozen = state.phase !== 'investigating'

  const has = (floor: number, row: number, col: number) => board.cellsByKey.has(`${floor}:${row}:${col}`)

  /** Screen position as a percentage of the rendered box — the overlay's only link to the SVG. */
  const pct = (x: number, y: number) => ({ left: `${((x - vb.x) / vb.w) * 100}%`, top: `${((y - vb.y) / vb.h) * 100}%` })

  const linkChute = progress.discovery.unlockedLinks.has('goulotte')

  /** Both ends of a discovered link, so it can be drawn as the physical thing it is. */
  function linkAnchor(roomId: string): { x: number; y: number } | null {
    const cells = board.cells.filter((c) => c.roomId === roomId)
    if (cells.length === 0) return null
    const xs = cells.map((c) => isoX(c.row, c.col))
    const ys = cells.map((c) => isoY(c.row, c.col, c.floor))
    return { x: xs.reduce((a, b) => a + b, 0) / xs.length, y: ys.reduce((a, b) => a + b, 0) / ys.length }
  }

  const chuteFrom = linkChute ? linkAnchor('chaufferie') : null
  const chuteTo = linkChute ? linkAnchor('arriere') : null

  return (
    <div className="relative">
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} className="block h-auto w-full select-none" style={{ overflow: 'visible' }}>
        {isoDrawOrder(board.cells).map((cell) => {
          const key = cellKey(cell)
          const style = styles.get(cell.roomId)!
          const open = accessible(cell.floor)
          const x = isoX(cell.row, cell.col)
          const y = isoY(cell.row, cell.col, cell.floor)
          const hw = ISO.tileW / 2
          const hh = ISO.tileH / 2

          const southOpen = !has(cell.floor, cell.row + 1, cell.col)
          const eastOpen = !has(cell.floor, cell.row, cell.col + 1)
          const wallSouth = cell.roomId !== board.cellsByKey.get(`${cell.floor}:${cell.row + 1}:${cell.col}`)?.roomId
          const wallEast = cell.roomId !== board.cellsByKey.get(`${cell.floor}:${cell.row}:${cell.col + 1}`)?.roomId
          const wallNorth = cell.roomId !== board.cellsByKey.get(`${cell.floor}:${cell.row - 1}:${cell.col}`)?.roomId
          const wallWest = cell.roomId !== board.cellsByKey.get(`${cell.floor}:${cell.row}:${cell.col - 1}`)?.roomId

          const onPlumb = hovered && hovered.row === cell.row && hovered.col === cell.col

          return (
            <g key={key} opacity={open ? 1 : 0.42}>
              {/* The slab, extruded only where the building actually ends. */}
              {southOpen && (
                <polygon
                  points={`${x - hw},${y} ${x},${y + hh} ${x},${y + hh + ISO.slab} ${x - hw},${y + ISO.slab}`}
                  fill={style.tile}
                  stroke={INK}
                  strokeWidth={1.2}
                />
              )}
              {eastOpen && (
                <polygon
                  points={`${x},${y + hh} ${x + hw},${y} ${x + hw},${y + ISO.slab} ${x},${y + hh + ISO.slab}`}
                  fill={style.bg}
                  stroke={INK}
                  strokeWidth={1.2}
                  opacity={0.85}
                />
              )}

              <polygon
                points={tilePoints(cell.row, cell.col, cell.floor)}
                fill={onPlumb ? '#cfe0ff' : style.bg}
                stroke={INK}
                strokeOpacity={0.22}
                strokeWidth={0.8}
                className={open && !frozen && !blocked.has(key) ? 'cursor-pointer' : 'cursor-default'}
                onMouseEnter={() => setHovered(cell)}
                onMouseLeave={() => setHovered((h) => (h === cell ? null : h))}
                onClick={() => open && !frozen && clickCell(key)}
              />

              {/* Furniture, as the tile it stands on. Written as fill + fillOpacity
                  rather than a slash-alpha colour: the CSS Color 4 form is fine in a
                  browser and silently renders opaque black in an SVG rasteriser,
                  which is how this got caught. */}
              {blocked.has(key) && (
                <polygon points={tilePoints(cell.row, cell.col, cell.floor)} fill={INK} fillOpacity={0.16} pointerEvents="none" />
              )}

              {/* Room boundaries, drawn as ink on the four iso edges. */}
              <g pointerEvents="none" stroke={INK} strokeWidth={2} strokeLinecap="round">
                {wallNorth && <line x1={x - hw} y1={y} x2={x} y2={y - hh} />}
                {wallEast && <line x1={x} y1={y - hh} x2={x + hw} y2={y} />}
                {wallSouth && <line x1={x + hw} y1={y} x2={x} y2={y + hh} />}
                {wallWest && <line x1={x} y1={y + hh} x2={x - hw} y2={y} />}
              </g>
            </g>
          )
        })}

        {/* The plumb line: the axis "exactement au-dessus" is talking about. */}
        {hovered && (
          <line
            x1={isoX(hovered.row, hovered.col)}
            y1={isoY(hovered.row, hovered.col, board.floors - 1) - ISO.floorGap * 0.25}
            x2={isoX(hovered.row, hovered.col)}
            y2={isoY(hovered.row, hovered.col, 0) + ISO.tileH}
            stroke="#2563eb"
            strokeWidth={1.6}
            strokeDasharray="5 5"
            pointerEvents="none"
          />
        )}

        {/* Room names, one per room per level. Without them the exploded view is a
            pile of coloured lozenges: the whole point is reading which volume is
            which, and a colour alone cannot say "salon" twice on two floors. */}
        {def.floors.map((_, floor) =>
          def.rooms.map((room) => {
            const cells = board.cells.filter((c) => c.floor === floor && c.roomId === room.id)
            if (cells.length === 0) return null
            const x = cells.reduce((sum, c) => sum + isoX(c.row, c.col), 0) / cells.length
            const y = cells.reduce((sum, c) => sum + isoY(c.row, c.col, c.floor), 0) / cells.length
            const label = text.room(room.id).toUpperCase()
            return (
              <g key={`${floor}:${room.id}`} pointerEvents="none" opacity={accessible(floor) ? 0.92 : 0.4}>
                <rect
                  x={x - label.length * 2.6 - 4}
                  y={y - 6}
                  width={label.length * 5.2 + 8}
                  height={12}
                  rx={6}
                  fill="#fff3e2"
                  fillOpacity={0.86}
                  stroke={INK}
                  strokeOpacity={0.5}
                  strokeWidth={0.7}
                />
                <text x={x} y={y + 3} textAnchor="middle" fontSize={7.4} fontWeight={800} letterSpacing={0.4} fill={INK}>
                  {label}
                </text>
              </g>
            )
          }),
        )}

        {/* The coal chute, once it has been found: two rooms with no shared wall, one volume. */}
        {chuteFrom && chuteTo && (
          <g pointerEvents="none">
            <line x1={chuteFrom.x} y1={chuteFrom.y} x2={chuteTo.x} y2={chuteTo.y} stroke="#c8321f" strokeWidth={3} strokeDasharray="7 5" />
            <circle cx={chuteFrom.x} cy={chuteFrom.y} r={5} fill="#c8321f" />
            <circle cx={chuteTo.x} cy={chuteTo.y} r={5} fill="#c8321f" />
          </g>
        )}
      </svg>

      {/* Portraits stand on their tile as billboards — upright, never skewed. */}
      <div className="pointer-events-none absolute inset-0">
        {def.people.map((person) => {
          const key = displayed[person.id]
          if (!key) return null
          const cell = board.cellsByKey.get(key)
          if (!cell) return null
          const position = pct(isoX(cell.row, cell.col), isoY(cell.row, cell.col, cell.floor))
          return (
            <span
              key={person.id}
              className="absolute -translate-x-1/2 -translate-y-[86%]"
              style={{ ...position, filter: 'drop-shadow(0 3px 0 rgb(36 31 29 / 0.3))' }}
            >
              <PersonAvatar
                name={text.person(person.id)}
                color={personColor(`ormes:${person.id}`)}
                isVictim={person.id === def.victimId}
                variantKey={`ormes:${person.id}`}
                personIndex={def.people.findIndex((p) => p.id === person.id)}
                showMonogram
                size="md"
              />
            </span>
          )
        })}

        {/* Level tags, hung off the west corner of each floor. */}
        {def.floors.map((floorDef, floor) => {
          const cells = board.cells.filter((c) => c.floor === floor)
          if (cells.length === 0) return null
          const anchor = cells.reduce((best, c) => (isoX(c.row, c.col) < isoX(best.row, best.col) ? c : best))
          const position = pct(isoX(anchor.row, anchor.col) - ISO.tileW * 0.75, isoY(anchor.row, anchor.col, floor))
          return (
            <span
              key={floorDef.id}
              className={`absolute -translate-y-1/2 whitespace-nowrap rounded-full border-[1.5px] border-[#241f1d] px-2 py-[1px] text-[0.6rem] font-extrabold uppercase tracking-wide ${
                accessible(floor) ? 'bg-[var(--color-surface)] text-[#241f1d]' : 'bg-[#241f1d] text-[var(--color-surface)]'
              }`}
              style={{ ...position, transform: 'translate(-100%, -50%)' }}
            >
              {text.t(`v3:case.floorsShort.${floorDef.id}`)}
              {!accessible(floor) && ' ✕'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
