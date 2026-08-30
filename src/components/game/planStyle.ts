import type { CSSProperties } from 'react'

/*
 * Shared chrome for every floor plan, styled after a printed puzzle-book plan:
 * - one heavy ink wall around the plan and between rooms, hairlines inside a room
 * - muted retro fills, some rooms tiled (checkerboard / diamond lattice)
 * - room names on little rounded "sticker" tags overlapping the wall
 *
 * Used by both the V1 grid and the V2 grid so the two engines cannot drift apart
 * visually.
 */

export const INK = '#241f1d'
export const WALL = `3px solid ${INK}`
export const HAIRLINE = '1px solid rgb(36 31 29 / 0.16)'

export type RoomStyle = { bg: string; tile: string; pattern: 'flat' | 'check' | 'diamond' }

export const roomPalette: RoomStyle[] = [
  { bg: '#a9c5be', tile: '#93b4ac', pattern: 'diamond' }, // dusty teal
  { bg: '#e2a794', tile: '#cd8b76', pattern: 'check' }, // faded rust
  { bg: '#c9c2dd', tile: '#b5accd', pattern: 'flat' }, // washed purple
  { bg: '#dfc98d', tile: '#cbb373', pattern: 'check' }, // mustard
  { bg: '#b7cad9', tile: '#a1b8ca', pattern: 'diamond' }, // powder blue
  { bg: '#d0d4c6', tile: '#bec3b2', pattern: 'flat' }, // stone
  { bg: '#c6b6a0', tile: '#b3a189', pattern: 'check' }, // taupe
]

export const LABEL_TILT = [-2, 1.6, -1.2, 2.2, -1.6, 1.1]

export function patternStyle(style: RoomStyle): CSSProperties {
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

export type WallSide = 'top' | 'bottom' | 'left' | 'right'

const PANE_GLASS = '#eef1f0'
/** How far the pane reaches across the wall, in px — it straddles the 3px ink line. */
const PANE_DEPTH = 10
/** How far a run's outer end stops short of the tile corner, so it reads as a fixture, not a border. */
const PANE_END_INSET = '16%'
const PANE_RADIUS = 5
const SASH = 'rgb(36 31 29 / 0.4)'

/**
 * A window is mounted *in* the wall, not standing on the floor (Claude/claude.md
 * §10): its cells are ordinary tiles, so the pane is drawn astride the tile's
 * outward edge rather than centred in it like furniture.
 *
 * Multi-cell windows are drawn one segment per tile, but only the two ends of the
 * run are inset and rounded — the inner ends butt flush, so the segments read as a
 * single fixture whose per-tile joins are its mullions. That is what stops a
 * two-tile bay from looking like the same icon pasted twice.
 */
export function windowPaneStyle(side: WallSide, startsRun: boolean, endsRun: boolean): CSSProperties {
  const offset = -(PANE_DEPTH / 2) - 1
  const near = startsRun ? PANE_END_INSET : 0
  const far = endsRun ? PANE_END_INSET : 0
  const r = (rounded: boolean) => (rounded ? PANE_RADIUS : 0)
  const vertical = side === 'left' || side === 'right'

  const box: CSSProperties = vertical
    ? {
        [side]: offset,
        width: PANE_DEPTH,
        top: near,
        bottom: far,
        borderRadius: `${r(startsRun)}px ${r(startsRun)}px ${r(endsRun)}px ${r(endsRun)}px`,
      }
    : {
        [side]: offset,
        height: PANE_DEPTH,
        left: near,
        right: far,
        borderRadius: `${r(startsRun)}px ${r(endsRun)}px ${r(endsRun)}px ${r(startsRun)}px`,
      }

  return {
    ...box,
    position: 'absolute',
    boxSizing: 'border-box',
    backgroundColor: PANE_GLASS,
    border: `1.5px solid ${INK}`,
    // The sash: one hairline down the middle of the run, so the pane reads as
    // glazing rather than as a blank capsule.
    backgroundImage:
      `linear-gradient(${vertical ? 'to right' : 'to bottom'}, transparent calc(50% - 0.5px), ${SASH} calc(50% - 0.5px), ` +
      `${SASH} calc(50% + 0.5px), transparent calc(50% + 0.5px))`,
    zIndex: 25,
  }
}

const AVATAR_COLORS = ['#7c3aed', '#b8503a', '#3f8c84', '#ca8a04', '#166534', '#2563eb', '#be185d', '#0f766e']

/** FNV-1a 32-bit, same hash the avatar art uses — stable across reloads. */
function hashString(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * V2's `PersonDef` carries no colour of its own (the engine has no opinion on
 * presentation), so one is derived from a stable key instead of authored.
 */
export function personColor(key: string): string {
  return AVATAR_COLORS[hashString(key) % AVATAR_COLORS.length]
}

/**
 * A small, stable tilt in degrees for anything that should look hand-placed
 * rather than printed — the angle a stamp or a token comes down at. Stable per
 * key, so the same cell always settles the same way.
 */
export function paperTilt(key: string, spread = 7): number {
  return ((hashString(key) % 2000) / 2000) * spread * 2 - spread
}
