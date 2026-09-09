import type { ReactNode } from 'react'
import { GOLD, INK, deepen, type PersonLook } from './personArt'

/**
 * ---------------------------------------------------------------------------
 * HAIR, HATS AND BEARDS
 * ---------------------------------------------------------------------------
 * Ten silhouettes per gender bank, drawn for the period the cases are set in —
 * cloche hats and finger waves, fedoras, peaked caps and pomade. The
 * silhouette does most of the identifying work at small sizes, so every entry
 * is shaped to be told apart in outline alone: a bun sticks out, a ponytail
 * sticks out, a brim is wider than a head.
 *
 * Each style returns three layers, because a beard has to sit UNDER the mouth
 * and a fringe has to sit OVER the forehead:
 *   back  — behind the head (long hair, buns, afro halo, ponytails)
 *   beard — over the jaw, before the face is drawn, so lips stay readable
 *   front — fringes, hats, moustaches
 *
 * Contours come from the enclosing group paint-order stroke, so nothing here
 * sets its own outline unless it wants a different weight (or none at all).
 * ---------------------------------------------------------------------------
 */

export interface HairLayers {
  back?: ReactNode
  beard?: ReactNode
  front?: ReactNode
}

/** Face shadow cast by a hat brim — the thing that makes a hat sit ON a head. */
function brimShade(headClip: string, y: number): ReactNode {
  return (
    <g clipPath={`url(#${headClip})`}>
      <rect x={26} y={14} width={48} height={y - 14} fill={INK} opacity={0.22} stroke="none" />
    </g>
  )
}

/* -------------------------------------------------------------------------- */
/* Women                                                                       */
/* -------------------------------------------------------------------------- */

