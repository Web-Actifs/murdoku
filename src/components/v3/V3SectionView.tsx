import { useState } from 'react'
import { isOpenBelow } from '../../core3/model/geometry'
import { useV3Session } from '../../store/v3Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { INK, personColor } from '../game/planStyle'
import { useV3Text } from './useV3Text'
import { roomStyles } from './v3Style'

const W = 78
const H = 62
const SLAB = 6
/** Left margin the level names live in, so they never sit on top of a room. */
const GUTTER = 100

/** Consecutive cells of one room on one level, so a name can be centred over the run rather than repeated per cell. */
function runsOnFloor(
  board: { cols: number; cellsByKey: Map<string, { roomId: string }> },
  floor: number,
  row: number,
): { roomId: string; from: number; to: number }[] {
  const runs: { roomId: string; from: number; to: number }[] = []
  for (let col = 0; col < board.cols; col++) {
    const roomId = board.cellsByKey.get(`${floor}:${row}:${col}`)?.roomId
    if (!roomId) continue
    const last = runs[runs.length - 1]
    if (last && last.roomId === roomId && last.to === col - 1) last.to = col
    else runs.push({ roomId, from: col, to: col })
  }
  return runs
}

/** The row whose slice touches the most levels — the most informative place to cut first. */
function tallestRow(board: { rows: number; cells: { row: number; floor: number }[] }): number {
  let best = 0
  let bestCount = -1
  for (let row = 0; row < board.rows; row++) {
    const count = new Set(board.cells.filter((c) => c.row === row).map((c) => c.floor)).size
    if (count > bestCount) {
      best = row
      bestCount = count
    }
  }
  return best
}

/**
 * The house cut open along one row — an architect's elevation, and a deduction
 * tool rather than a camera angle.
 *
 * The plan view answers "who is where on this level"; this one answers the
 * question the plan cannot even ask: *what is above what*. A column of this
 * drawing is one shaft, so `above`, `below` and `sameShaft` become something you
 * read off the page instead of something you compute. The slab is drawn as a
 * solid bar with a gap wherever an opening is declared, which is how a stairwell
 * and a hatch stop being data and start being visible.
 *
 * People standing in *other* rows of the same shaft are shown as small chips
 * rather than hidden: a section that silently dropped them would make an empty
 * column look free when it is not.
 */
