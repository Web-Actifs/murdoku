/**
 * ---------------------------------------------------------------------------
 * PORTRAIT PALETTE + TRAIT DEALING
 * ---------------------------------------------------------------------------
 * Everything a portrait needs that is *not* a path: the twelve signature
 * backdrops, the skin / hair / cloth ramps, and the deterministic dealing that
 * turns a person's index in a case into one specific face.
 *
 * The rule the whole thing exists to serve: inside a single case, no two
 * suspects may share a backdrop, and no two may share a motif. The backdrop is
 * the thing a player recognises across the board, the roster and the verdict —
 * far faster than a name — so it is dealt with strides coprime to the bank
 * size, which gives every roster up to twelve people a collision-free run.
 * ---------------------------------------------------------------------------
 */

import { genderOf, type Gender } from './personGender'

export const INK = '#241f1d'
export const PAPER = '#fdf8ef'

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                              */
/* -------------------------------------------------------------------------- */

function channels(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

/** Linear blend, `t` = how much of `b`. Used to derive every shade we need. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  const to = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${((1 << 24) + (to(ar, br) << 16) + (to(ag, bg) << 8) + to(ab, bb)).toString(16).slice(1)}`
}

export const deepen = (c: string, t = 0.34) => mix(c, INK, t)
export const lighten = (c: string, t = 0.4) => mix(c, '#ffffff', t)

/* -------------------------------------------------------------------------- */
/* Banks                                                                       */
/* -------------------------------------------------------------------------- */

/** Twelve gouache grounds, spaced round the wheel so neighbours never twin. */
export const BACKDROPS = [
  '#c8452f', // rouge cardinal
  '#35598f', // bleu nuit
  '#2c8a63', // vert bouteille
  '#dda12a', // ocre
  '#7a4880', // prune
  '#12a09c', // turquoise
  '#cf6b3a', // terracotta
  '#57636f', // ardoise
  '#d4657f', // rose ancien
  '#7c8a3a', // olive
  '#4b4a9e', // indigo
  '#8a5738', // cuivre
]

/** Skin: base tone plus the shade the light does not reach. */
export const SKINS: [string, string][] = [
  ['#f2d3b6', '#dcb28f'],
  ['#eec49f', '#d5a27b'],
  ['#dda87c', '#c0865a'],
  ['#c08654', '#9d663a'],
  ['#96603a', '#77441f'],
  ['#6d4325', '#502e16'],
]

export const HAIRS = [
  '#221c1a', // jais
  '#402a1e', // brun foncé
  '#6b4224', // châtain
  '#8f4d24', // auburn
  '#c06428', // roux
  '#d9ab5c', // blond
  '#cbbb92', // blond cendré
  '#9aa1a8', // poivre et sel
  '#e0dcd2', // blanc
]

export const GARMENTS = [
  '#2f3a45', // bleu ardoise
  '#3b3130', // brun sombre
  '#4a3f5c', // aubergine
  '#7a4a3c', // brique
  '#3d5c52', // vert wagon
  '#5a6b7c', // gris de lin
  '#867a52', // kaki
  '#6d2f34', // grenat
]

/** Ties, scarves, ribbons — reads as the one bright note on the figure. */
export const ACCENTS = ['#d94f3d', '#e2b13c', '#3f8f7a', '#4a6fae', '#c05a86', '#cf7a35']

export const EYES = ['#3d2b1f', '#4a6b8a', '#4e6b47', '#6b4a2c']

export const GOLD = '#e8b53c'

const STYLES_PER_GENDER = 10
const MOTIF_COUNT = 12

export interface PersonLook {
  gender: Gender
  /** Index into the gender's hairstyle bank. */
  style: number
  skin: string
  skinShade: string
  hair: string
  hairDark: string
  hairLight: string
  garment: string
  garmentDeep: string
  accent: string
  eye: string
  neckwear: number
  glasses: boolean
  jewel: boolean
  /** Signature ground + motif. Unique per person inside a case. */
  base: string
  deep: string
  tint: string
  motif: number
}

function hashString(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Varies the whole cast from one case to the next without touching the rule. */
export function caseRotationFor(caseId: string): number {
  return hashString(caseId) % 60
}

export function personLook(key: string, personIndex: number | undefined, rotation: number): PersonLook {
  // Index-based when the roster is known (V2): strides coprime with each bank
  // size mean eight suspects get eight different everything. Hash-based
  // otherwise (V1), where a rare twin costs nothing.
  const i = personIndex ?? hashString(key) % 97
  const r = rotation

  const hair = HAIRS[(i * 4 + r) % HAIRS.length]
  const [skin, skinShade] = SKINS[(i * 5 + r) % SKINS.length]
  const garment = GARMENTS[(i * 3 + r * 2) % GARMENTS.length]
  const base = BACKDROPS[(i * 5 + r) % BACKDROPS.length]

  return {
    gender: genderOf(key),
    style: (i * 3 + r) % STYLES_PER_GENDER,
    skin,
    skinShade,
    hair,
    hairDark: deepen(hair, 0.42),
    hairLight: lighten(hair, 0.34),
    garment,
    garmentDeep: deepen(garment, 0.3),
    accent: ACCENTS[(i * 5 + r * 3) % ACCENTS.length],
    eye: EYES[(i * 2 + r) % EYES.length],
    neckwear: (i + r) % 4,
    glasses: (i * 5 + r) % 4 === 1,
    jewel: (i * 3 + r) % 3 !== 2,
    base,
    deep: deepen(base, 0.36),
    tint: lighten(base, 0.46),
    motif: (i * 7 + r * 3) % MOTIF_COUNT,
  }
}