function womanHair(look: PersonLook, headClip: string): HairLayers {
  const { hair, hairDark, hairLight, accent } = look

  const cap = <path d="M26.5 49 C26.5 25.5 36 14.5 50 14.5 C64 14.5 73.5 25.5 73.5 49 C73.5 57 71.5 63.5 68.5 68 L31.5 68 C28.5 63.5 26.5 57 26.5 49 Z" fill={hair} />
  const swept = <path d="M31.5 45 C32.1 27.5 39.8 20 50 20 C60.2 20 67.9 27.5 68.5 45 C66.8 34.6 62.6 29.8 55 28.4 C48.5 33.5 39.4 34.9 33.9 32.4 C32.6 35.9 31.9 40.2 31.5 45 Z" fill={hair} />
  const blunt = <path d="M31.4 45 C31.4 27.4 39.3 19.6 50 19.6 C60.7 19.6 68.6 27.4 68.6 45 C68.6 35.6 64.2 32.4 50 32.4 C35.8 32.4 31.4 35.6 31.4 45 Z" fill={hair} />
  const parted = <path d="M31.5 45 C31.5 27.4 39.3 19.8 50 19.8 C60.7 19.8 68.5 27.4 68.5 45 C67.2 35 63.5 30.4 57.6 29.2 C55.4 32.8 44.6 32.8 42.4 29.2 C36.5 30.4 32.8 35 31.5 45 Z" fill={hair} />
  const sheen = <path d="M36.5 32.5 C39.5 26.5 44.5 23.4 50 23" fill="none" stroke={hairLight} strokeWidth={2.6} strokeLinecap="round" opacity={0.8} />

  switch (look.style) {
    case 0: // chignon bas
      return {
        back: (
          <>
            {cap}
            <ellipse cx={70.5} cy={62} rx={10.5} ry={9.5} fill={hairDark} />
            <path d="M63 57 q8 5.5 15.5 1.5" fill="none" stroke={hairLight} strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
          </>
        ),
        front: <>{swept}{sheen}</>,
      }

    case 1: // ondulations Marcel
      return {
        back: <path d="M26.5 47 C26.5 24.5 36 13.5 50 13.5 C64 13.5 73.5 24.5 73.5 47 L73.5 64 C73.5 70 68.8 72.5 65.2 69.6 L65.2 47 L34.8 47 L34.8 69.6 C31.2 72.5 26.5 70 26.5 64 Z" fill={hair} />,
        front: (
          <>
            {blunt}
            <g fill="none" stroke={hairDark} strokeWidth={1.8} strokeLinecap="round" opacity={0.85}>
              <path d="M33.6 26.6 q8 4.6 16.4 1.6 q8.4 -3 16.4 1.6" />
              <path d="M32.6 31.4 q8.4 4.6 17.4 1.6 q9 -3 17.4 1.6" />
            </g>
          </>
        ),
      }

    case 2: // cheveux longs
      return {
        back: <path d="M25.5 47 C25.5 23.5 35.5 12.5 50 12.5 C64.5 12.5 74.5 23.5 74.5 47 L74.5 91 C74.5 96 69.5 97.5 66 94 L66 49 L34 49 L34 94 C30.5 97.5 25.5 96 25.5 91 Z" fill={hair} />,
        front: <>{parted}{sheen}</>,
      }

    case 3: // tresse couronne
      return {
        back: cap,
        front: (
          <>
            {parted}
            <path d="M30.8 36 C36.6 25.6 42.8 21 50 21 C57.2 21 63.4 25.6 69.2 36" fill="none" stroke={hairDark} strokeWidth={7.5} strokeLinecap="round" />
            <g fill="none" stroke={hairLight} strokeWidth={1.5} strokeLinecap="round" opacity={0.7}>
              <path d="M35.5 31.5 l3.5 3" />
              <path d="M42.5 26.5 l3 3.6" />
              <path d="M50.5 24.4 l2 4" />
              <path d="M58 26 l1 4.2" />
              <path d="M64.5 31 l0 4.2" />
            </g>
          </>
        ),
      }

    case 4: // chapeau cloche
      return {
        back: <path d="M28 50 C28 28 37 17 50 17 C63 17 72 28 72 50 C72 54 70.5 58 68.5 60.5 L31.5 60.5 C29.5 58 28 54 28 50 Z" fill={hair} />,
        front: (
          <>
            {brimShade(headClip, 40)}
            <path d="M31 34 C31 16.5 38.6 9.5 50 9.5 C61.4 9.5 69 16.5 69 34 Z" fill={accent} />
            <path d="M31.2 28.6 L68.8 28.6 L69 34 L31 34 Z" fill={deepen(accent, 0.34)} />
            <ellipse cx={50} cy={35.6} rx={27} ry={5.8} fill={accent} />
            <circle cx={62} cy={23.5} r={4.4} fill={deepen(accent, 0.5)} />
            <circle cx={66.6} cy={26.6} r={3.2} fill={deepen(accent, 0.5)} />
          </>
        ),
      }

    case 5: // boucles courtes
      return {
        back: (
          <g fill={hair}>
            <circle cx={50} cy={20} r={13} />
            <circle cx={34} cy={28} r={11} />
            <circle cx={66} cy={28} r={11} />
            <circle cx={29} cy={44} r={9} />
            <circle cx={71} cy={44} r={9} />
            <circle cx={31} cy={57} r={7.5} />
            <circle cx={69} cy={57} r={7.5} />
          </g>
        ),
        front: (
          <g fill={hair}>
            <circle cx={38.5} cy={29.5} r={7.4} />
            <circle cx={50} cy={26} r={7.8} />
            <circle cx={61.5} cy={29.5} r={7.4} />
          </g>
        ),
      }

    case 6: // queue de cheval haute
      return {
        back: (
          <>
            {cap}
            <path d="M65 19.5 C83 17.5 93 30 91 45.5 C89 59.5 80.5 68.5 70 69.5 C79 57.5 83 41 71 29.5 Z" fill={hair} />
            <rect x={59} y={16.5} width={10.5} height={6.6} rx={3.3} fill={accent} />
          </>
        ),
        front: <>{swept}{sheen}</>,
      }

    case 7: // foulard noué
      return {
        back: <path d="M28.5 48 C28.5 27 37.5 17 50 17 C62.5 17 71.5 27 71.5 48 C71.5 52 70 56 68 58.5 L32 58.5 C30 56 28.5 52 28.5 48 Z" fill={hair} />,
        front: (
          <>
            <path d="M30 39 C30 20.5 39 13 50 13 C61 13 70 20.5 70 39 C70 36 65.5 33.6 50 33.6 C34.5 33.6 30 36 30 39 Z" fill={accent} />
            <path d="M69 36 C74.5 33.6 78 36 77 40 C82 41 82.5 45.4 78.5 47 C74 48.8 69.6 45 68.6 40.4 Z" fill={accent} />
            <g fill={deepen(accent, 0.4)} stroke="none" opacity={0.85}>
              <circle cx={40} cy={24} r={2.1} />
              <circle cx={52} cy={19.5} r={2.1} />
              <circle cx={62} cy={26} r={2.1} />
              <circle cx={45} cy={31} r={1.8} />
              <circle cx={58} cy={31.6} r={1.8} />
            </g>
          </>
        ),
      }

    case 8: // volume afro
      return {
        back: (
          <g fill={hair}>
            <circle cx={50} cy={38} r={27.5} />
            <circle cx={31} cy={25} r={11} />
            <circle cx={69} cy={25} r={11} />
            <circle cx={50} cy={13.5} r={12} />
            <circle cx={24.5} cy={44} r={10} />
            <circle cx={75.5} cy={44} r={10} />
          </g>
        ),
        front: (
          <>
            <path d="M32 42 C33 30 40 24.5 50 24.5 C60 24.5 67 30 68 42 C69.5 27 61 18.5 50 18.5 C39 18.5 30.5 27 32 42 Z" fill={hair} />
            <g fill={hairLight} stroke="none" opacity={0.5}>
              <circle cx={38} cy={22} r={2.2} />
              <circle cx={50} cy={16.5} r={2.4} />
              <circle cx={62} cy={22} r={2.2} />
              <circle cx={30} cy={34} r={2} />
              <circle cx={70} cy={34} r={2} />
            </g>
          </>
        ),
      }

    default: // 9 — chignon haut + bandeau
      return {
        back: (
          <>
            {cap}
            <ellipse cx={50} cy={10.5} rx={10.5} ry={9} fill={hairDark} />
          </>
        ),
        front: (
          <>
            {parted}
            <path d="M30.6 34 C36.6 24.6 42.8 20.5 50 20.5 C57.2 20.5 63.4 24.6 69.4 34 L67.2 39 C61.8 30.4 56.4 27 50 27 C43.6 27 38.2 30.4 32.8 39 Z" fill={accent} />
          </>
        ),
      }
  }
}

