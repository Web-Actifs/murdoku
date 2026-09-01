import { useEffect, useState, type CSSProperties, type DragEvent } from 'react'
import { cellKey, unoccupiableCells } from '../../core/model/geometry'
import type { Cell, SceneObject } from '../../core/model/types'
import { useV2Session } from '../../store/v2Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { HAIRLINE, INK, LABEL_TILT, WALL, paperTilt, patternStyle, personColor, roomPalette, windowPaneStyle } from '../game/planStyle'
import { footprintOf } from './footprint'
import { V2ObjectArt } from './V2ObjectArt'
import { useV2Text } from './useV2Text'
import {
  CULPRIT_GAP_MS,
  GIVE_UP_PANEL_MS,
  STAMP_LEAD_MS,
  STAMP_STEP_MS,
  SWEEP_STEP_MS,
  VERDICT_PANEL_GAP_MS,
  boardRevealMs,
} from './verdictChoreography'
import { windowSegments } from './windowRun'

export const V2_PERSON_DRAG_TYPE = 'application/x-murdoku-v2-person'

/** How long a lifted suspect's chalk outline lingers, in ms. */
const VACATE_MS = 500

/** The solution is dumped all at once, so its stagger is a texture, not a wait. */
const GIVE_UP_STEP_MS = 45
const GIVE_UP_MAX_STEPS = 8

/** Layers of the plan, from the paper up. Furniture passes under the tiles so
 *  that a piece spanning two cells is not cut in half by their shared edge. */
const Z_FURNITURE = 1
const Z_TILE = 2
const Z_ZONE_LABEL = 20