export function V3SectionView() {
  const { def, puzzle, displayed, blocked, accessible } = useV3Session()
  const text = useV3Text(def)
  const { board } = puzzle
  // Opening on row 0 showed a cellar that is not dug that far forward — a blank
  // band under the house, which reads as a bug rather than as a fact. Start on a
  // row that actually cuts through every level, so the first thing the view says
  // is "this is a three-storey slice".
  const [row, setRow] = useState(() => tallestRow(board))
  const [shaft, setShaft] = useState<number | null>(null)

  const styles = roomStyles(def)
  const width = GUTTER + board.cols * W
  const height = board.floors * H + SLAB

  const yOf = (floor: number) => (board.floors - 1 - floor) * H

  const personAt = (floor: number, r: number, col: number) =>
    def.people.find((p) => displayed[p.id] === `${floor}:${r}:${col}`)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{text.t('v3:ui.sectionRow')}</span>
        {Array.from({ length: board.rows }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRow(i)}
            className={`h-7 w-7 rounded-full border-2 border-[#241f1d] text-xs font-bold ${
              row === i ? 'bg-[#241f1d] text-[var(--color-surface)]' : 'bg-[var(--color-surface)] text-[#241f1d]'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full">
          {Array.from({ length: board.floors }, (_, floor) => {
            const y = yOf(floor)
            const open = accessible(floor)
            return (
              <g key={floor} opacity={open ? 1 : 0.42}>
                {Array.from({ length: board.cols }, (_, col) => {
                  const cell = board.cellsByKey.get(`${floor}:${row}:${col}`)
                  if (!cell) return null
                  const style = styles.get(cell.roomId)!
                  const isBlocked = blocked.has(`${floor}:${row}:${col}`)
                  return (
                    <g key={col} onMouseEnter={() => setShaft(col)} onMouseLeave={() => setShaft((s) => (s === col ? null : s))}>
                      {/* fill + fillOpacity rather than a slash-alpha colour: the CSS
                          Color 4 form renders opaque black in an SVG rasteriser. */}
                      <rect x={GUTTER + col * W} y={y} width={W} height={H} fill={style.bg} stroke={INK} strokeOpacity={0.25} strokeWidth={1} />
                      {isBlocked && <rect x={GUTTER + col * W} y={y} width={W} height={H} fill={INK} fillOpacity={0.16} />}
                      {shaft === col && <rect x={GUTTER + col * W} y={y} width={W} height={H} fill="#2563eb" fillOpacity={0.13} />}
                    </g>
                  )
                })}

                {/* One name per run of same-room cells: a section with no labels is
                    five coloured bars, and the colour cannot say which of the two
                    levels of the salon you are looking at. */}
                {runsOnFloor(board, floor, row).map((run) => (
                  <text
                    key={`label${run.from}`}
                    x={GUTTER + (run.from + run.to + 1) * (W / 2)}
                    y={y + H - 7}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={800}
                    letterSpacing={0.5}
                    fill={INK}
                    opacity={0.62}
                  >
                    {text.room(run.roomId).toUpperCase()}
                  </text>
                ))}

                {/* The slab, with a gap wherever the floor is actually open. */}
                {Array.from({ length: board.cols }, (_, col) => {
                  const cell = board.cellsByKey.get(`${floor}:${row}:${col}`)
                  if (!cell) return null
                  if (isOpenBelow(board, { floor, row, col })) return null
                  return <rect key={`slab${col}`} x={GUTTER + col * W} y={y + H} width={W} height={SLAB} fill={INK} />
                })}
              </g>
            )
          })}

          {/* Level names down the left margin. */}
          {def.floors.map((floorDef, floor) => (
            <text
              key={floorDef.id}
              x={GUTTER - 8}
              y={yOf(floor) + H / 2}
              textAnchor="end"
              fontSize={9.5}
              fontWeight={800}
              fill={INK}
              opacity={accessible(floor) ? 0.65 : 0.3}
              style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
            >
              {text.t(`v3:case.floorsShort.${floorDef.id}`)}
            </text>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: board.floors }, (_, floor) =>
            Array.from({ length: board.cols }, (_, col) => {
              const here = personAt(floor, row, col)
              const elsewhere = def.people.filter((p) => {
                const key = displayed[p.id]
                if (!key) return false
                const [f, r, c] = key.split(':').map(Number)
                return f === floor && c === col && r !== row
              })
              if (!here && elsewhere.length === 0) return null
              const left = `${((GUTTER + col * W + W / 2) / width) * 100}%`
              const top = `${((yOf(floor) + H) / height) * 100}%`
              return (
                <span key={`${floor}:${col}`} className="absolute -translate-x-1/2 -translate-y-[92%]" style={{ left, top }}>
                  {here && (
                    <PersonAvatar
                      name={text.person(here.id)}
                      color={personColor(`ormes:${here.id}`)}
                      isVictim={here.id === def.victimId}
                      variantKey={`ormes:${here.id}`}
                      personIndex={def.people.findIndex((p) => p.id === here.id)}
                      showMonogram
                      size="md"
                    />
                  )}
                  {elsewhere.length > 0 && (
                    <span className="absolute -right-2 -top-1 flex gap-0.5">
                      {elsewhere.map((p) => (
                        <span
                          key={p.id}
                          title={`${text.person(p.id)} — autre rangée du même aplomb`}
                          className="flex h-4 w-4 items-center justify-center rounded-full border border-dashed border-[#241f1d]/70 bg-[var(--color-surface)] text-[0.5rem] font-bold text-[#241f1d]/70"
                        >
                          {text.person(p.id).charAt(0)}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              )
            }),
          )}
        </div>
      </div>

      <p className="mt-2 text-xs italic text-[var(--color-text-muted)]">{text.t('v3:ui.shaftHint')}</p>
    </div>
  )
}