/* -------------------------------------------------------------------------- */
/* Men                                                                         */
/* -------------------------------------------------------------------------- */

function manHair(look: PersonLook, headClip: string): HairLayers {
  const { hair, hairDark, hairLight, accent, garment } = look
  const hat = deepen(garment, 0.14)

  const shortBack = <path d="M29.4 47 C29.4 26 38 16.5 50 16.5 C62 16.5 70.6 26 70.6 47 C70.6 53 69 57.5 67 61 L33 61 C31 57.5 29.4 53 29.4 47 Z" fill={hair} />
  const underHat = <path d="M31 44 C31 28 39 21 50 21 C61 21 69 28 69 44 L69 52 L31 52 Z" fill={hair} />
  const moustache = (
    <path d="M38.6 57.8 C40.4 54.8 44.2 54 47.4 55.8 C48.5 56.4 51.5 56.4 52.6 55.8 C55.8 54 59.6 54.8 61.4 57.8 C58 59.9 54 60.4 50 60.2 C46 60.4 42 59.9 38.6 57.8 Z" fill={hairDark} />
  )

  switch (look.style) {
    case 0: // gominé, raie sur le côté
      return {
        back: shortBack,
        front: (
          <>
            <path d="M30.4 44 C31 26.5 38.6 19 50 19 C61.4 19 69 26.5 69.6 44 C68 32.5 63.6 27.6 56.4 26.4 C49.6 31.8 39.6 33.2 34.2 30.6 C32.6 34.2 31 38.8 30.4 44 Z" fill={hair} />
            <g fill="none" stroke={hairLight} strokeWidth={1.8} strokeLinecap="round" opacity={0.75}>
              <path d="M40 29.4 C46 26 52 24.6 58.4 25.4" />
              <path d="M37.6 33.6 C43 30.4 48.4 29 54 29.2" />
            </g>
          </>
        ),
      }

    case 1: // fedora
      return {
        back: underHat,
        front: (
          <>
            {brimShade(headClip, 41)}
            <path d="M33 33 C33 17 39.5 10 50 10 C60.5 10 67 17 67 33 Z" fill={hat} />
            <path d="M41.5 13.5 C45 18 55 18 58.5 13.5" fill="none" stroke={INK} strokeWidth={1.8} opacity={0.5} />
            <path d="M32.8 26.6 L67.2 26.6 L67 33 L33 33 Z" fill={accent} />
            <path d="M20 35.6 C20 31.6 33 29 50 29 C67 29 80 31.6 80 35.6 C80 39.8 67 42.4 50 42.4 C33 42.4 20 39.8 20 35.6 Z" fill={hat} />
          </>
        ),
      }

    case 2: // casquette galonnée
      return {
        back: underHat,
        front: (
          <>
            {brimShade(headClip, 42)}
            <path d="M31.4 32 C31.4 18.5 39.4 13.5 50 13.5 C60.6 13.5 68.6 18.5 68.6 32 Z" fill="#2c3a4a" />
            <path d="M30.6 29.6 L69.4 29.6 L69.4 35.8 L30.6 35.8 Z" fill={INK} />
            <path d="M27 39.4 C34.5 46 65.5 46 73 39.4 C73 35.6 27 35.6 27 39.4 Z" fill="#1d2730" />
            <circle cx={50} cy={23.4} r={5} fill={GOLD} />
            <circle cx={50} cy={23.4} r={1.9} fill="#2c3a4a" stroke="none" />
          </>
        ),
      }

    case 3: // dégarni + moustache
      return {
        back: <path d="M30.2 48 C30.2 40.5 31.8 34.6 34.2 30.4 C39.2 34 60.8 34 65.8 30.4 C68.2 34.6 69.8 40.5 69.8 48 C69.8 54 68.2 58 66 61 L34 61 C31.8 58 30.2 54 30.2 48 Z" fill={hair} />,
        front: (
          <>
            <path d="M30.8 52 C30.4 42 31.6 35 34.6 30 C36.5 31.5 37.6 33.4 37.8 35.8 C35.4 40.2 34.6 45.8 35.4 52 Z" fill={hair} />
            <path d="M69.2 52 C69.6 42 68.4 35 65.4 30 C63.5 31.5 62.4 33.4 62.2 35.8 C64.6 40.2 65.4 45.8 64.6 52 Z" fill={hair} />
            {moustache}
          </>
        ),
      }

    case 4: // barbe fournie
      return {
        back: <path d="M29.6 48 C29.6 26 38.4 16 50 16 C61.6 16 70.4 26 70.4 48 C70.4 54 68.8 58 66.8 61 L33.2 61 C31.2 58 29.6 54 29.6 48 Z" fill={hair} />,
        beard: (
          <path d="M30.9 44 C30.9 44 31.6 56.5 34 62.5 C37.6 71.5 43.5 75.5 50 75.5 C56.5 75.5 62.4 71.5 66 62.5 C68.4 56.5 69.1 44 69.1 44 C69.1 53.5 61.5 58 50 58 C38.5 58 30.9 53.5 30.9 44 Z" fill={hairDark} />
        ),
        front: (
          <>
            <path d="M30.4 44 C31 25.5 38.6 18 50 18 C61.4 18 69 25.5 69.6 44 C67.6 33 62 28.4 55.6 30.4 C50.6 33.8 42 34 36.4 31 C33.4 33.8 31.4 38 30.4 44 Z" fill={hair} />
            {moustache}
          </>
        ),
      }

    case 5: // boucles
      return {
        back: (
          <g fill={hair}>
            <circle cx={50} cy={21} r={12.5} />
            <circle cx={35} cy={28} r={10.5} />
            <circle cx={65} cy={28} r={10.5} />
            <circle cx={30.5} cy={43} r={8.5} />
            <circle cx={69.5} cy={43} r={8.5} />
          </g>
        ),
        front: (
          <g fill={hair}>
            <circle cx={39} cy={28.5} r={7} />
            <circle cx={50} cy={25.5} r={7.4} />
            <circle cx={61} cy={28.5} r={7} />
          </g>
        ),
      }

    case 6: // coupe brosse
      return {
        back: <path d="M30.6 46 L30.6 26 C30.6 21.4 34 18.8 50 18.8 C66 18.8 69.4 21.4 69.4 26 L69.4 46 Z" fill={hair} />,
        front: (
          <>
            <path d="M31 40 L31 26.6 C31 23 35 21 50 21 C65 21 69 23 69 26.6 L69 40 C67 33.4 61 30.8 50 30.8 C39 30.8 33 33.4 31 40 Z" fill={hair} />
            <path d="M35 24.6 C41 22.6 59 22.6 65 24.6" fill="none" stroke={hairLight} strokeWidth={1.8} strokeLinecap="round" opacity={0.6} />
          </>
        ),
      }

    case 7: // crâne rasé + bouc
      return {
        beard: (
          <path d="M42.6 60 C42.6 60 44.4 54.6 50 54.6 C55.6 54.6 57.4 60 57.4 60 C57.4 67.6 54.4 70.6 50 70.6 C45.6 70.6 42.6 67.6 42.6 60 Z" fill={hairDark} />
        ),
        front: (
          <>
            <path d="M32.2 38 C33.4 26 40.4 20.4 50 20.4 C59.6 20.4 66.6 26 67.8 38 C67.8 30.6 60 27 50 27 C40 27 32.2 30.6 32.2 38 Z" fill={hair} opacity={0.4} stroke="none" />
            {moustache}
          </>
        ),
      }

    case 8: // mi-longs + favoris
      return {
        back: <path d="M28.6 47 C28.6 25 37.8 15 50 15 C62.2 15 71.4 25 71.4 47 C71.4 56 69.4 63 67 68 L33 68 C30.6 63 28.6 56 28.6 47 Z" fill={hair} />,
        front: (
          <>
            <path d="M30.4 45 C31 26 38.8 18.4 50 18.4 C61.2 18.4 69 26 69.6 45 C68.2 33.6 64.4 29 58.6 27.8 C55.8 31.8 44.2 31.8 41.4 27.8 C35.6 29 31.8 33.6 30.4 45 Z" fill={hair} />
            <path d="M31.8 43 L36.6 43 L36.6 55.5 L33 51 Z" fill={hair} />
            <path d="M68.2 43 L63.4 43 L63.4 55.5 L67 51 Z" fill={hair} />
          </>
        ),
      }

    default: // 9 — melon + moustache fine
      return {
        back: underHat,
        front: (
          <>
            {brimShade(headClip, 41)}
            <path d="M33.5 33 C33.5 19.5 40.4 12.5 50 12.5 C59.6 12.5 66.5 19.5 66.5 33 Z" fill={hat} />
            <path d="M33.4 27 L66.6 27 L66.5 33 L33.5 33 Z" fill={accent} />
            <path d="M27.5 35.4 C27.5 32.2 37.5 30 50 30 C62.5 30 72.5 32.2 72.5 35.4 C72.5 39.6 65 42.2 50 42.2 C35 42.2 27.5 39.6 27.5 35.4 Z" fill={hat} />
            <path d="M40.4 57.6 C43.4 55.4 47 55.8 50 57.2 C53 55.8 56.6 55.4 59.6 57.6 C56.4 59.6 53 60.2 50 59.8 C47 60.2 43.6 59.6 40.4 57.6 Z" fill={hairDark} />
          </>
        ),
      }
  }
}

export function hairLayers(look: PersonLook, headClip: string): HairLayers {
  return look.gender === 'f' ? womanHair(look, headClip) : manHair(look, headClip)
}
