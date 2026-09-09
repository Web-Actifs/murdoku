import { useId } from 'react'
import { GOLD, INK, PAPER, deepen, mix, personLook, type PersonLook } from './personArt'
import { Backdrop } from './personBackdrops'
import { hairLayers } from './personHair'

/*
 * ---------------------------------------------------------------------------
 * PERSON AVATAR — a printed portrait card
 * ---------------------------------------------------------------------------
 * Every suspect is drawn as a small gouache-and-ink portrait mounted in a
 * white photographic frame, in the same ink weight and palette as the
 * furniture on the plan.
 *
 * Three rules hold the thing together:
 *
 *   1. THE GROUND IS THE IDENTITY. Each person owns one of twelve saturated
 *      grounds AND one of twelve motifs, dealt so no two people in a case can
 *      share either. At 48px on the plan a face is a few pixels; "the one on
 *      the green chevrons" is legible at any size, and it is the same square
 *      in the roster, on the board and in the verdict.
 *   2. THE NAME DECIDES THE BANK. Hairstyles come from a feminine or a
 *      masculine bank, chosen from the given name (see `personGender`), never
 *      from the hash — Odile does not get a moustache.
 *   3. NOTHING IS RANDOM. Every trait falls out of the person's index in the
 *      case (plus a per-case rotation), so a portrait is identical across
 *      re-renders, reloads, routes and locales.
 *
 * The drawing itself lives in three modules: `personArt` (palette + dealing),
 * `personBackdrops` (the twelve grounds), `personHair` (twenty silhouettes).
 * This file draws the body, the face, and mounts the frame.
 *
 * Authoring space is 100 x 100. Head centre (50, 44), shoulders at y = 72.
 * ---------------------------------------------------------------------------
 */

const HEAD = {
  f: 'M31.5 43 C31.5 28 39 21 50 21 C61 21 68.5 28 68.5 43 C68.5 55.5 62.5 69 50 69 C37.5 69 31.5 55.5 31.5 43 Z',
  m: 'M30.6 42.5 C30.6 27.5 38.6 20 50 20 C61.4 20 69.4 27.5 69.4 42.5 C69.4 52.5 67.4 59 63.4 63.5 C59.7 67.6 55.4 69.5 50 69.5 C44.6 69.5 40.3 67.6 36.6 63.5 C32.6 59 30.6 52.5 30.6 42.5 Z',
}

const BUST = {
  f: 'M4 100 C4 87 13 79.5 27 75.5 C34.5 73.4 42 72.2 50 72.2 C58 72.2 65.5 73.4 73 75.5 C87 79.5 96 87 96 100 Z',
  m: 'M2 100 C2 86 11.5 78.5 26 74.5 C34 72.3 42 71 50 71 C58 71 66 72.3 74 74.5 C88.5 78.5 98 86 98 100 Z',
}

const EYE_X = { left: 41.5, right: 58.5 }
const EYE_Y = 45

/** The pearls of a rope necklace, walked along an arc under the throat. */
const PEARLS = Array.from({ length: 9 }, (_, i) => {
  const t = i / 8
  return { cx: 38 + 24 * t, cy: 76 + 11 * Math.sin(Math.PI * t) }
})

function eyePath(cx: number): string {
  return `M${cx - 5.3} ${EYE_Y + 0.3} C${cx - 3} ${EYE_Y - 3.5} ${cx + 3} ${EYE_Y - 3.5} ${cx + 5.3} ${EYE_Y + 0.3} C${cx + 3} ${EYE_Y + 3.4} ${cx - 3} ${EYE_Y + 3.4} ${cx - 5.3} ${EYE_Y + 0.3} Z`
}

