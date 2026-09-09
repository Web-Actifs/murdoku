import type { ReactNode } from 'react'
import type { PersonLook } from './personArt'

/**
 * ---------------------------------------------------------------------------
 * THE SIGNATURE GROUND
 * ---------------------------------------------------------------------------
 * Twelve printed grounds, one per suspect. This is the part of the portrait a
 * player actually reads at a glance: on a plan at 48px the face is four
 * pixels of eye, but "the one on the sunburst" survives any size. So the
 * motifs are deliberately coarse — big wedges, fat stripes, wide dots — and
 * all of them are drawn in the ground's own tint, which keeps the figure the
 * darkest thing in the square.
 *
 * Authored in the 100 x 100 portrait space, drawn before anything else.
 * ---------------------------------------------------------------------------
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

function sunburst(tint: string): ReactNode {
  return range(18)
    .filter((i) => i % 2 === 0)
    .map((i) => {
      const a0 = ((i * 20 - 90) * Math.PI) / 180
      const a1 = (((i + 1) * 20 - 90) * Math.PI) / 180
      const R = 95
      return (
        <path
          key={i}
          d={`M50 40 L${(50 + R * Math.cos(a0)).toFixed(1)} ${(40 + R * Math.sin(a0)).toFixed(1)} L${(50 + R * Math.cos(a1)).toFixed(1)} ${(40 + R * Math.sin(a1)).toFixed(1)} Z`}
          fill={tint}
          opacity={0.5}
        />
      )
    })
}

function stripes(tint: string): ReactNode {
  return (
    <g transform="rotate(-32 50 50)">
      {range(13).map((i) => (
        <rect key={i} x={-45} y={-35 + i * 15} width={190} height={7.5} fill={tint} opacity={0.48} />
      ))}
    </g>
  )
}

function dots(tint: string): ReactNode {
  return range(7).map((r) =>
    range(7).map((c) => (
      <circle key={`${r}-${c}`} cx={c * 17 + (r % 2 ? 8.5 : 0)} cy={r * 16 + 3} r={4.8} fill={tint} opacity={0.55} />
    )),
  )
}

function chevrons(tint: string): ReactNode {
  return range(8).map((i) => (
    <path key={i} d={`M-12 ${i * 16 + 4} L50 ${i * 16 - 11} L112 ${i * 16 + 4}`} stroke={tint} strokeWidth={6} fill="none" opacity={0.5} />
  ))
}

function checks(tint: string): ReactNode {
  return range(7).map((r) =>
    range(7).map((c) =>
      (r + c) % 2 === 0 ? <rect key={`${r}-${c}`} x={c * 15} y={r * 15} width={15} height={15} fill={tint} opacity={0.42} /> : null,
    ),
  )
}

function rings(tint: string): ReactNode {
  return range(5).map((i) => (
    <circle key={i} cx={50} cy={44} r={15 + i * 14} fill="none" stroke={tint} strokeWidth={6} opacity={0.5} />
  ))
}

function grid(tint: string): ReactNode {
  return (
    <g stroke={tint} strokeWidth={3.2} opacity={0.42}>
      {range(9).map((i) => (
        <line key={`v${i}`} x1={i * 12 + 2} y1={0} x2={i * 12 + 2} y2={100} />
      ))}
      {range(9).map((i) => (
        <line key={`h${i}`} x1={0} y1={i * 12 + 2} x2={100} y2={i * 12 + 2} />
      ))}
    </g>
  )
}

function scales(tint: string): ReactNode {
  return range(8).map((r) =>
    range(8).map((c) => (
      <path
        key={`${r}-${c}`}
        d={`M${c * 16 - 8 + (r % 2 ? 8 : 0)} ${r * 14 + 6} a8 8 0 0 1 16 0`}
        fill="none"
        stroke={tint}
        strokeWidth={3.6}
        opacity={0.5}
      />
    )),
  )
}

function triangles(tint: string): ReactNode {
  return range(6).map((r) =>
    range(6).map((c) => (
      <path key={`${r}-${c}`} d={`M${c * 18 - 4} ${r * 18 + 18} l9.5 -16 l9.5 16 Z`} fill={tint} opacity={0.45} />
    )),
  )
}

function lattice(tint: string): ReactNode {
  return (
    <g stroke={tint} strokeWidth={3.4} opacity={0.4}>
      {range(11).map((i) => (
        <line key={`a${i}`} x1={-30 + i * 18} y1={-10} x2={60 + i * 18} y2={112} />
      ))}
      {range(11).map((i) => (
        <line key={`b${i}`} x1={130 - i * 18} y1={-10} x2={40 - i * 18} y2={112} />
      ))}
    </g>
  )
}

function waves(tint: string): ReactNode {
  return range(8).map((i) => (
    <path key={i} d={`M-8 ${i * 14 + 8} q12 -9 24 0 t24 0 t24 0 t24 0`} fill="none" stroke={tint} strokeWidth={4.2} opacity={0.5} />
  ))
}

const STAR_SPOTS: [number, number, number][] = [
  [13, 13, 7.5], [37, 25, 5], [63, 11, 6], [87, 21, 7.5], [9, 43, 5.5],
  [91, 50, 5], [15, 72, 7], [39, 87, 5.5], [64, 79, 6.5], [89, 87, 6], [50, 61, 4.5],
]

function stars(tint: string): ReactNode {
  return STAR_SPOTS.map(([x, y, s], i) => (
    <path
      key={i}
      d={`M${x} ${y - s} Q${x + s * 0.3} ${y - s * 0.3} ${x + s} ${y} Q${x + s * 0.3} ${y + s * 0.3} ${x} ${y + s} Q${x - s * 0.3} ${y + s * 0.3} ${x - s} ${y} Q${x - s * 0.3} ${y - s * 0.3} ${x} ${y - s} Z`}
      fill={tint}
      opacity={0.55}
    />
  ))
}

const MOTIFS = [sunburst, stripes, dots, chevrons, checks, rings, grid, scales, triangles, lattice, waves, stars]

export function Backdrop({ look, vignetteId }: { look: PersonLook; vignetteId: string }) {
  const draw = MOTIFS[look.motif % MOTIFS.length]
  return (
    <>
      <rect width={100} height={100} fill={look.base} />
      {draw(look.tint)}
      {/* Printed vignette: the ground darkens into the corners so the bust
          never floats and the frame reads as a photograph, not a swatch. */}
      <rect width={100} height={100} fill={`url(#${vignetteId})`} />
    </>
  )
}
