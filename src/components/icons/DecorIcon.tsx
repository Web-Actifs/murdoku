import type { ReactNode } from 'react'
import type { DecorType } from '../../engine/types'

/*
 * ---------------------------------------------------------------------------
 * DECOR ICON STYLE GUIDE — read this before adding a new icon
 * ---------------------------------------------------------------------------
 * Family: flat, multicolor "mobile puzzle game" illustrations. No line icons.
 *
 * 1. CANVAS. Always `viewBox="0 0 24 24"`. Keep the drawing inside x/y 1.5..22.5
 *    so nothing clips inside the round chip it is rendered in. The root <svg>
 *    already sets fill="none" + round caps/joins: every shape declares its own
 *    `fill`, strokes are the exception (ropes, chains, thin handles).
 *
 * 2. PALETTE. Pick 2-4 colors from `P` per icon, all from the same object's
 *    real-world logic (a plant is green, a tire is charcoal). `P` holds a light
 *    / base / dark triplet for most hues — use them as: base = the main mass,
 *    light = the top/left face, dark = the bottom/right face. Never build an
 *    icon out of only pale colors: these render on a white/70 chip, so the
 *    dominant mass must be a saturated mid-tone or a dark neutral.
 *
 * 3. LIGHTING. One rule everywhere: light comes from the top-left. That means
 *    lids/tops/backrests use the lighter shade, bases/legs/fronts use the
 *    darker shade. Optional gloss = a white path at opacity 0.3-0.5, drawn as a
 *    diagonal band on glass/screens only.
 *
 * 4. SHAPE LANGUAGE. Chunky and rounded: rectangles use rx 0.6-2.2 (small parts
 *    ~0.6, big bodies ~2), no feature thinner than ~1.2 units, no detail smaller
 *    than ~1 unit — anything finer disappears in the 16px legend. Strokes, when
 *    used, are 1.4-2.6 wide. Prefer contrast between adjacent shapes over
 *    outlines; there is no global outline in this set.
 *
 * 5. LEGIBILITY TEST. Squint at 16px: the silhouette alone should name the
 *    object. Max ~6 visible parts per icon. Drop ornament before you shrink it.
 *
 * 6. ADDING ONE. Add the value to `DecorType` in engine/types.ts, then a `case`
 *    here in the same order. The `default` branch is a `never` guard, so a
 *    missing case fails `tsc --noEmit -p tsconfig.app.json`.
 * ---------------------------------------------------------------------------
 */

const P = {
  ink: '#3b3330',
  charcoal: '#38404a',
  slate: '#4a5560',
  steel: '#7c8894',
  silver: '#b6c0c9',
  chrome: '#dfe6ec',
  cream: '#fff3e2',
  bone: '#e8e0cd',
  boneDark: '#cbc0a5',
  wood: '#c98b52',
  woodLight: '#e6b985',
  woodDark: '#9a6435',
  red: '#f2604a',
  redDark: '#cf4230',
  coral: '#ff8b78',
  gold: '#f5b93c',
  goldDark: '#d4881f',
  sun: '#ffd25e',
  green: '#3fa96b',
  greenDark: '#2c8352',
  greenLight: '#79d09a',
  teal: '#12b8a6',
  tealDark: '#0d8e80',
  blue: '#4a90e2',
  blueDark: '#2f6bb5',
  blueLight: '#8fbdf0',
  sky: '#7fd3f0',
  glass: '#cdeefb',
  purple: '#8a6bd1',
  purpleDark: '#5f4794',
  pink: '#f2789f',
  clay: '#d9663f',
  clayLight: '#ef8a63',
  white: '#ffffff',
}

export function DecorIcon({ type, className }: { type: DecorType; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {renderShape(type)}
    </svg>
  )
}

