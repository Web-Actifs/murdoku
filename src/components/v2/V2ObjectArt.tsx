import type { ReactNode } from 'react'
import type { CellRef, SceneObject } from '../../core/model/types'
import { P } from '../icons/decorPalette'
import { CELL_UNITS as U, footprintOf, outlinePath } from './footprint'

/*
 * ---------------------------------------------------------------------------
 * FURNITURE ON THE PLAN — read this before adding a type
 * ---------------------------------------------------------------------------
 * One object, one drawing. A three-cell table is a long table, not the table
 * icon printed three times with a dashed box around each print; that was the
 * playtest complaint this module answers, together with "no more technical
 * hatching" — a vat is now a vat, a catwalk is a catwalk.
 *
 * VIEW. Everything is seen from above, because that is what a floor plan is.
 * (The side-view `DecorIcon` family stays in the legends and in V1.)
 *
 * SPACE. Art is authored in a 100-units-per-cell space. Two modes:
 *   - 'run'  — the common case. The art is drawn once in a canonical strip
 *     [0, len] x [0, 100] laid out left to right, and the renderer rotates it
 *     for objects that run down the board instead of across it. So a berth is
 *     written once, head at x = 0, and works in both orientations.
 *   - 'plan' — for art that is not a straight run (Le Cormoran's L-shaped helm)
 *     or that follows the silhouette itself (the braided rug). Drawn directly
 *     in the object's bounding box, with `outline(inset, radius)` giving the
 *     true rounded outline of the *union* of its cells.
 *
 * INK. The root <svg> carries stroke + paintOrder="stroke", exactly like
 * DecorIcon: every shape gets a printed contour behind its own fill for free.
 * A shape that sets its own `stroke` opts out; anything with `opacity` must set
 * `stroke="none"` or the highlight grows its own outline and the piece muddies.
 *
 * WEIGHT. Objects nobody can stand on (a vat, a stove) are given a dropped ink
 * shadow by the renderer, so "solid thing" reads as volume on the page rather
 * than as a hatch pattern the player has to decode.
 * ---------------------------------------------------------------------------
 */

/** Ink contour width in the 100-per-cell space. */
const STROKE = 3.4

/** How far a piece of furniture stops short of its cell edges. */
const BODY_INSET = 8
const BODY_RADIUS = 16

interface ArtContext {
  /** Long side of a run in units ('run' mode), or the bounding-box width ('plan' mode). */
  len: number
  /** How many cells the object covers. */
  count: number
  /** Cells normalized to the bounding box — 'plan' mode only. */
  cells: CellRef[]
  /** The rounded outline of the union of the cells, in bounding-box space. */
  outline: (inset: number, radius: number) => string
}