function Eye({ cx, look, clipId }: { cx: number; look: PersonLook; clipId: string }) {
  return (
    <g>
      {/* No contour on the white: a ringed eye reads as a spectacle lens at 48px. */}
      <path d={eyePath(cx)} fill="#fdfaf3" stroke="none" />
      <g clipPath={`url(#${clipId})`}>
        <circle cx={cx} cy={EYE_Y + 0.3} r={2.6} fill={look.eye} stroke="none" />
        <circle cx={cx} cy={EYE_Y + 0.3} r={1.2} fill={INK} stroke="none" />
        <circle cx={cx - 0.95} cy={EYE_Y - 0.8} r={0.8} fill="#ffffff" stroke="none" />
      </g>
      {/* Upper lid, heavier than the lower one — where the ink goes on a face. */}
      <path
        d={`M${cx - 5.5} ${EYE_Y + 0.1} C${cx - 3} ${EYE_Y - 4} ${cx + 3} ${EYE_Y - 4} ${cx + 5.5} ${EYE_Y + 0.1}`}
        fill="none"
        stroke={INK}
        strokeWidth={look.gender === 'f' ? 1.8 : 1.6}
        strokeLinecap="round"
      />
      {look.gender === 'f' && (
        <g fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round">
          <path d={`M${cx + 5.2} ${EYE_Y - 0.8} l2.6 -1.5`} />
          <path d={`M${cx + 5.4} ${EYE_Y + 0.6} l2.8 -0.2`} />
        </g>
      )}
    </g>
  )
}

function Brow({ cx, gender }: { cx: number; gender: 'f' | 'm' }) {
  return gender === 'f' ? (
    <path d={`M${cx - 5.9} 37.6 C${cx - 3} 35 ${cx + 2.7} 34.8 ${cx + 5.7} 37.2`} fill="none" stroke={INK} strokeWidth={1.7} strokeLinecap="round" />
  ) : (
    <path d={`M${cx - 6.3} 37.2 C${cx - 2.8} 35.1 ${cx + 2.8} 35 ${cx + 6.1} 37.5`} fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
  )
}

/** Jacket and lapels, or bodice and collar — the half of the portrait that says class. */
function Bust({ look }: { look: PersonLook }) {
  const { gender, garment, garmentDeep, accent, skin, neckwear } = look

  if (gender === 'm') {
    return (
      <>
        <path d={BUST.m} fill={garment} />
        <path d="M41 72 L50 100 L59 72 Z" fill="#f5eddd" />
        <path d="M41 72 L50 89 L36.5 100 L28 100 C28.5 88 33.5 78 41 72 Z" fill={garmentDeep} />
        <path d="M59 72 L50 89 L63.5 100 L72 100 C71.5 88 66.5 78 59 72 Z" fill={garmentDeep} />
        <path d="M43 71.4 L50 81 L44.6 84.2 Z" fill="#fffaf0" strokeWidth={1.4} />
        <path d="M57 71.4 L50 81 L55.4 84.2 Z" fill="#fffaf0" strokeWidth={1.4} />

        {neckwear === 0 && (
          <>
            <path d="M46.4 74 L53.6 74 L55 79.6 L45 79.6 Z" fill={accent} strokeWidth={1.6} />
            <path d="M45.6 79.6 L54.4 79.6 L52.4 100 L47.6 100 Z" fill={accent} strokeWidth={1.6} />
          </>
        )}
        {neckwear === 1 && (
          <>
            <path d="M50 78 L38.6 72.6 L38.6 83.6 Z" fill={accent} strokeWidth={1.6} />
            <path d="M50 78 L61.4 72.6 L61.4 83.6 Z" fill={accent} strokeWidth={1.6} />
            <rect x={46.4} y={74.4} width={7.2} height={7.2} rx={2.2} fill={deepen(accent, 0.3)} strokeWidth={1.4} />
          </>
        )}
        {neckwear === 2 && (
          <path d="M35 71 C41 79.5 59 79.5 65 71 L69.5 78 C61 89.5 39 89.5 30.5 78 Z" fill={accent} strokeWidth={1.8} />
        )}
        {neckwear === 3 && (
          <g stroke="none">
            <circle cx={50} cy={88} r={1.9} fill={INK} />
            <circle cx={50} cy={96} r={1.9} fill={INK} />
          </g>
        )}
      </>
    )
  }

  return (
    <>
      <path d={BUST.f} fill={garment} />
      <path d="M40.5 72.4 C43.5 82.4 56.5 82.4 59.5 72.4 Z" fill={skin} strokeWidth={1.8} />

      {neckwear === 0 && (
        <>
          <path d="M40.6 71.8 C42 79.6 46 83.6 50 84.8 C46.4 86.2 41 83.4 38.2 76.4 Z" fill="#fdf6e8" strokeWidth={1.6} />
          <path d="M59.4 71.8 C58 79.6 54 83.6 50 84.8 C53.6 86.2 59 83.4 61.8 76.4 Z" fill="#fdf6e8" strokeWidth={1.6} />
        </>
      )}
      {neckwear === 1 && (
        <path d="M36.5 71.6 C42 79.4 58 79.4 63.5 71.6 L67.5 78.4 C59.5 88.6 40.5 88.6 32.5 78.4 Z" fill={accent} strokeWidth={1.8} />
      )}
      {neckwear === 2 && (
        <g stroke="none">
          {PEARLS.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={2.2} fill="#f7f1e4" stroke={INK} strokeWidth={0.9} />
          ))}
        </g>
      )}
      {neckwear === 3 && (
        <path d="M40.5 71.8 C43 82 57 82 59.5 71.8 L66 76.4 C62 90 38 90 34 76.4 Z" fill={garmentDeep} strokeWidth={1.8} />
      )}
    </>
  )
}

