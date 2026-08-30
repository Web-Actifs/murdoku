import type { CSSProperties, ReactNode } from 'react'
import type { DecorType } from '../../../engine/types'
import { DecorIcon } from '../../icons/DecorIcon'
import { PersonAvatar } from '../../game/PersonAvatar'
import {
  HAIRLINE,
  INK,
  LABEL_TILT,
  WALL,
  paperTilt,
  patternStyle,
  personColor,
  roomPalette,
  windowPaneStyle,
  type WallSide,
} from '../../game/planStyle'

/*
 * The tutorial's figures are hand-built, not loaded from a case: a real puzzle is
 * by construction always legal, and half of what has to be taught here is what an
 * *illegal* board looks like — two people sharing a row, a diagonal that is not
 * "à côté", an adjacency broken by a wall. So this renders the same ink-and-paper
 * plan as `V2FloorPlanGrid` from a literal cell list, at figure size.
 */

export type MiniMark = 'ok' | 'bad' | 'candidate' | 'culprit'

export interface MiniPerson {
  /** Stable key behind the portrait and its colour — reuse one across figures to keep a character recognisable. */
  key: string
  name: string
  victim?: boolean
  stamp?: 'right' | 'wrong'
}

export interface MiniCell {
  /** Index into `roomPalette`; cells sharing an index are one zone, and a change of index draws a wall. */
  zone: number
  person?: MiniPerson
  icon?: DecorType
  /** Dashed outline of a piece of furniture's footprint, as on the real plan. */
  footprint?: boolean
  blocked?: boolean
  mark?: MiniMark
  /** Initial of a person pencilled out of this cell. */
  cross?: string
  window?: WallSide
}

export interface TutorialPlanProps {
  cols: number
  cells: MiniCell[]
  /** A whole row or column called out as a conflict. */
  band?: { row?: number; col?: number }
  zoneNames?: Record<number, string>
}

const MARK_RING: Record<MiniMark, string> = {
  ok: 'inset 0 0 0 3px var(--color-success)',
  bad: 'inset 0 0 0 3px var(--color-danger)',
  candidate: 'inset 0 0 0 3px var(--color-accent)',
  culprit: 'inset 0 0 0 3px #c8321f',
}