function renderShape(type: DecorType): ReactNode {
  switch (type) {
    /* --- Garage / salle de boxe ------------------------------------------ */
    case 'plant':
      return (
        <>
          <rect x="11.2" y="9.5" width="1.6" height="5" fill={P.greenDark} />
          <circle cx="8.4" cy="8.6" r="3.7" fill={P.green} />
          <circle cx="15.6" cy="8.6" r="3.7" fill={P.green} />
          <circle cx="12" cy="6" r="4.2" fill={P.greenLight} />
          <path d="M7 15.6h10l-1.1 4.9a1.4 1.4 0 0 1-1.4 1.1H9.5a1.4 1.4 0 0 1-1.4-1.1Z" fill={P.clay} />
          <rect x="5.8" y="13" width="12.4" height="2.9" rx="1.4" fill={P.clayLight} />
        </>
      )
    case 'chair':
      return (
        <>
          <rect x="6" y="2.6" width="12" height="8.8" rx="2.2" fill={P.woodLight} />
          <rect x="8.2" y="4.8" width="7.6" height="1.6" rx="0.8" fill={P.white} opacity={0.4} />
          <rect x="4.4" y="11.4" width="15.2" height="3.4" rx="1.6" fill={P.wood} />
          <rect x="6" y="14.6" width="2.4" height="6.6" rx="1" fill={P.woodDark} />
          <rect x="15.6" y="14.6" width="2.4" height="6.6" rx="1" fill={P.woodDark} />
        </>
      )
    case 'sofa':
      return (
        <>
          <rect x="3" y="6.4" width="18" height="7.4" rx="2.6" fill={P.blue} />
          <rect x="11.2" y="7.4" width="1.6" height="5.4" rx="0.8" fill={P.blueDark} opacity={0.6} />
          <rect x="4.4" y="12" width="15.2" height="5.2" rx="2" fill={P.blueLight} />
          <rect x="1.8" y="9.6" width="4" height="7.6" rx="2" fill={P.blueDark} />
          <rect x="18.2" y="9.6" width="4" height="7.6" rx="2" fill={P.blueDark} />
          <rect x="4.6" y="17" width="2" height="3" rx="1" fill={P.woodDark} />
          <rect x="17.4" y="17" width="2" height="3" rx="1" fill={P.woodDark} />
        </>
      )
    case 'tv':
      return (
        <>
          <rect x="1.8" y="3.6" width="20.4" height="13.4" rx="2.2" fill={P.charcoal} />
          <rect x="3.4" y="5.2" width="17.2" height="10.2" rx="1.2" fill={P.sky} />
          <path d="M5.2 15.4 11 5.2h2.6L7.8 15.4Z" fill={P.white} opacity={0.35} />
          <rect x="10.4" y="17" width="3.2" height="2.4" fill={P.slate} />
          <rect x="6.8" y="19.2" width="10.4" height="2.2" rx="1.1" fill={P.slate} />
        </>
      )
    case 'tool-bench':
      return (
        <>
          <rect x="2.8" y="2.2" width="18.4" height="8" rx="1.4" fill={P.woodLight} />
          <rect x="5.4" y="3.6" width="2.6" height="5.2" rx="1.3" fill={P.steel} />
          <rect x="11.4" y="3.6" width="6" height="2.6" rx="1" fill={P.slate} />
          <rect x="13.6" y="6" width="2.2" height="3.4" rx="1" fill={P.red} />
          <rect x="1.6" y="10.4" width="20.8" height="3.4" rx="1.7" fill={P.wood} />
          <rect x="3.2" y="13.6" width="3" height="7.6" rx="1.2" fill={P.woodDark} />
          <rect x="17.8" y="13.6" width="3" height="7.6" rx="1.2" fill={P.woodDark} />
          <rect x="6.8" y="14.2" width="10.4" height="4.4" rx="1.1" fill={P.woodDark} />
          <rect x="9.4" y="15.8" width="5.2" height="1.4" rx="0.7" fill={P.chrome} />
        </>
      )
    case 'toolbox':
      return (
        <>
          <path d="M9 9.2V7.4a3 3 0 0 1 6 0v1.8" stroke={P.slate} strokeWidth="2" />
          <rect x="2.4" y="8.6" width="19.2" height="4" rx="1.8" fill={P.coral} />
          <rect x="2.4" y="11.8" width="19.2" height="7.8" rx="1.8" fill={P.red} />
          <rect x="2.4" y="16.6" width="19.2" height="3" fill={P.redDark} opacity={0.55} />
          <rect x="10.4" y="12.4" width="3.2" height="3" rx="0.8" fill={P.sun} />
        </>
      )
    case 'car':
      return (
        <>
          <path d="M6.2 11.4 8.1 7.7a2.2 2.2 0 0 1 2-1.2h3.8a2.2 2.2 0 0 1 2 1.2l1.9 3.7Z" fill={P.coral} />
          <path d="M9.2 10.4 10.6 7.7h1.1v2.7Z" fill={P.glass} />
          <path d="M12.9 7.7h1.2l1.4 2.7h-2.6Z" fill={P.glass} />
          <rect x="1.8" y="10.6" width="20.4" height="5.6" rx="2.2" fill={P.red} />
          <rect x="1.8" y="14" width="20.4" height="2.2" fill={P.redDark} opacity={0.5} />
          <rect x="19.9" y="11.8" width="2.3" height="1.8" rx="0.9" fill={P.sun} />
          <circle cx="6.8" cy="16.6" r="2.9" fill={P.charcoal} />
          <circle cx="6.8" cy="16.6" r="1.1" fill={P.chrome} />
          <circle cx="17.2" cy="16.6" r="2.9" fill={P.charcoal} />
          <circle cx="17.2" cy="16.6" r="1.1" fill={P.chrome} />
        </>
      )
    case 'tire-stack':
      return (
        <>
          <ellipse cx="12" cy="17" rx="7.8" ry="3.8" fill={P.ink} />
          <ellipse cx="12" cy="15.6" rx="7.8" ry="3.8" fill={P.slate} />
          <ellipse cx="12" cy="15.4" rx="3" ry="1.5" fill={P.chrome} />
          <ellipse cx="12" cy="9.6" rx="7.8" ry="3.8" fill={P.ink} />
          <ellipse cx="12" cy="8.2" rx="7.8" ry="3.8" fill={P.steel} />
          <ellipse cx="12" cy="8" rx="3" ry="1.5" fill={P.chrome} />
        </>
      )
    case 'speaker':
      return (
        <>
          <rect x="4.6" y="2.2" width="14.8" height="19.6" rx="2.4" fill={P.charcoal} />
          <rect x="6" y="3.6" width="12" height="16.8" rx="1.6" fill={P.slate} />
          <circle cx="12" cy="7.6" r="2.4" fill={P.steel} />
          <circle cx="12" cy="7.6" r="1" fill={P.charcoal} />
          <circle cx="12" cy="15.2" r="3.9" fill={P.silver} />
          <circle cx="12" cy="15.2" r="1.6" fill={P.charcoal} />
        </>
      )
    case 'window':
      return (
        <>
          <rect x="2.6" y="2.6" width="18.8" height="16.4" rx="2" fill={P.wood} />
          <rect x="4.4" y="4.4" width="15.2" height="12.8" rx="1" fill={P.sky} />
          <path d="M6.4 10.2 8.9 4.4h1.8L8.2 10.2Z" fill={P.white} opacity={0.45} />
          <rect x="11.3" y="4.4" width="1.4" height="12.8" fill={P.woodLight} />
          <rect x="4.4" y="10.1" width="15.2" height="1.4" fill={P.woodLight} />
          <rect x="1.6" y="18.6" width="20.8" height="2.4" rx="1.2" fill={P.woodDark} />
        </>
      )
    case 'table':
      return (
        <>
          <rect x="1.6" y="7" width="20.8" height="3.4" rx="1.7" fill={P.woodLight} />
          <rect x="4" y="7.8" width="9" height="1.2" rx="0.6" fill={P.white} opacity={0.4} />
          <rect x="3.6" y="10.2" width="16.8" height="2.2" fill={P.wood} />
          <rect x="4.2" y="12.4" width="2.8" height="8.8" rx="1.2" fill={P.wood} />
          <rect x="17" y="12.4" width="2.8" height="8.8" rx="1.2" fill={P.wood} />
        </>
      )
    case 'locker':
      return (
        <>
          <rect x="3.6" y="1.8" width="16.8" height="20.4" rx="2.2" fill={P.blueDark} />
          <rect x="4.6" y="2.8" width="7.2" height="18.4" rx="1.4" fill={P.blueLight} />
          <rect x="12.2" y="2.8" width="7.2" height="18.4" rx="1.4" fill={P.blue} />
          <rect x="6.2" y="4.4" width="4" height="1.2" rx="0.6" fill={P.blueDark} />
          <rect x="6.2" y="6.4" width="4" height="1.2" rx="0.6" fill={P.blueDark} />
          <rect x="13.8" y="4.4" width="4" height="1.2" rx="0.6" fill={P.blueDark} />
          <rect x="13.8" y="6.4" width="4" height="1.2" rx="0.6" fill={P.blueDark} />
          <rect x="10.2" y="10.6" width="1.4" height="3.4" rx="0.7" fill={P.sun} />
          <rect x="12.6" y="10.6" width="1.4" height="3.4" rx="0.7" fill={P.sun} />
        </>
      )
    case 'punching-bag':
      return (
        <>
          <rect x="11.2" y="1.4" width="1.6" height="3" fill={P.steel} />
          <rect x="7.4" y="3.6" width="9.2" height="2.6" rx="1.3" fill={P.charcoal} />
          <path d="M8 6.2h8l-.8 10.5a3.2 3.2 0 0 1-6.4 0Z" fill={P.red} />
          <path d="M7.86 10.6h8.28l-.16 2.6H8.02Z" fill={P.cream} />
          <rect x="9.4" y="7" width="1.6" height="3" rx="0.8" fill={P.white} opacity={0.35} />
        </>
      )
    case 'dumbbell':
      return (
        <>
          <rect x="6.6" y="10.2" width="10.8" height="3.6" rx="1.8" fill={P.silver} />
          <rect x="5.2" y="7.6" width="3.4" height="8.8" rx="1.4" fill={P.steel} />
          <rect x="15.4" y="7.6" width="3.4" height="8.8" rx="1.4" fill={P.steel} />
          <rect x="1.6" y="5.6" width="4.4" height="12.8" rx="1.8" fill={P.charcoal} />
          <rect x="18" y="5.6" width="4.4" height="12.8" rx="1.8" fill={P.charcoal} />
          <rect x="8.2" y="10.9" width="4.4" height="1.1" rx="0.55" fill={P.white} opacity={0.5} />
        </>
      )
    case 'trophy':
      return (
        <>
          <path d="M7.2 4.8H4.2v1.4a3.6 3.6 0 0 0 3.6 3.6M16.8 4.8h3v1.4a3.6 3.6 0 0 1-3.6 3.6" stroke={P.goldDark} strokeWidth="1.8" />
          <path d="M6.8 2.6h10.4v6.2a5.2 5.2 0 0 1-10.4 0Z" fill={P.gold} />
          <path d="M9 4.2h1.7v4.6a2 2 0 0 0 .5 1.3H10a1.6 1.6 0 0 1-1-1.5Z" fill={P.white} opacity={0.35} />
          <rect x="10.8" y="13.6" width="2.4" height="3.4" fill={P.goldDark} />
          <rect x="7.6" y="16.6" width="8.8" height="2" rx="1" fill={P.gold} />
          <rect x="5.8" y="18.4" width="12.4" height="2.8" rx="1.4" fill={P.goldDark} />
        </>
      )

    /* --- Plage ------------------------------------------------------------ */
    case 'parasol':
      return (
        <>
          <ellipse cx="12" cy="20.6" rx="5" ry="1.5" fill={P.sun} opacity={0.6} />
          <rect x="11.3" y="10.4" width="1.4" height="10.4" rx="0.7" fill={P.woodLight} />
          <path d="M2.5 12a9.5 9.5 0 0 1 19 0Z" fill={P.red} />
          <path d="M12 2.6 5.9 12h3.7Z" fill={P.cream} />
          <path d="M12 2.6 14.4 12h3.7Z" fill={P.cream} />
          <circle cx="12" cy="2.4" r="1.1" fill={P.goldDark} />
        </>
      )
    case 'deckchair':
      return (
        <>
          <rect x="7.4" y="16.6" width="2.2" height="4.6" rx="1.1" fill={P.woodDark} />
          <rect x="17.2" y="16.6" width="2.2" height="4.6" rx="1.1" fill={P.woodDark} />
          <path d="M6.4 16.4 3.2 6.2l3.4-1 3.2 10.2Z" fill={P.teal} />
          <path d="M4.48 10.28 7.88 9.28l.48 1.53-3.4 1Z" fill={P.cream} />
          <rect x="6.4" y="14.2" width="13.6" height="3.4" rx="1.7" fill={P.teal} />
          <rect x="10.2" y="14.2" width="2" height="3.4" fill={P.cream} />
          <rect x="15.2" y="14.2" width="2" height="3.4" fill={P.cream} />
        </>
      )
    case 'beach-ball':
      return (
        <>
          <circle cx="12" cy="12" r="9" fill={P.sky} />
          <path d="M12 12V3a9 9 0 0 1 7.79 4.5Z" fill={P.red} />
          <path d="M12 12l7.79 4.5A9 9 0 0 1 12 21Z" fill={P.sun} />
          <path d="M12 12 4.21 16.5a9 9 0 0 1 0-9Z" fill={P.cream} />
          <circle cx="12" cy="12" r="1.6" fill={P.white} />
          <circle cx="8.4" cy="7.4" r="1.5" fill={P.white} opacity={0.5} />
        </>
      )
    case 'cooler':
      return (
        <>
          <rect x="8.8" y="4.4" width="6.4" height="1.8" rx="0.9" fill={P.charcoal} />
          <rect x="2.4" y="9.8" width="19.2" height="10" rx="2" fill={P.blueDark} />
          <rect x="2.4" y="9.8" width="19.2" height="5.6" rx="2" fill={P.blue} />
          <rect x="3.6" y="12.4" width="3.8" height="1.8" rx="0.9" fill={P.blueDark} />
          <rect x="16.6" y="12.4" width="3.8" height="1.8" rx="0.9" fill={P.blueDark} />
          <rect x="1.6" y="6" width="20.8" height="4" rx="2" fill={P.silver} />
          <rect x="10.4" y="9.4" width="3.2" height="3" rx="0.8" fill={P.sun} />
        </>
      )
    case 'surfboard':
      return (
        <>
          <path d="M12 1.6c3.9 3.9 5.4 8.2 5.4 11.8 0 4.8-2.7 8.2-5.4 9.1-2.7-.9-5.4-4.3-5.4-9.1 0-3.6 1.5-7.9 5.4-11.8Z" fill={P.sun} />
          <path d="M12 1.6c1.8 1.8 3 3.9 3.8 5.9H8.2c.8-2 2-4.1 3.8-5.9Z" fill={P.red} />
          <path d="M12 4.4c2.4 3 3.4 6.2 3.4 9 0 3.5-1.7 6-3.4 6.9Z" fill={P.gold} opacity={0.5} />
          <rect x="11.1" y="8" width="1.8" height="12.6" rx="0.9" fill={P.red} />
        </>
      )

    /* --- Aéroport ---------------------------------------------------------- */
    case 'suitcase':
      return (
        <>
          <path d="M9.6 7V5.4a2.4 2.4 0 0 1 4.8 0V7" stroke={P.charcoal} strokeWidth="1.8" />
          <rect x="2.6" y="6.8" width="18.8" height="13.4" rx="2.4" fill={P.blueDark} />
          <rect x="2.6" y="6.8" width="18.8" height="7.4" rx="2.4" fill={P.blue} />
          <rect x="7" y="6.8" width="2.6" height="13.4" fill={P.charcoal} opacity={0.45} />
          <rect x="14.4" y="6.8" width="2.6" height="13.4" fill={P.charcoal} opacity={0.45} />
          <rect x="10.6" y="12.2" width="2.8" height="2.8" rx="0.7" fill={P.sun} />
          <rect x="4.6" y="20" width="2.8" height="1.8" rx="0.9" fill={P.charcoal} />
          <rect x="16.6" y="20" width="2.8" height="1.8" rx="0.9" fill={P.charcoal} />
        </>
      )
    case 'luggage-cart':
      return (
        <>
          <rect x="3.4" y="2.6" width="7.2" height="2" rx="1" fill={P.charcoal} />
          <rect x="3.4" y="2.6" width="2" height="15.4" rx="1" fill={P.steel} />
          <rect x="2.6" y="17.4" width="14.4" height="2.2" rx="1.1" fill={P.steel} />
          <rect x="6.2" y="8.6" width="10.2" height="8.8" rx="1.8" fill={P.red} />
          <rect x="10.2" y="8.6" width="2.2" height="8.8" fill={P.redDark} />
          <rect x="7.6" y="10.2" width="3" height="1.4" rx="0.7" fill={P.white} opacity={0.5} />
          <circle cx="5" cy="20.8" r="1.7" fill={P.charcoal} />
          <circle cx="14.8" cy="20.8" r="1.7" fill={P.charcoal} />
        </>
      )
    case 'departure-board':
      return (
        <>
          <rect x="1.8" y="3.4" width="20.4" height="14.4" rx="2.2" fill={P.charcoal} />
          <rect x="3.6" y="5.4" width="6.2" height="2.2" rx="0.7" fill={P.sun} />
          <rect x="10.8" y="5.4" width="9.6" height="2.2" rx="0.7" fill={P.steel} />
          <rect x="3.6" y="9.4" width="4.6" height="2.2" rx="0.7" fill={P.sun} />
          <rect x="9.2" y="9.4" width="11.2" height="2.2" rx="0.7" fill={P.steel} />
          <rect x="3.6" y="13.4" width="7.4" height="2.2" rx="0.7" fill={P.sun} />
          <rect x="12" y="13.4" width="8.4" height="2.2" rx="0.7" fill={P.steel} />
          <rect x="6.4" y="17.8" width="2.4" height="3.4" rx="0.8" fill={P.slate} />
          <rect x="15.2" y="17.8" width="2.4" height="3.4" rx="0.8" fill={P.slate} />
        </>
      )
    case 'vending-machine':
      return (
        <>
          <rect x="3.6" y="1.8" width="16.8" height="20.4" rx="2.2" fill={P.red} />
          <rect x="4.8" y="3.2" width="9" height="13.6" rx="1.2" fill={P.sky} />
          <rect x="5.8" y="4.6" width="2" height="2.4" rx="0.5" fill={P.cream} />
          <rect x="8.4" y="4.6" width="2" height="2.4" rx="0.5" fill={P.sun} />
          <rect x="11" y="4.6" width="2" height="2.4" rx="0.5" fill={P.green} />
          <rect x="5.8" y="8.4" width="2" height="2.4" rx="0.5" fill={P.sun} />
          <rect x="8.4" y="8.4" width="2" height="2.4" rx="0.5" fill={P.green} />
          <rect x="11" y="8.4" width="2" height="2.4" rx="0.5" fill={P.cream} />
          <rect x="5.8" y="12.2" width="2" height="2.4" rx="0.5" fill={P.green} />
          <rect x="8.4" y="12.2" width="2" height="2.4" rx="0.5" fill={P.cream} />
          <rect x="11" y="12.2" width="2" height="2.4" rx="0.5" fill={P.sun} />
          <rect x="15" y="3.2" width="4.2" height="6.4" rx="0.9" fill={P.charcoal} />
          <rect x="15" y="11" width="4.2" height="2.4" rx="0.8" fill={P.sun} />
          <rect x="4.8" y="18" width="14.4" height="3" rx="1" fill={P.charcoal} />
        </>
      )
    case 'bench':
      return (
        <>
          <rect x="4" y="4.6" width="2.6" height="9" fill={P.charcoal} />
          <rect x="17.4" y="4.6" width="2.6" height="9" fill={P.charcoal} />
          <rect x="2.8" y="4.6" width="18.4" height="2.6" rx="1.3" fill={P.woodLight} />
          <rect x="2.8" y="8.4" width="18.4" height="2.6" rx="1.3" fill={P.woodLight} />
          <rect x="2.2" y="12.4" width="19.6" height="3" rx="1.5" fill={P.wood} />
          <rect x="4" y="15.4" width="2.6" height="5.8" rx="1" fill={P.charcoal} />
          <rect x="17.4" y="15.4" width="2.6" height="5.8" rx="1" fill={P.charcoal} />
        </>
      )

    /* --- Commissariat ------------------------------------------------------ */
    case 'filing-cabinet':
      return (
        <>
          <rect x="3.6" y="2" width="16.8" height="20" rx="2" fill={P.steel} />
          <rect x="4.8" y="3.2" width="14.4" height="5.2" rx="1.1" fill={P.silver} />
          <rect x="4.8" y="9.4" width="14.4" height="5.2" rx="1.1" fill={P.silver} />
          <rect x="4.8" y="15.6" width="14.4" height="5.2" rx="1.1" fill={P.silver} />
          <rect x="9.6" y="5.2" width="4.8" height="1.4" rx="0.7" fill={P.slate} />
          <rect x="9.6" y="11.4" width="4.8" height="1.4" rx="0.7" fill={P.slate} />
          <rect x="9.6" y="17.6" width="4.8" height="1.4" rx="0.7" fill={P.slate} />
        </>
      )
    case 'coffee-machine':
      return (
        <>
          <rect x="3.6" y="2" width="16.8" height="19.2" rx="2.2" fill={P.charcoal} />
          <rect x="5.2" y="3.4" width="13.6" height="4.6" rx="1.2" fill={P.sky} />
          <path d="M6.4 8 9.6 3.4h1.8L8.2 8Z" fill={P.white} opacity={0.35} />
          <rect x="10.4" y="9" width="3.2" height="2" rx="0.5" fill={P.steel} />
          <rect x="11.5" y="11" width="1.2" height="2.4" rx="0.6" fill={P.woodDark} />
          <path d="M8.4 13.6h7l-.8 4.2a1.6 1.6 0 0 1-1.6 1.3h-2.2a1.6 1.6 0 0 1-1.6-1.3Z" fill={P.cream} />
          <path d="M15.6 14.8a1.9 1.9 0 0 1 0 3.2" stroke={P.cream} strokeWidth="1.4" />
          <rect x="5.8" y="19.4" width="12.4" height="1.8" rx="0.9" fill={P.steel} />
        </>
      )
    case 'handcuffs':
      return (
        <>
          <path d="m10 11 4 2" stroke={P.steel} strokeWidth="3" />
          <circle cx="7" cy="9.2" r="5" fill={P.slate} />
          <circle cx="7" cy="9.2" r="2.4" fill={P.white} />
          <circle cx="17" cy="14.8" r="5" fill={P.steel} />
          <circle cx="17" cy="14.8" r="2.4" fill={P.white} />
          <rect x="5.4" y="3" width="3.2" height="2.6" rx="1.1" fill={P.charcoal} />
          <rect x="15.4" y="18.6" width="3.2" height="2.6" rx="1.1" fill={P.charcoal} />
        </>
      )
    case 'radio':
      return (
        <>
          <rect x="13.4" y="1.6" width="1.8" height="5.4" rx="0.9" fill={P.steel} />
          <rect x="6.6" y="5.8" width="10.8" height="15.6" rx="2.2" fill={P.charcoal} />
          <rect x="8.2" y="7.2" width="7.6" height="3.8" rx="1" fill={P.steel} />
          <rect x="8.2" y="12" width="7.6" height="3" rx="0.8" fill={P.sky} />
          <rect x="8.2" y="16.2" width="3.2" height="1.6" rx="0.6" fill={P.silver} />
          <rect x="12.6" y="16.2" width="3.2" height="1.6" rx="0.6" fill={P.silver} />
          <rect x="8.2" y="18.4" width="3.2" height="1.6" rx="0.6" fill={P.silver} />
          <rect x="12.6" y="18.4" width="3.2" height="1.6" rx="0.6" fill={P.red} />
        </>
      )
    case 'computer':
      return (
        <>
          <rect x="1.8" y="3.2" width="20.4" height="13.8" rx="2.2" fill={P.charcoal} />
          <rect x="3.4" y="4.8" width="17.2" height="10.6" rx="1.2" fill={P.blue} />
          <rect x="5" y="6.6" width="7.4" height="1.6" rx="0.8" fill={P.white} opacity={0.75} />
          <rect x="5" y="9.4" width="11" height="1.6" rx="0.8" fill={P.white} opacity={0.5} />
          <rect x="5" y="12.2" width="8.6" height="1.6" rx="0.8" fill={P.white} opacity={0.5} />
          <rect x="10.4" y="17" width="3.2" height="2.4" fill={P.slate} />
          <rect x="6.8" y="19.2" width="10.4" height="2.2" rx="1.1" fill={P.slate} />
        </>
      )
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="9.4" fill={P.red} />
          <circle cx="12" cy="12" r="7.4" fill={P.cream} />
          <rect x="11.3" y="5.4" width="1.4" height="1.8" rx="0.7" fill={P.redDark} />
          <rect x="11.3" y="16.8" width="1.4" height="1.8" rx="0.7" fill={P.redDark} />
          <rect x="11.2" y="6.6" width="1.6" height="6" rx="0.8" fill={P.charcoal} />
          <rect x="11.6" y="11.2" width="5.2" height="1.6" rx="0.8" fill={P.charcoal} />
          <circle cx="12" cy="12" r="1.2" fill={P.red} />
        </>
      )

    /* --- Musée ------------------------------------------------------------- */
    case 'painting':
      return (
        <>
          <rect x="2.2" y="3.6" width="19.6" height="16.8" rx="1.8" fill={P.gold} />
          <rect x="4" y="5.4" width="16" height="13.2" rx="0.8" fill={P.cream} />
          <rect x="5.2" y="6.6" width="13.6" height="10.8" rx="0.5" fill={P.sky} />
          <circle cx="16.4" cy="9.4" r="1.7" fill={P.sun} />
          <path d="M5.2 17.4V15l3.8-4.6 3.4 3.8 2.8-3.2 3.6 6.4Z" fill={P.green} />
          <path d="M5.2 17.4v-1.2l3.8-1.6 4 1.4 5.8-1.4v2.8Z" fill={P.greenDark} />
        </>
      )
    case 'statue':
      return (
        <>
          <circle cx="12" cy="5.6" r="3.4" fill={P.silver} />
          <path d="M7.2 15.2c0-3.4 2.1-5.8 4.8-5.8s4.8 2.4 4.8 5.8Z" fill={P.silver} />
          <path d="M10.4 3c-1.4.7-2.2 2-2.2 3.6 0 1.3.5 2.3 1.2 3-1.6-.5-2.6-1.9-2.6-3.6C6.8 4.2 8.3 2.8 10.4 3Z" fill={P.white} opacity={0.55} />
          <rect x="5.8" y="15.2" width="12.4" height="2.2" rx="0.8" fill={P.steel} />
          <rect x="8" y="17.4" width="8" height="2.6" fill={P.silver} />
          <rect x="5" y="19.8" width="14" height="2.4" rx="1" fill={P.steel} />
        </>
      )
    case 'display-case':
      return (
        <>
          <rect x="3.2" y="17.2" width="17.6" height="4" rx="1.4" fill={P.woodDark} />
          <rect x="4.4" y="2.8" width="15.2" height="14.6" rx="1" fill={P.sky} opacity={0.8} />
          <rect x="10.4" y="7" width="3.2" height="2.2" fill={P.goldDark} />
          <path d="M9.8 9h4.4l.8 4.4a3 3 0 0 1-6 0Z" fill={P.gold} />
          <path d="M6.6 17.4 11 4.2h1.8L8.4 17.4Z" fill={P.white} opacity={0.55} />
          <rect x="3.6" y="2" width="16.8" height="2.2" rx="1.1" fill={P.wood} />
          <rect x="3.8" y="2.8" width="1.6" height="14.6" fill={P.wood} />
          <rect x="18.6" y="2.8" width="1.6" height="14.6" fill={P.wood} />
        </>
      )
    case 'skeleton':
      return (
        <>
          <path d="M12 2.4c-4.3 0-6.9 2.9-6.9 6.6 0 2.2 1 3.9 2.3 5v1.4h9.2V14c1.3-1.1 2.3-2.8 2.3-5 0-3.7-2.6-6.6-6.9-6.6Z" fill={P.bone} />
          <circle cx="9.2" cy="9.4" r="2.1" fill={P.charcoal} />
          <circle cx="14.8" cy="9.4" r="2.1" fill={P.charcoal} />
          <path d="M12 12.2l1.3 2.2h-2.6Z" fill={P.charcoal} />
          <path d="M7.6 15.4h8.8v3.4a1.6 1.6 0 0 1-1.6 1.6H9.2a1.6 1.6 0 0 1-1.6-1.6Z" fill={P.boneDark} />
          <rect x="9.4" y="15.4" width="1.4" height="2.6" fill={P.bone} />
          <rect x="11.9" y="15.4" width="1.4" height="2.6" fill={P.bone} />
          <rect x="14.4" y="15.4" width="1.4" height="2.6" fill={P.bone} />
        </>
      )

    /* --- Casino ------------------------------------------------------------ */
    case 'card-table':
      return (
        <>
          <rect x="10.8" y="14" width="2.4" height="6.2" fill={P.woodDark} />
          <rect x="7.4" y="19.6" width="9.2" height="2.2" rx="1.1" fill={P.woodDark} />
          <ellipse cx="12" cy="11.6" rx="9.6" ry="6.4" fill={P.greenDark} />
          <ellipse cx="12" cy="10.8" rx="8.2" ry="5.4" fill={P.green} />
          <g transform="rotate(-14 10 11)">
            <rect x="7.6" y="7.8" width="4.8" height="6.4" rx="0.9" fill={P.cream} />
          </g>
          <g transform="rotate(13 14 11)">
            <rect x="11.8" y="7.8" width="4.8" height="6.4" rx="0.9" fill={P.white} />
            <path d="m14.2 9.6 1.3 1.7-1.3 1.7-1.3-1.7Z" fill={P.red} />
          </g>
        </>
      )
    case 'slot-machine':
      return (
        <>
          <circle cx="20.4" cy="6.2" r="1.9" fill={P.redDark} />
          <rect x="19.5" y="6.2" width="1.8" height="6.4" rx="0.9" fill={P.steel} />
          <rect x="3" y="2.4" width="15.6" height="19.2" rx="2.2" fill={P.red} />
          <rect x="4.4" y="3.8" width="12.8" height="3.2" rx="1" fill={P.sun} />
          <rect x="4.4" y="7.8" width="12.8" height="6.4" rx="1" fill={P.cream} />
          <circle cx="7.2" cy="11" r="1.6" fill={P.red} />
          <circle cx="10.8" cy="11" r="1.6" fill={P.gold} />
          <circle cx="14.4" cy="11" r="1.6" fill={P.teal} />
          <rect x="5.8" y="15.4" width="10" height="3" rx="0.9" fill={P.charcoal} />
          <rect x="7.4" y="19.2" width="6.8" height="1.4" rx="0.7" fill={P.redDark} />
        </>
      )
    case 'chip-stack':
      return (
        <>
          <ellipse cx="12" cy="18.4" rx="7" ry="3" fill={P.blueDark} />
          <ellipse cx="12" cy="16.9" rx="7" ry="3" fill={P.blue} />
          <ellipse cx="12" cy="14.4" rx="7" ry="3" fill={P.redDark} />
          <ellipse cx="12" cy="12.9" rx="7" ry="3" fill={P.red} />
          <ellipse cx="12" cy="10.4" rx="7" ry="3" fill={P.greenDark} />
          <ellipse cx="12" cy="8.9" rx="7" ry="3" fill={P.green} />
          <ellipse cx="12" cy="8.9" rx="3" ry="1.3" fill={P.cream} />
          <rect x="5.6" y="8.2" width="1.8" height="1.4" rx="0.7" fill={P.cream} />
          <rect x="16.6" y="8.2" width="1.8" height="1.4" rx="0.7" fill={P.cream} />
        </>
      )
    case 'chandelier':
      return (
        <>
          <rect x="11.3" y="1.6" width="1.4" height="3.6" fill={P.goldDark} />
          <path d="M12 5.6C6.4 6.8 4 9.2 4 12M12 5.6c5.6 1.2 8 3.6 8 6.4" stroke={P.gold} strokeWidth="1.6" />
          <ellipse cx="12" cy="5.2" rx="2.6" ry="1" fill={P.gold} />
          <rect x="3" y="8.2" width="2.2" height="4.2" fill={P.cream} />
          <rect x="10.9" y="6.2" width="2.2" height="6.2" fill={P.cream} />
          <rect x="18.8" y="8.2" width="2.2" height="4.2" fill={P.cream} />
          <path d="M4.1 8.2c-1.6-1.4-.3-2.6 0-3.5.3.9 1.6 2.1 0 3.5ZM12 6.2c-1.6-1.4-.3-2.6 0-3.5.3.9 1.6 2.1 0 3.5ZM19.9 8.2c-1.6-1.4-.3-2.6 0-3.5.3.9 1.6 2.1 0 3.5Z" fill={P.sun} />
          <ellipse cx="12" cy="13" rx="8.4" ry="2.6" fill="none" stroke={P.gold} strokeWidth="2.8" />
          <path d="M8 16.2 9.4 19.6 10.8 16.2ZM13.2 16.2 14.6 19.6 16 16.2Z" fill={P.goldDark} />
        </>
      )
    case 'bar-counter':
      return (
        <>
          <rect x="5.6" y="3.4" width="2.8" height="5.2" rx="0.9" fill={P.green} />
          <rect x="6.5" y="1.6" width="1" height="2" fill={P.greenDark} />
          <path d="M13 3.8h6l-3 3.6Z" fill={P.glass} />
          <rect x="15.5" y="7" width="1" height="1.8" fill={P.silver} />
          <rect x="13.8" y="8.4" width="4.4" height="1" rx="0.5" fill={P.silver} />
          <rect x="1.6" y="8.8" width="20.8" height="3" rx="1.5" fill={P.woodLight} />
          <rect x="3.2" y="11.6" width="17.6" height="9.6" rx="1.2" fill={P.wood} />
          <rect x="8.4" y="11.6" width="1.4" height="9.6" fill={P.woodDark} />
          <rect x="14.2" y="11.6" width="1.4" height="9.6" fill={P.woodDark} />
        </>
      )

    /* --- Cirque ------------------------------------------------------------ */
    case 'trapeze':
      return (
        <>
          <rect x="3.6" y="1.8" width="16.8" height="2.2" rx="1.1" fill={P.charcoal} />
          <path d="M7.2 4v11.4M16.8 4v11.4" stroke={P.wood} strokeWidth="2" />
          <rect x="4.4" y="15" width="15.2" height="2.6" rx="1.3" fill={P.gold} />
          <rect x="6.2" y="15.4" width="4" height="1" rx="0.5" fill={P.white} opacity={0.45} />
          <circle cx="7.2" cy="15.2" r="1.3" fill={P.goldDark} />
          <circle cx="16.8" cy="15.2" r="1.3" fill={P.goldDark} />
        </>
      )
    case 'cage':
      return (
        <>
          <rect x="3.4" y="4.6" width="17.2" height="15" rx="1.2" fill={P.charcoal} />
          <rect x="5.2" y="4.6" width="1.5" height="15" fill={P.gold} />
          <rect x="8.4" y="4.6" width="1.5" height="15" fill={P.gold} />
          <rect x="11.6" y="4.6" width="1.5" height="15" fill={P.gold} />
          <rect x="14.8" y="4.6" width="1.5" height="15" fill={P.gold} />
          <rect x="18" y="4.6" width="1.5" height="15" fill={P.gold} />
          <rect x="2.4" y="3.4" width="19.2" height="2.6" rx="1.3" fill={P.goldDark} />
          <rect x="2.4" y="18.4" width="19.2" height="2.8" rx="1.4" fill={P.goldDark} />
        </>
      )
    case 'crate':
      return (
        <>
          <rect x="2.4" y="5.2" width="19.2" height="14" rx="1.6" fill={P.woodDark} />
          <path d="M5 16.4 19 8.2" stroke={P.wood} strokeWidth="2.8" strokeLinecap="butt" />
          <rect x="2.4" y="5.2" width="19.2" height="3.2" rx="1.6" fill={P.woodLight} />
          <rect x="2.4" y="16" width="19.2" height="3.2" rx="1.6" fill={P.wood} />
          <rect x="7.4" y="8.4" width="1.4" height="7.6" fill={P.wood} opacity={0.55} />
          <rect x="15.2" y="8.4" width="1.4" height="7.6" fill={P.wood} opacity={0.55} />
        </>
      )
    case 'spotlight':
      return (
        <>
          <path d="M13.6 6.4 22.4 2.4v11.6Z" fill={P.sun} opacity={0.65} />
          <circle cx="13" cy="9.8" r="3.6" fill={P.sun} />
          <rect x="5.4" y="6" width="8" height="7.6" rx="1.8" fill={P.charcoal} />
          <rect x="6.6" y="7.2" width="2.4" height="1.4" rx="0.7" fill={P.white} opacity={0.35} />
          <rect x="8.4" y="13.2" width="2" height="5.6" fill={P.steel} />
          <rect x="4.8" y="18.4" width="9.2" height="2.4" rx="1.2" fill={P.slate} />
        </>
      )

    /* --- Théâtre ------------------------------------------------------------ */
    case 'curtain':
      return (
        <>
          <rect x="5.4" y="4" width="13.2" height="17.2" fill={P.purpleDark} />
          <path d="M2.6 4.2h7.2c0 5.6-1.4 10.4-1.4 17H2.6Z" fill={P.red} />
          <path d="M21.4 4.2h-7.2c0 5.6 1.4 10.4 1.4 17h5.8Z" fill={P.red} />
          <path d="M5.4 4.2c0 5.6-.9 10.4-.9 17M18.6 4.2c0 5.6.9 10.4.9 17" stroke={P.redDark} strokeWidth="1.4" />
          <rect x="1.4" y="2.2" width="21.2" height="2.4" rx="1.2" fill={P.goldDark} />
        </>
      )
    case 'piano':
      return (
        <>
          <rect x="2.6" y="3.4" width="18.8" height="15.4" rx="2" fill={P.charcoal} />
          <rect x="1.8" y="2.6" width="20.4" height="2.8" rx="1.4" fill={P.slate} />
          <rect x="4" y="6.4" width="16" height="3.6" rx="0.9" fill={P.slate} />
          <rect x="4" y="11" width="16" height="5.6" rx="0.9" fill={P.cream} />
          <rect x="6.2" y="11" width="1.4" height="3.4" fill={P.charcoal} />
          <rect x="8.8" y="11" width="1.4" height="3.4" fill={P.charcoal} />
          <rect x="12.6" y="11" width="1.4" height="3.4" fill={P.charcoal} />
          <rect x="15" y="11" width="1.4" height="3.4" fill={P.charcoal} />
          <rect x="17.4" y="11" width="1.4" height="3.4" fill={P.charcoal} />
          <rect x="4" y="18.6" width="2.8" height="2.8" rx="0.8" fill={P.charcoal} />
          <rect x="17.2" y="18.6" width="2.8" height="2.8" rx="0.8" fill={P.charcoal} />
        </>
      )
    case 'clothes-rack':
      return (
        <>
          <rect x="3" y="4.4" width="1.8" height="14.4" fill={P.steel} />
          <rect x="19.2" y="4.4" width="1.8" height="14.4" fill={P.steel} />
          <rect x="2.2" y="3.6" width="19.6" height="2" rx="1" fill={P.silver} />
          <path d="M6.8 6h2.8l1 8.8H5.8Z" fill={P.red} />
          <path d="M10.6 6h2.8l1 8.8H9.6Z" fill={P.blue} />
          <path d="M14.4 6h2.8l1 8.8h-4.8Z" fill={P.gold} />
          <rect x="1.6" y="18.4" width="4.6" height="1.8" rx="0.9" fill={P.steel} />
          <rect x="17.8" y="18.4" width="4.6" height="1.8" rx="0.9" fill={P.steel} />
          <circle cx="3.4" cy="21" r="1.3" fill={P.charcoal} />
          <circle cx="20.6" cy="21" r="1.3" fill={P.charcoal} />
        </>
      )
    case 'mirror':
      return (
        <>
          <rect x="10.6" y="17.6" width="2.8" height="2.8" fill={P.goldDark} />
          <rect x="6.6" y="20" width="10.8" height="2.2" rx="1.1" fill={P.goldDark} />
          <ellipse cx="12" cy="10.2" rx="7.4" ry="8.4" fill={P.gold} />
          <ellipse cx="12" cy="10.2" rx="5.6" ry="6.6" fill={P.glass} />
          <path d="M8.8 14.6 12.4 4.6h1.8l-3.6 10Z" fill={P.white} opacity={0.7} />
        </>
      )

    /* --- Manoir victorien --------------------------------------------------- */
    case 'fireplace':
      return (
        <>
          <rect x="2.4" y="4.4" width="19.2" height="16.8" rx="1.4" fill={P.clay} />
          <rect x="1.4" y="2.6" width="21.2" height="2.8" rx="1.4" fill={P.woodDark} />
          <path d="M6.2 21.2v-6.4a5.8 5.8 0 0 1 11.6 0v6.4Z" fill={P.ink} />
          <path d="M12 9.8c2 1.9 3.1 3.4 3.1 5.1a3.1 3.1 0 0 1-6.2 0c0-1.7 1.1-3.2 3.1-5.1Z" fill={P.red} />
          <path d="M12 13c1 1 1.6 1.8 1.6 2.7a1.6 1.6 0 0 1-3.2 0c0-.9.6-1.7 1.6-2.7Z" fill={P.sun} />
          <rect x="8" y="18.2" width="8" height="2" rx="1" fill={P.woodDark} />
        </>
      )
    case 'bookshelf':
      return (
        <>
          <rect x="2.8" y="2.2" width="18.4" height="19.6" rx="1.8" fill={P.woodDark} />
          <rect x="4.2" y="3.6" width="15.6" height="5.2" fill={P.woodLight} />
          <rect x="4.2" y="9.8" width="15.6" height="5.2" fill={P.woodLight} />
          <rect x="4.2" y="16" width="15.6" height="4.6" fill={P.woodLight} />
          <rect x="5.2" y="4.2" width="2" height="4.6" fill={P.red} />
          <rect x="7.6" y="4.2" width="1.8" height="4.6" fill={P.blue} />
          <rect x="9.8" y="4.2" width="2.2" height="4.6" fill={P.green} />
          <rect x="12.4" y="4.2" width="1.8" height="4.6" fill={P.gold} />
          <rect x="5.2" y="10.4" width="1.8" height="4.6" fill={P.teal} />
          <rect x="7.4" y="10.4" width="2.2" height="4.6" fill={P.red} />
          <rect x="10" y="10.4" width="1.8" height="4.6" fill={P.purple} />
          <rect x="12.2" y="10.4" width="2" height="4.6" fill={P.blue} />
          <rect x="5.2" y="16.6" width="2.2" height="4" fill={P.gold} />
          <rect x="7.8" y="16.6" width="1.8" height="4" fill={P.green} />
          <rect x="10" y="16.6" width="2" height="4" fill={P.red} />
        </>
      )
    case 'armor':
      return (
        <>
          <rect x="11" y="1" width="2" height="2.2" rx="1" fill={P.red} />
          <path d="M12 2.4c-2.7 0-4.4 1.9-4.4 4.4v2.4h8.8V6.8c0-2.5-1.7-4.4-4.4-4.4Z" fill={P.silver} />
          <rect x="8.4" y="6" width="7.2" height="1.6" rx="0.8" fill={P.charcoal} />
          <circle cx="6" cy="12.4" r="2.9" fill={P.steel} />
          <circle cx="18" cy="12.4" r="2.9" fill={P.steel} />
          <path d="M8 9.6h8a1.8 1.8 0 0 1 1.8 1.8v4.2c0 2.4-2.6 4.2-5.8 4.2s-5.8-1.8-5.8-4.2v-4.2A1.8 1.8 0 0 1 8 9.6Z" fill={P.chrome} />
          <rect x="7.4" y="16.6" width="9.2" height="2" rx="1" fill={P.gold} />
          <rect x="8.8" y="18.4" width="2.6" height="3.4" rx="0.8" fill={P.steel} />
          <rect x="12.6" y="18.4" width="2.6" height="3.4" rx="0.8" fill={P.steel} />
        </>
      )

    default: {
      const exhaustive: never = type
      return exhaustive
    }
  }
}