/** FNV-1a 32-bit hash for case-level rotation offset. */
function hashString(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function V2FloorPlanGrid() {
  const { puzzle, state, displayed, solution, outcome, murdererId, clickCell, placeAtCell } = useV2Session()
  const text = useV2Text(puzzle.id)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [lifted, setLifted] = useState<{ cell: string; token: number } | null>(null)

  const { board } = puzzle
  const caseRotation = hashString(puzzle.id) % 13  // 13 is STYLE_COUNT
  const frozen = state.phase !== 'investigating'
  const gaveUp = state.phase === 'gaveUp'
  const blocked = unoccupiableCells(board)
  const hintCells = new Set(state.hint?.cells ?? [])

  const zoneStyle = new Map(puzzle.zones.map((zone, i) => [zone.id, roomPalette[i % roomPalette.length]]))
  const zoneTilt = new Map(puzzle.zones.map((zone, i) => [zone.id, LABEL_TILT[i % LABEL_TILT.length]]))

  // Windows are drawn on the wall rather than in the tile (§10), so they are kept
  // out of the furniture layer entirely: no footprint and no name tag would be
  // true of a tile that is just floor in front of an opening.
  const panes = windowSegments(board)
  const furniture = board.objects.filter((object) => object.type !== 'window')
  const objectByCell = new Map<string, SceneObject>()
  for (const object of furniture) {
    for (const ref of object.cells) objectByCell.set(cellKey(ref), object)
  }

  /** The zone tag straddles the wall at the zone's bottom-left cell, as in V1. */
  const zoneLabelCell = new Map<string, string>()
  for (const zone of puzzle.zones) {
    const cells = board.cells.filter((c) => c.zoneId === zone.id)
    if (cells.length === 0) continue
    const anchor = cells.reduce((best, c) => (c.row > best.row || (c.row === best.row && c.col < best.col) ? c : best))
    zoneLabelCell.set(cellKey(anchor), zone.id)
  }

  // A zone tag hangs off the bottom of its cell and so covers the top strip of
  // the cell underneath: an object caught there wears its name at the foot of
  // its footprint instead, rather than under a room name.
  const underAZoneTag = new Set([...zoneLabelCell.keys()].map((key) => {
    const [row, col] = key.split(':').map(Number)
    return `${row + 1}:${col}`
  }))

  const occupantAt = (key: string) => puzzle.people.find((p) => displayed[p.id] === key)
  const crossedAt = (key: string) =>
    puzzle.people.filter((p) => (state.notebook.exclusions[p.id] ?? []).includes(key) && displayed[p.id] !== key)

  // Reading order, but the victim's cell resolves last — the same order the engine
  // itself is obliged to reach them in (Claude/claude.md §14), which is what makes
  // the last mark of a reveal the one that matters.
  const revealOrder = new Map<string, number>()
  if (frozen) {
    const victimCell = displayed[puzzle.victimId]
    const ordered = board.cells
      .map(cellKey)
      .filter((key) => occupantAt(key) !== undefined && key !== victimCell)
    if (victimCell) ordered.push(victimCell)
    ordered.forEach((key, i) => revealOrder.set(key, i))
  }

  const culpritCell =
    murdererId && (gaveUp || (state.phase === 'verdict' && outcome.solved)) ? displayed[murdererId] : undefined
  const culpritDelay = gaveUp
    ? GIVE_UP_PANEL_MS + CULPRIT_GAP_MS
    : boardRevealMs(outcome.placed, true) + VERDICT_PANEL_GAP_MS + CULPRIT_GAP_MS

  const neighborOf = (cell: Cell, dr: number, dc: number) => board.cellsByKey.get(`${cell.row + dr}:${cell.col + dc}`)
  const isWall = (cell: Cell, dr: number, dc: number) => {
    const n = neighborOf(cell, dr, dc)
    return !n || n.zoneId !== cell.zoneId
  }

  /**
   * Inside a room the tiles are ruled with a hairline — except across the middle
   * of a piece of furniture. Two cells of the same table are one table, so the
   * line between them is simply not there (a wall still is: it is a wall).
   */
  const edgeStyle = (cell: Cell, dr: number, dc: number) => {
    if (isWall(cell, dr, dc)) return WALL
    const mine = objectByCell.get(cellKey(cell))
    if (mine && objectByCell.get(`${cell.row + dr}:${cell.col + dc}`) === mine) return 'none'
    return HAIRLINE
  }

  useEffect(() => {
    if (!lifted) return
    const timer = window.setTimeout(() => setLifted(null), VACATE_MS)
    return () => window.clearTimeout(timer)
  }, [lifted])

  function handleDrop(e: DragEvent<HTMLButtonElement>, key: string) {
    e.preventDefault()
    setDragOverCell(null)
    const personId = e.dataTransfer.getData(V2_PERSON_DRAG_TYPE)
    if (personId && !blocked.has(key)) placeAtCell(personId, key)
  }

  function handleClick(key: string) {
    // The token only has to differ from the last one, so lifting from the same cell twice replays the outline.
    if (state.mode === 'place' && !state.selectedPersonId && occupantAt(key))
      setLifted((prev) => ({ cell: key, token: (prev?.token ?? 0) + 1 }))
    clickCell(key)
  }

  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 pb-6 shadow-[var(--shadow-card)]">
      <div
        className="grid rounded-[3px]"
        style={{
          gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${board.rows}, minmax(0, 1fr))`,
          border: `3px solid ${INK}`,
          backgroundColor: INK,
        }}
      >
        {/* Outside the building. A plan whose outline steps in and out reads as a
            shape cut from the page, not as a black hole punched in the floor. */}
        {Array.from({ length: board.rows * board.cols }, (_, i) => ({ row: Math.floor(i / board.cols), col: i % board.cols }))
          .filter((c) => !board.cellsByKey.has(cellKey(c)))
          .map((c) => (
            <span
              key={`void:${cellKey(c)}`}
              aria-hidden
              className="pointer-events-none bg-[var(--color-surface)]"
              style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}
            />
          ))}

        {/* The floor itself. It is its own layer so that the furniture above can
            straddle two tiles without their fills painting over it. */}
        {board.cells.map((cell) => {
          const style = zoneStyle.get(cell.zoneId) ?? roomPalette[0]
          return (
            <span
              key={`floor:${cellKey(cell)}`}
              aria-hidden
              className="pointer-events-none"
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
                backgroundColor: style.bg,
                // Version 2 (background 70%): change backgroundColor to: `${style.bg}b3` (70% opacity)
                ...patternStyle(style),
              }}
            />
          )
        })}

        {/* One drawing per object, over every cell it covers. */}
        {furniture.map((object) => {
          const footprint = footprintOf(object.cells)
          const head = object.cells.filter((c) => c.row === footprint.minRow)
          const foot = object.cells.filter((c) => c.row === footprint.minRow + footprint.rows - 1)
          const captionAtFoot =
            head.some((c) => underAZoneTag.has(cellKey(c))) && !foot.some((c) => zoneLabelCell.has(cellKey(c)))

          return (
            <span
              key={`art:${object.id}`}
              className={`pointer-events-none relative flex justify-center ${captionAtFoot ? 'items-end' : 'items-start'}`}
              style={{
                gridColumn: `${footprint.minCol + 1} / span ${footprint.cols}`,
                gridRow: `${footprint.minRow + 1} / span ${footprint.rows}`,
                zIndex: Z_FURNITURE,
              }}
            >
              <V2ObjectArt object={object} className="absolute inset-0 h-full w-full opacity-70" />
              <span
                className={`relative max-w-[160%] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[rgb(255_243_226/0.85)] px-1 text-[0.5rem] font-bold uppercase leading-[1.5] tracking-wide text-[#241f1d]/80 ${
                  captionAtFoot ? 'mb-[3px]' : 'mt-[3px]'
                }`}
              >
                {text.object(object.id)}
              </span>
            </span>
          )
        })}

        {board.cells.map((cell) => {
          const key = cellKey(cell)
          const occupant = occupantAt(key)
          const pane = panes.get(key)
          const isBlocked = blocked.has(key)
          const zoneIdForLabel = zoneLabelCell.get(key)
          const crossed = crossedAt(key)

          const isPickedUp = state.selectedPersonId === occupant?.id
          const canDropHere = Boolean(state.selectedPersonId) && !isBlocked && !frozen
          const showVerdict = state.phase === 'verdict' && occupant !== undefined
          const wasRight = occupant !== undefined && solution[occupant.id] === key

          const order = revealOrder.get(key) ?? 0
          const settleDelay = gaveUp ? Math.min(order, GIVE_UP_MAX_STEPS) * GIVE_UP_STEP_MS : 0
          const stampDelay = STAMP_LEAD_MS + order * STAMP_STEP_MS
          const sweepDelay = STAMP_LEAD_MS + order * SWEEP_STEP_MS
          const showSweep = state.phase === 'verdict' && outcome.solved && occupant !== undefined

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleClick(key)}
              onDragOver={(e) => {
                if (frozen || isBlocked) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverCell(key)
              }}
              onDragLeave={() => setDragOverCell((c) => (c === key ? null : c))}
              onDrop={(e) => handleDrop(e, key)}
              disabled={frozen || (isBlocked && !occupant)}
              aria-label={`R${cell.row + 1}C${cell.col + 1} — ${text.zone(cell.zoneId)}`}
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
                borderTop: edgeStyle(cell, -1, 0),
                borderLeft: edgeStyle(cell, 0, -1),
                borderRight: neighborOf(cell, 0, 1) ? 'none' : WALL,
                borderBottom: neighborOf(cell, 1, 0) ? 'none' : WALL,
                zIndex: zoneIdForLabel ? Z_ZONE_LABEL : Z_TILE,
              }}
              className={`relative flex aspect-square min-h-14 items-center justify-center p-1 transition-shadow duration-150 disabled:cursor-default ${
                canDropHere || dragOverCell === key
                  ? 'shadow-[inset_0_0_0_3px_var(--color-accent)]'
                  : 'enabled:hover:shadow-[inset_0_0_0_3px_rgb(36_31_29/0.35)]'
              }`}
            >
              {isBlocked && state.selectedPersonId !== null && !frozen && (
                <span aria-hidden className="pointer-events-none absolute inset-0 bg-[rgb(200_50_31/0.12)]" />
              )}

              {hintCells.has(key) && (
                <span
                  aria-hidden
                  className="mk-hint pointer-events-none absolute inset-0 shadow-[inset_0_0_0_3px_#ca8a04]"
                />
              )}

              {lifted?.cell === key && (
                <span
                  key={lifted.token}
                  aria-hidden
                  className="mk-vacate pointer-events-none absolute inset-1 rounded-[3px] border-2 border-dashed border-[var(--color-accent)]"
                />
              )}

              {pane && <span aria-hidden className="pointer-events-none" style={windowPaneStyle(pane.side, pane.startsRun, pane.endsRun)} />}

              {occupant && (
                <span
                  key={occupant.id}
                  draggable={!frozen}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(V2_PERSON_DRAG_TYPE, occupant.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  className="mk-settle inline-block cursor-grab active:cursor-grabbing"
                  style={{ animationDelay: `${settleDelay}ms`, '--mk-tilt': `${paperTilt(key)}deg` } as CSSProperties}
                >
                  <PersonAvatar
                    name={text.person(occupant.id)}
                    color={personColor(`${puzzle.id}:${occupant.id}`)}
                    isVictim={occupant.id === puzzle.victimId}
                    variantKey={`${puzzle.id}:${occupant.id}`}
                    personIndex={puzzle.people.findIndex((p) => p.id === occupant.id)}
                    caseRotation={caseRotation}
                    showMonogram={true}
                    size="md"
                  />
                  {showVerdict && !outcome.solved && (
                    <span
                      aria-hidden
                      className={`mk-stamp absolute bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ring-[1.5px] ring-[#241f1d] ${
                        wasRight ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'
                      }`}
                      style={{ animationDelay: `${stampDelay}ms`, '--mk-tilt': `${paperTilt(`v:${key}`, 16)}deg` } as CSSProperties}
                    >
                      {wasRight ? '✓' : '✗'}
                    </span>
                  )}
                </span>
              )}

              {occupant && !frozen && (
                <span
                  key={`land:${occupant.id}`}
                  aria-hidden
                  className="mk-land pointer-events-none absolute inset-0 shadow-[inset_0_0_0_3px_rgb(202_138_4/0.9)]"
                />
              )}

              {showSweep && (
                <span
                  aria-hidden
                  className="mk-sweep pointer-events-none absolute inset-0 bg-[rgb(223_201_141/0.4)] shadow-[inset_0_0_0_3px_var(--color-success)]"
                  style={{ animationDelay: `${sweepDelay}ms` }}
                />
              )}

              {culpritCell === key && (
                <span
                  aria-hidden
                  className="mk-culprit pointer-events-none absolute inset-0 shadow-[inset_0_0_0_3px_#c8321f]"
                  style={{ animationDelay: `${culpritDelay}ms, ${culpritDelay + 420}ms` }}
                />
              )}

              {crossed.length > 0 && !occupant && (
                <span className="pointer-events-none absolute bottom-0.5 right-0.5 flex flex-wrap justify-end gap-0.5">
                  {crossed.map((person) => (
                    <span
                      key={person.id}
                      className="mk-scratch flex h-4 w-4 items-center justify-center rounded-full border border-[#241f1d]/60 bg-[var(--color-surface)] text-[0.55rem] font-bold text-[#241f1d] line-through"
                    >
                      {text.person(person.id).charAt(0)}
                    </span>
                  ))}
                </span>
              )}

              {zoneIdForLabel && (
                <span
                  className="pointer-events-none absolute -bottom-[9px] left-1/2 max-w-[190%] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface)] px-1.5 py-[1px] text-[0.55rem] font-extrabold uppercase leading-[1.35] tracking-[0.04em] text-[#241f1d] shadow-[0_1.5px_0_rgb(36_31_29/0.35)]"
                  style={{ transform: `translateX(-50%) rotate(${zoneTilt.get(zoneIdForLabel) ?? 0}deg)` }}
                >
                  {text.zone(zoneIdForLabel)}
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
