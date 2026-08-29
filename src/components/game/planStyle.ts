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