export function PersonAvatar({
  name,
  color,
  size = 'md',
  isVictim = false,
  variantKey,
  personIndex,
  caseRotation = 0,
  showMonogram = false,
}: {
  name: string
  /** Legacy per-person colour. The portrait now carries its own ground. */
  color?: string
  size?: 'sm' | 'md' | 'base' | 'lg'
  isVictim?: boolean
  /** Stable id used to pick the portrait. Defaults to `name`. */
  variantKey?: string
  /** Person's index in the case roster — guarantees a unique ground per case. */
  personIndex?: number
  /** Case-level rotation offset, so the same index looks different case to case. */
  caseRotation?: number
  /** Show initial monogram for colourblind accessibility. */
  showMonogram?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const key = variantKey ?? name
  const look = personLook(key, personIndex, caseRotation)

  const headClip = `${uid}-head`
  const vignette = `${uid}-vig`
  const eyeL = `${uid}-eyeL`
  const eyeR = `${uid}-eyeR`

  const hair = hairLayers(look, headClip)
  const lip = mix('#bf584e', look.skin, 0.18)
  const head = HEAD[look.gender]

  const sizeClasses = { sm: 'h-8 w-8', md: 'h-12 w-12', base: 'h-20 w-20', lg: 'h-24 w-24' }[size]
  const frame = { sm: 'p-[1.5px]', md: 'p-[2px]', base: 'p-[3px]', lg: 'p-[3.5px]' }[size]

  return (
    <span
      className={`relative inline-block shrink-0 rounded-[3px] shadow-[0_2px_0_rgba(36,31,29,0.28)] ${frame} ${sizeClasses}`}
      style={{ backgroundColor: PAPER, outline: `1.5px solid ${INK}`, outlineOffset: '-1.5px' }}
      title={name}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <defs>
          <clipPath id={headClip}>
            <path d={head} />
          </clipPath>
          <clipPath id={eyeL}>
            <path d={eyePath(EYE_X.left)} />
          </clipPath>
          <clipPath id={eyeR}>
            <path d={eyePath(EYE_X.right)} />
          </clipPath>
          <radialGradient id={vignette} cx="50%" cy="42%" r="72%">
            <stop offset="55%" stopColor={look.deep} stopOpacity={0} />
            <stop offset="100%" stopColor={look.deep} stopOpacity={0.55} />
          </radialGradient>
        </defs>

        <Backdrop look={look} vignetteId={vignette} />

        {/* Everything below is inked: the stroke is painted first and the fill
            lands on top of it, so each shape gets a printed contour for free. */}
        <g stroke={INK} strokeWidth={2.2} strokeLinejoin="round" paintOrder="stroke">
          {/* neck, then shoulders over its base */}
          <path d="M43 57 L57 57 L57 78 L43 78 Z" fill={look.skin} />
          <path d="M43 57 C45.6 64.5 54.4 64.5 57 57 L57 65 C54.4 70 45.6 70 43 65 Z" fill={look.skinShade} stroke="none" />

          <Bust look={look} />

          {hair.back}

          <ellipse cx={30} cy={47} rx={3.3} ry={5} fill={look.skin} />
          <ellipse cx={70} cy={47} rx={3.3} ry={5} fill={look.skin} />

          <path d={head} fill={look.skin} />

          {/* modelling: one light source, upper left */}
          <g clipPath={`url(#${headClip})`} stroke="none">
            <ellipse cx={64} cy={46} rx={15} ry={25} fill={look.skinShade} opacity={0.5} />
            <ellipse cx={36.5} cy={53} rx={5.4} ry={3.4} fill="#dd7f6c" opacity={0.22} />
            <ellipse cx={63.5} cy={53} rx={5.4} ry={3.4} fill="#dd7f6c" opacity={0.22} />
          </g>

          {hair.beard}

          <Brow cx={EYE_X.left} gender={look.gender} />
          <Brow cx={EYE_X.right} gender={look.gender} />
          <Eye cx={EYE_X.left} look={look} clipId={eyeL} />
          <Eye cx={EYE_X.right} look={look} clipId={eyeR} />

          <path
            d="M49.9 47 C49.5 50.6 48.5 52.5 47.4 53.5 C48.6 54.6 50.3 54.8 51.5 54.1"
            fill="none"
            stroke={INK}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.55}
          />

          {look.gender === 'f' ? (
            <g strokeWidth={1.2}>
              <path d="M42.6 60.8 C45.6 57.4 48.4 58.8 50 60.2 C51.6 58.8 54.4 57.4 57.4 60.8 Z" fill={lip} />
              <path d="M42.6 60.8 C46 66.6 54 66.6 57.4 60.8 Z" fill={lip} />
            </g>
          ) : (
            <>
              <path d="M43.6 60.2 C46.6 63.6 53.4 63.6 56.4 60.2" fill="none" stroke={INK} strokeWidth={2.3} strokeLinecap="round" />
              <path d="M45.4 64.4 C47.6 65.6 52.4 65.6 54.6 64.4" fill="none" stroke={look.skinShade} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
            </>
          )}

          {hair.front}

          {look.gender === 'f' && look.jewel && (
            <g strokeWidth={1.3}>
              <circle cx={29.6} cy={53} r={2.6} fill={GOLD} />
              <circle cx={70.4} cy={53} r={2.6} fill={GOLD} />
            </g>
          )}

          {look.glasses && (
            <g fill="#cdeefb" fillOpacity={0.28} stroke={INK} strokeWidth={2.2} paintOrder="normal">
              <circle cx={EYE_X.left} cy={EYE_Y} r={8.2} />
              <circle cx={EYE_X.right} cy={EYE_Y} r={8.2} />
              <path d={`M${EYE_X.left + 8.2} ${EYE_Y - 0.6} q3.3 -1.6 6.6 0`} fill="none" strokeWidth={1.8} />
              <path d="M33.3 43.6 L29.4 42.4" fill="none" strokeWidth={1.8} />
              <path d="M66.7 43.6 L70.6 42.4" fill="none" strokeWidth={1.8} />
            </g>
          )}
        </g>
      </svg>

      {isVictim && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <rect width="100" height="100" fill={INK} opacity={0.55} />
            <path d="M18 20 82 81M82 20 18 81" stroke={PAPER} strokeWidth="13" strokeLinecap="round" fill="none" opacity={0.9} />
            <path d="M18 20 82 81M82 20 18 81" stroke="#c8321f" strokeWidth="7" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      )}

      {showMonogram && (
        <span
          aria-hidden
          className="absolute bottom-0.5 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full text-[0.6rem] font-bold text-white ring-1 ring-white"
          style={{ backgroundColor: color ?? look.deep }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}

export { caseRotationFor } from './personArt'