interface ArtSpec {
  mode?: 'run' | 'plan'
  draw: (ctx: ArtContext) => ReactNode
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/* -------------------------------------------------------------------------- */
/* Shared parts                                                                */
/* -------------------------------------------------------------------------- */

/** A wooden top with a lighter surface and two grain lines — tables and desks. */
function woodenTop(len: number) {
  return (
    <>
      <rect x={8} y={11} width={len - 16} height={78} rx={14} fill={P.wood} />
      <rect x={16} y={18} width={len - 32} height={64} rx={9} fill={P.woodLight} />
      <path d={`M24 34 H ${len - 24}`} stroke={P.woodDark} strokeWidth={3} opacity={0.4} />
      <path d={`M24 50 q ${(len - 48) / 2} 7 ${len - 48} 0`} stroke={P.woodDark} strokeWidth={3} opacity={0.3} fill="none" />
      <path d={`M24 66 H ${len - 24}`} stroke={P.woodDark} strokeWidth={3} opacity={0.35} />
      <circle cx={len - 34} cy={42} r={4} fill={P.woodDark} opacity={0.5} stroke="none" />
    </>
  )
}

/** A ship's wheel, centred — the one fixture that has to be unmistakable. */
function helmWheel(cx: number, cy: number) {
  return (
    <>
      {range(6).map((i) => {
        const angle = (i * Math.PI) / 3
        return (
          <circle key={`h${i}`} cx={cx + Math.cos(angle) * 41} cy={cy + Math.sin(angle) * 41} r={7} fill={P.woodLight} />
        )
      })}
      <circle cx={cx} cy={cy} r={34} fill={P.goldDark} />
      <circle cx={cx} cy={cy} r={24} fill={P.wood} />
      {[0, 60, 120].map((a) => (
        <rect key={a} x={cx - 26} y={cy - 4} width={52} height={8} rx={4} fill={P.woodLight} transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      <circle cx={cx} cy={cy} r={10} fill={P.gold} />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* The pieces                                                                  */
/* -------------------------------------------------------------------------- */

const ART: Record<string, ArtSpec> = {
  /* --- tables ------------------------------------------------------------ */
  table: { draw: ({ len }) => woodenTop(len) },

  tableBasse: {
    draw: ({ len }) => (
      <>
        {woodenTop(len)}
        {/* the marchande d'art's files, left open on the low table */}
        <rect x={len / 2 - 34} y={26} width={40} height={50} rx={4} fill={P.cream} transform={`rotate(-7 ${len / 2} 50)`} />
        <rect x={len / 2 - 2} y={30} width={38} height={46} rx={4} fill={P.white} transform={`rotate(6 ${len / 2} 50)`} />
        <circle cx={len / 2 + 20} cy={45} r={6} fill={P.redDark} />
      </>
    ),
  },

  /* --- seating ------------------------------------------------------------ */
  banquette: {
    draw: ({ len, count }) => (
      <>
        <rect x={8} y={10} width={len - 16} height={80} rx={20} fill={P.blueDark} />
        <rect x={15} y={31} width={len - 30} height={53} rx={14} fill={P.blue} />
        {range(count - 1).map((i) => (
          <path key={i} d={`M ${(i + 1) * U} 34 V 81`} stroke={P.blueDark} strokeWidth={3.5} />
        ))}
        <rect x={22} y={17} width={len - 44} height={9} rx={4.5} fill={P.white} opacity={0.3} stroke="none" />
      </>
    ),
  },

  banc: {
    draw: ({ len }) => (
      <>
        <rect x={8} y={13} width={len - 16} height={74} rx={11} fill={P.woodDark} />
        <rect x={15} y={20} width={len - 30} height={17} rx={8} fill={P.woodLight} />
        <rect x={15} y={42} width={len - 30} height={17} rx={8} fill={P.woodLight} />
        <rect x={15} y={64} width={len - 30} height={17} rx={8} fill={P.wood} />
      </>
    ),
  },

  tabouret: {
    draw: ({ len }) => (
      <>
        {[-1, 1].map((s) => (
          <circle key={s} cx={len / 2 + s * 24} cy={74} r={8} fill={P.charcoal} />
        ))}
        <circle cx={len / 2} cy={26} r={8} fill={P.charcoal} />
        <circle cx={len / 2} cy={50} r={31} fill={P.woodDark} />
        <circle cx={len / 2} cy={47} r={24} fill={P.wood} />
        <circle cx={len / 2 - 9} cy={39} r={6} fill={P.white} opacity={0.35} stroke="none" />
      </>
    ),
  },

  strapontin: {
    draw: ({ len }) => (
      <>
        <rect x={len / 2 - 34} y={14} width={68} height={13} rx={6} fill={P.charcoal} />
        <path d={`M ${len / 2 - 31} 29 h 62 a 31 31 0 0 1 -62 0 z`} fill={P.red} />
        <path d={`M ${len / 2 - 18} 40 h 36`} stroke={P.redDark} strokeWidth={3.5} />
      </>
    ),
  },

  /* --- sleeping ------------------------------------------------------------ */
  couchette: {
    draw: ({ len }) => {
      const pillow = Math.min(70, len * 0.3)
      return (
        <>
          <rect x={8} y={12} width={len - 16} height={76} rx={13} fill={P.bone} />
          <rect x={15} y={19} width={pillow} height={62} rx={11} fill={P.white} />
          <rect x={pillow + 24} y={17} width={len - pillow - 40} height={66} rx={11} fill={P.teal} />
          <rect x={pillow + 24} y={17} width={17} height={66} rx={8} fill={P.tealDark} />
        </>
      )
    },
  },

  lit: {
    draw: ({ len }) => {
      const pillow = Math.min(62, len * 0.26)
      return (
        <>
          <rect x={8} y={13} width={len - 16} height={74} rx={10} fill={P.charcoal} />
          <rect x={15} y={20} width={len - 30} height={60} rx={7} fill={P.boneDark} />
          <rect x={20} y={25} width={pillow} height={50} rx={9} fill={P.cream} />
          <rect x={len * 0.46} y={22} width={len * 0.46} height={56} rx={9} fill={P.red} />
          <path d={`M ${len * 0.62} 26 V 74 M ${len * 0.76} 26 V 74`} stroke={P.redDark} strokeWidth={3.5} />
        </>
      )
    },
  },

  /* --- floor covering ------------------------------------------------------ */
  tapis: {
    mode: 'plan',
    draw: ({ outline }) => (
      <>
        {/* Rag rug: rings braided one inside the next, following the shape itself. */}
        <path d={outline(5, 34)} fill={P.bone} />
        <path d={outline(12, 30)} fill={P.clay} />
        <path d={outline(19, 26)} fill={P.cream} />
        <path d={outline(26, 22)} fill={P.tealDark} />
        <path d={outline(33, 18)} fill={P.clay} />
        <path d={outline(40, 14)} fill={P.bone} />
        {[8.5, 15.5, 22.5, 29.5, 36.5].map((inset) => (
          <path
            key={inset}
            d={outline(inset, 32 - inset * 0.5)}
            fill="none"
            stroke={P.ink}
            strokeWidth={2}
            strokeDasharray="7 6"
            opacity={0.3}
          />
        ))}
      </>
    ),
  },

  /* --- the working ends of a building -------------------------------------- */
  cuve: {
    draw: ({ len, count }) => (
      <>
        <rect x={7} y={11} width={len - 14} height={78} rx={30} fill={P.silver} />
        <rect x={26} y={19} width={len - 52} height={15} rx={7.5} fill={P.chrome} opacity={0.9} stroke="none" />
        {range(count - 1).map((i) => (
          <rect key={i} x={(i + 1) * U - 5} y={13} width={10} height={74} fill={P.steel} />
        ))}
        <circle cx={52} cy={50} r={19} fill={P.chrome} />
        <circle cx={52} cy={50} r={8} fill={P.steel} />
        <rect x={len - 50} y={42} width={26} height={16} rx={6} fill={P.steel} />
        <circle cx={len - 30} cy={50} r={12} fill={P.red} />
        <circle cx={len - 30} cy={50} r={4} fill={P.redDark} />
      </>
    ),
  },

  barrique: {
    draw: ({ len, count }) => (
      <>
        <rect x={5} y={31} width={len - 10} height={38} rx={10} fill={P.woodDark} />
        {range(count).map((i) => (
          <g key={i}>
            <rect x={i * U + 12} y={9} width={76} height={82} rx={24} fill={P.wood} />
            <rect x={i * U + 12} y={25} width={76} height={9} fill={P.slate} />
            <rect x={i * U + 12} y={66} width={76} height={9} fill={P.slate} />
            <circle cx={i * U + 50} cy={50} r={9} fill={P.woodDark} />
          </g>
        ))}
      </>
    ),
  },

  passerelle: {
    draw: ({ len, count }) => {
      const treads = count * 3
      const gap = (len - 30) / treads
      return (
        <>
          <rect x={6} y={18} width={len - 12} height={64} rx={9} fill={P.slate} />
          <rect x={12} y={27} width={len - 24} height={46} rx={5} fill={P.steel} />
          {range(treads).map((i) => (
            <rect key={i} x={15 + gap * (i + 0.18)} y={30} width={gap * 0.64} height={40} rx={3} fill={P.silver} />
          ))}
          <rect x={5} y={9} width={len - 10} height={12} rx={6} fill={P.charcoal} />
          <rect x={5} y={79} width={len - 10} height={12} rx={6} fill={P.charcoal} />
          {[15, len - 15].map((x) => (
            <g key={x}>
              <circle cx={x} cy={15} r={4.5} fill={P.chrome} />
              <circle cx={x} cy={85} r={4.5} fill={P.chrome} />
            </g>
          ))}
        </>
      )
    },
  },

  generatrice: {
    draw: ({ len }) => (
      <>
        <rect x={len / 2 - 9} y={5} width={19} height={16} rx={6} fill={P.steel} />
        <rect x={8} y={12} width={len - 16} height={76} rx={12} fill={P.charcoal} />
        {range(4).map((i) => (
          <rect key={i} x={20 + i * 16} y={22} width={9} height={56} rx={3} fill={P.slate} />
        ))}
        <circle cx={len - 58} cy={50} r={26} fill={P.steel} />
        <circle cx={len - 58} cy={50} r={10} fill={P.chrome} />
        <rect x={len - 32} y={26} width={20} height={32} rx={5} fill={P.redDark} />
        <circle cx={len - 22} cy={36} r={4.5} fill={P.sun} />
        <circle cx={len - 22} cy={48} r={4.5} fill={P.greenLight} />
      </>
    ),
  },

  fourneau: {
    draw: ({ len }) => (
      <>
        <rect x={8} y={11} width={len - 16} height={78} rx={13} fill={P.charcoal} />
        <rect x={15} y={18} width={len - 30} height={64} rx={8} fill={P.slate} />
        {[
          [-19, -15],
          [19, -15],
          [-19, 17],
          [19, 17],
        ].map(([dx, dy], i) => (
          <g key={i}>
            <circle cx={len / 2 + dx} cy={50 + dy} r={13} fill={P.steel} />
            <circle cx={len / 2 + dx} cy={50 + dy} r={6} fill={i % 3 === 0 ? P.red : P.silver} />
          </g>
        ))}
      </>
    ),
  },

  poele: {
    draw: ({ len }) => (
      <>
        <rect x={len / 2 + 20} y={10} width={17} height={17} rx={5} fill={P.steel} />
        <circle cx={len / 2} cy={51} r={36} fill={P.charcoal} />
        <circle cx={len / 2} cy={51} r={26} fill={P.slate} />
        <circle cx={len / 2} cy={51} r={15} fill={P.red} />
        <circle cx={len / 2} cy={51} r={7} fill={P.sun} />
      </>
    ),
  },

  samovar: {
    draw: ({ len }) => (
      <>
        <ellipse cx={len / 2} cy={54} rx={38} ry={33} fill={P.silver} />
        <rect x={len / 2 + 22} y={44} width={17} height={11} rx={5} fill={P.charcoal} />
        <circle cx={len / 2} cy={48} r={26} fill={P.gold} />
        <circle cx={len / 2} cy={48} r={11} fill={P.goldDark} />
        <circle cx={len / 2 - 11} cy={38} r={5} fill={P.white} opacity={0.45} stroke="none" />
      </>
    ),
  },

  lavabo: {
    draw: ({ len }) => (
      <>
        <rect x={10} y={16} width={len - 20} height={72} rx={16} fill={P.chrome} />
        <ellipse cx={len / 2} cy={57} rx={(len - 48) / 2} ry={23} fill={P.glass} />
        <circle cx={len / 2} cy={57} r={6} fill={P.steel} />
        <rect x={len / 2 - 17} y={13} width={34} height={13} rx={6} fill={P.silver} />
        <rect x={len / 2 - 4.5} y={22} width={9} height={17} rx={4.5} fill={P.steel} />
        <circle cx={len / 2 - 22} cy={21} r={5.5} fill={P.blue} />
        <circle cx={len / 2 + 22} cy={21} r={5.5} fill={P.red} />
      </>
    ),
  },

  /* --- odds and ends -------------------------------------------------------- */
  malle: {
    draw: ({ len }) => (
      <>
        <rect x={10} y={16} width={len - 20} height={68} rx={9} fill={P.woodDark} />
        <rect x={17} y={23} width={len - 34} height={54} rx={6} fill={P.wood} />
        <rect x={len / 2 - 31} y={16} width={15} height={68} fill={P.charcoal} />
        <rect x={len / 2 + 16} y={16} width={15} height={68} fill={P.charcoal} />
        <rect x={len / 2 - 9} y={40} width={18} height={20} rx={4} fill={P.gold} />
      </>
    ),
  },

  plante: {
    draw: ({ len }) => (
      <>
        <circle cx={len / 2} cy={52} r={34} fill={P.clay} />
        <circle cx={len / 2} cy={52} r={26} fill={P.woodDark} />
        <circle cx={len / 2 - 15} cy={47} r={15} fill={P.greenDark} />
        <circle cx={len / 2 + 14} cy={51} r={16} fill={P.green} />
        <circle cx={len / 2 - 2} cy={35} r={14} fill={P.greenLight} />
        <circle cx={len / 2 + 4} cy={62} r={12} fill={P.green} />
      </>
    ),
  },

  volet: {
    draw: ({ len }) => (
      <>
        <rect x={10} y={13} width={len - 20} height={74} rx={8} fill={P.woodDark} />
        {range(4).map((i) => (
          <rect key={i} x={18} y={21 + i * 17} width={len - 36} height={10} rx={4} fill={P.woodLight} />
        ))}
        <rect x={len / 2 - 4} y={19} width={8} height={62} rx={4} fill={P.wood} />
      </>
    ),
  },

  /* A window is drawn on the wall by the grid itself; this exists for the legend. */
  window: {
    draw: ({ len }) => (
      <>
        <rect x={8} y={30} width={len - 16} height={40} rx={8} fill={P.wood} />
        <rect x={14} y={36} width={len - 28} height={28} rx={4} fill={P.glass} />
        <path d={`M ${len / 2} 36 V 64`} stroke={P.woodLight} strokeWidth={6} />
      </>
    ),
  },

  /* --- the helm: the only L-shaped object in the collection ----------------- */
  barre: {
    mode: 'plan',
    draw: ({ cells, outline }) => {
      const occupied = new Set(cells.map((c) => `${c.row}:${c.col}`))
      const contacts = (c: CellRef) =>
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].filter(([dr, dc]) => occupied.has(`${c.row + dr}:${c.col + dc}`)).length

      // The wheel goes on the elbow — the cell the two arms meet at — so the L
      // reads as a station built into a corner rather than as three tiles.
      const elbow = cells.find((c) => contacts(c) >= 2) ?? cells[0]
      const arms = cells.filter((c) => c !== elbow)
      const cx = (c: CellRef) => c.col * U + U / 2
      const cy = (c: CellRef) => c.row * U + U / 2

      return (
        <>
          <path d={outline(7, 20)} fill={P.woodDark} />
          <path d={outline(15, 16)} fill={P.wood} />
          {arms[0] && (
            <g transform={`rotate(-7 ${cx(arms[0])} ${cy(arms[0])})`}>
              <rect x={cx(arms[0]) - 30} y={cy(arms[0]) - 26} width={60} height={52} rx={5} fill={P.cream} />
              <path
                d={`M ${cx(arms[0]) - 20} ${cy(arms[0]) + 14} L ${cx(arms[0]) - 2} ${cy(arms[0]) - 4} L ${cx(arms[0]) + 18} ${cy(arms[0]) - 14}`}
                stroke={P.redDark}
                strokeWidth={3.5}
                strokeDasharray="7 6"
              />
              <circle cx={cx(arms[0]) + 18} cy={cy(arms[0]) - 14} r={5} fill={P.red} />
            </g>
          )}
          {arms[1] && (
            <>
              <circle cx={cx(arms[1])} cy={cy(arms[1])} r={26} fill={P.chrome} />
              <path
                d={`M ${cx(arms[1])} ${cy(arms[1]) - 19} L ${cx(arms[1]) + 6} ${cy(arms[1])} L ${cx(arms[1])} ${cy(arms[1]) + 19} L ${cx(arms[1]) - 6} ${cy(arms[1])} Z`}
                fill={P.redDark}
              />
              <circle cx={cx(arms[1])} cy={cy(arms[1])} r={4} fill={P.ink} />
            </>
          )}
          {helmWheel(cx(elbow), cy(elbow))}
        </>
      )
    },
  },
}

/** Anything without art of its own: a crate-like box, never a hatch pattern. */
const GENERIC: ArtSpec = {
  mode: 'plan',
  draw: ({ outline }) => (
    <>
      <path d={outline(9, 18)} fill={P.woodDark} />
      <path d={outline(18, 13)} fill={P.wood} />
    </>
  ),
}

/**
 * The object, drawn once, over the whole area it occupies. Sized by its
 * container: the grid gives it exactly the cells the object covers.
 */
export function V2ObjectArt({ object, className }: { object: SceneObject; className?: string }) {
  const footprint = footprintOf(object.cells)
  const width = footprint.cols * U
  const height = footprint.rows * U

  const spec = ART[object.type] ?? GENERIC
  const asRun = spec.mode !== 'plan' && footprint.isRun
  // Art authored as a straight strip cannot describe a footprint that bends.
  const usable = spec.mode === 'plan' || asRun ? spec : GENERIC

  const runCells = range(object.cells.length).map((i) => ({ row: 0, col: i }))
  const context: ArtContext = {
    len: asRun ? footprint.runLength : width,
    count: object.cells.length,
    cells: footprint.cells,
    outline: (inset, radius) => outlinePath(asRun ? runCells : footprint.cells, inset, radius),
  }

  const art = usable.draw(context)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
      stroke={P.ink}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      paintOrder="stroke"
      aria-hidden="true"
    >
      {/* Nobody stands on this one: it is given volume, drawn in the bounding box
          so the light keeps coming from the same corner whatever way the run
          turns. */}
      {!object.occupiable && (
        <path
          d={outlinePath(footprint.cells, BODY_INSET, BODY_RADIUS)}
          fill={P.ink}
          stroke="none"
          opacity={0.22}
          transform="translate(3 5)"
        />
      )}
      {/* A run that goes down the board is the canonical strip, quarter-turned. */}
      {asRun && footprint.vertical ? <g transform={`translate(${width} 0) rotate(90)`}>{art}</g> : art}
    </svg>
  )
}