export function TutorialPlan({ cols, cells, band, zoneNames }: TutorialPlanProps) {
  const rows = Math.ceil(cells.length / cols)
  const at = (row: number, col: number): MiniCell | undefined =>
    row < 0 || col < 0 || row >= rows || col >= cols ? undefined : cells[row * cols + col]

  const zoneTagCell = new Map<number, number>()
  if (zoneNames) {
    cells.forEach((cell, i) => {
      const current = zoneTagCell.get(cell.zone)
      const row = Math.floor(i / cols)
      const col = i % cols
      if (current === undefined) {
        zoneTagCell.set(cell.zone, i)
        return
      }
      const bestRow = Math.floor(current / cols)
      const bestCol = current % cols
      if (row > bestRow || (row === bestRow && col < bestCol)) zoneTagCell.set(cell.zone, i)
    })
  }
  const tagByIndex = new Map([...zoneTagCell].map(([zone, index]) => [index, zone]))

  return (
    <div
      className="grid w-fit rounded-[2px]"
      style={{
        gridTemplateColumns: `repeat(${cols}, 2.6rem)`,
        border: `2.5px solid ${INK}`,
        backgroundColor: INK,
      }}
    >
      {cells.map((cell, i) => {
        const row = Math.floor(i / cols)
        const col = i % cols
        const style = roomPalette[cell.zone % roomPalette.length]
        const wallTop = at(row - 1, col)?.zone !== cell.zone
        const wallLeft = at(row, col - 1)?.zone !== cell.zone
        const inBand = band !== undefined && (band.row === row || band.col === col)
        const tagZone = tagByIndex.get(i)

        return (
          <div
            key={i}
            className="relative flex aspect-square items-center justify-center"
            style={{
              backgroundColor: style.bg,
              ...patternStyle(style),
              borderTop: wallTop ? WALL : HAIRLINE,
              borderLeft: wallLeft ? WALL : HAIRLINE,
              borderRight: col === cols - 1 ? WALL : 'none',
              borderBottom: row === rows - 1 ? WALL : 'none',
              boxShadow: cell.mark ? MARK_RING[cell.mark] : undefined,
              zIndex: tagZone !== undefined ? 20 : undefined,
            }}
          >
            {cell.blocked && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgb(36 31 29 / 0.16) 0 2px, transparent 2px 7px)' }}
              />
            )}

            {inBand && <span aria-hidden className="pointer-events-none absolute inset-0 bg-[rgb(200_50_31/0.26)]" />}

            {cell.footprint && (
              <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[2px] border border-dashed border-[#241f1d]/35" />
            )}

            {cell.window && (
              <span aria-hidden className="pointer-events-none" style={windowPaneStyle(cell.window, true, true)} />
            )}

            {cell.person ? (
              <span
                className="inline-block"
                style={{ transform: `rotate(${paperTilt(`${cell.person.key}:${i}`, 4)}deg)` }}
              >
                <PersonAvatar
                  name={cell.person.name}
                  color={personColor(`tutorial:${cell.person.key}`)}
                  isVictim={cell.person.victim}
                  variantKey={`tutorial:${cell.person.key}`}
                  size="sm"
                />
                {cell.person.stamp && (
                  <span
                    aria-hidden
                    className={`absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-bold text-white ring-[1.5px] ring-[#241f1d] ${
                      cell.person.stamp === 'right' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'
                    }`}
                  >
                    {cell.person.stamp === 'right' ? '✓' : '✗'}
                  </span>
                )}
              </span>
            ) : (
              cell.icon && <DecorIcon type={cell.icon} className="h-[58%] w-[58%] opacity-80" />
            )}

            {cell.cross && !cell.person && (
              <span className="pointer-events-none absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border border-[#241f1d]/60 bg-[var(--color-surface)] text-[0.5rem] font-bold text-[#241f1d] line-through">
                {cell.cross}
              </span>
            )}

            {tagZone !== undefined && zoneNames?.[tagZone] && (
              <span
                className="pointer-events-none absolute -bottom-[8px] left-1/2 max-w-[210%] overflow-hidden text-ellipsis whitespace-nowrap rounded-full border-[1.5px] border-[#241f1d] bg-[var(--color-surface)] px-1.5 py-[1px] text-[0.45rem] font-extrabold uppercase leading-[1.4] tracking-[0.04em] text-[#241f1d] shadow-[0_1.5px_0_rgb(36_31_29/0.35)]"
                style={{ transform: `translateX(-50%) rotate(${LABEL_TILT[tagZone % LABEL_TILT.length]}deg)` }}
              >
                {zoneNames[tagZone]}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** One figure: a plan, a verdict chip, and the sentence it proves. */
export function TutorialFigure({
  verdict,
  caption,
  delay,
  children,
}: {
  verdict?: 'yes' | 'no'
  caption: string
  delay: number
  children: ReactNode
}) {
  return (
    <figure
      className="mk-card flex flex-col items-start gap-2 rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
      style={{ animationDelay: `${delay}ms` } as CSSProperties}
    >
      <div className="flex w-full justify-center pb-2">{children}</div>
      <figcaption className="flex items-start gap-2 text-xs leading-snug text-[var(--color-text-muted)]">
        {verdict && (
          <span
            aria-hidden
            className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white ring-[1.5px] ring-[#241f1d] ${
              verdict === 'yes' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'
            }`}
          >
            {verdict === 'yes' ? '✓' : '✗'}
          </span>
        )}
        <span>{caption}</span>
      </figcaption>
    </figure>
  )
}
