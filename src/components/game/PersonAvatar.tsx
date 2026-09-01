import type { ReactNode } from 'react'

/*
 * ---------------------------------------------------------------------------
 * PERSON AVATAR — flat "puzzle book portrait" style
 * ---------------------------------------------------------------------------
 * Instead of initials in a circle, every character gets a flat, geometric
 * illustrated bust mounted like a small photograph (white frame + ink contour),
 * matching the printed puzzle-book look.
 *
 * The illustration is picked DETERMINISTICALLY from a stable key (see
 * `variantKey`, defaults to `name`), so the same character always renders the
 * same face across re-renders, reloads and route changes. There is no
 * randomness anywhere in this file.
 *
 * Variety = 13 hair/facial styles x 6 skin tones x 7 hair colors x 6 garment
 * colors x glasses on/off, all drawn on the character's own `color` backdrop.
 * ---------------------------------------------------------------------------
 */

const INK = '#241f1d'

const SKIN = ['#f4d7bd', '#eec19c', '#dda878', '#c08655', '#96603a', '#6d4326']
const HAIR = ['#241f1d', '#4a3226', '#7b4a2a', '#b0632c', '#dfb964', '#9aa3ab', '#c05b3c']
const GARMENT = ['#2f3a45', '#4b3f5c', '#7a4a3c', '#3f5c52', '#8a7a52', '#5a6b7c']

/** FNV-1a 32-bit — small, stable, dependency-free. */
function hashString(value: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function pick<T>(list: T[], hash: number, spread: number): T {
  return list[Math.floor(hash / spread) % list.length]
}

/** Hair drawn *behind* the head (long hair, afro halo, ponytail). */
function hairBack(style: number, hair: string): ReactNode {
  switch (style) {
    case 3: // afro halo
      return (
        <>
          <circle cx="24" cy="14" r="12.4" fill={hair} />
          <circle cx="14" cy="18" r="6.6" fill={hair} />
          <circle cx="34" cy="18" r="6.6" fill={hair} />
        </>
      )
    case 4: // long straight
      return <rect x="11" y="11" width="26" height="27" rx="11" fill={hair} />
    case 6: // ponytail
      return <path d="M32 14c7 1.4 8.4 8.6 6.4 15.6-4.6-1.2-5.8-7-7.6-10.4Z" fill={hair} />
    case 7: // bob
      return <rect x="11.4" y="10.6" width="25.2" height="23" rx="11.5" fill={hair} />
    case 12: // long wavy
      return (
        <path
          d="M11.4 21c0-8.6 5.6-13.4 12.6-13.4S36.6 12.4 36.6 21v13c-1.8 1.6-4 1-4.6-1.4V22H16v9.6c-.6 2.4-2.8 3-4.6 1.4Z"
          fill={hair}
        />
      )
    default:
      return null
  }
}

/** Hair / facial hair drawn *over* the head. */
function hairFront(style: number, hair: string): ReactNode {
  const cap = <path d="M14 20.4c0-7.4 4.5-12.4 10-12.4s10 5 10 12.4c-1.6-4.8-3.4-6.6-10-6.6s-8.4 1.8-10 6.6Z" fill={hair} />
  const buzz = <path d="M14.4 20.4c.6-6.8 4.6-11 9.6-11s9 4.2 9.6 11c-1.6-3.8-4.6-5.4-9.6-5.4s-8 1.6-9.6 5.4Z" fill={hair} />
  const beard = (
    <path d="M14.4 22.4c0 7.2 4.3 11.4 9.6 11.4s9.6-4.2 9.6-11.4c0 4.2-3.1 6.2-9.6 6.2s-9.6-2-9.6-6.2Z" fill={hair} />
  )
  const mustache = <path d="M18.2 25.4c1.7-1.5 3.5-1.1 5.8-1.1s4.1-.4 5.8 1.1c-1.5 1.9-3.5 2.5-5.8 2.5s-4.3-.6-5.8-2.5Z" fill={hair} />

  switch (style) {
    case 0: // receding / horseshoe
      return (
        <>
          <ellipse cx="15.1" cy="19.6" rx="2.7" ry="5.2" fill={hair} transform="rotate(-12 15.1 19.6)" />
          <ellipse cx="32.9" cy="19.6" rx="2.7" ry="5.2" fill={hair} transform="rotate(12 32.9 19.6)" />
        </>
      )
    case 1:
      return cap
    case 2: // side part
      return (
        <path
          d="M14 20.4c0-7.4 4.5-12.4 10-12.4s10 5 10 12.4c-1.2-5.2-2.8-7-7-7.6-3.4 3.2-8.6 3.8-11.4 2.8-.7 1.5-1.2 3.1-1.6 4.8Z"
          fill={hair}
        />
      )
    case 3: // afro fringe
      return <path d="M14.6 19.4c1.4-4.4 4.4-6.4 9.4-6.4s8 2 9.4 6.4c.6-6.6-3.6-11-9.4-11s-10 4.4-9.4 11Z" fill={hair} />
    case 4:
      return cap
    case 5: // top knot
      return (
        <>
          <circle cx="24" cy="5.6" r="4.6" fill={hair} />
          {cap}
        </>
      )
    case 6:
      return cap
    case 7: // bob + straight fringe
      return <path d="M14 20c0-7.2 4.5-12 10-12s10 4.8 10 12c0-4.4-2.2-5.6-10-5.6S14 15.6 14 20Z" fill={hair} />
    case 8: // buzz + full beard
      return (
        <>
          {beard}
          {buzz}
        </>
      )
    case 9: // cap + mustache
      return (
        <>
          {cap}
          {mustache}
        </>
      )
    case 10: // spiky
      return (
        <path
          d="M13.8 20 16.2 10.6l2.6 5.4L21.6 8.6l2.4 6.6 2.6-6.6 2.8 7.4 2.4-5 2.4 8.6c-2-4.4-4.6-6-10.2-6s-8.2 1.6-10.2 6Z"
          fill={hair}
        />
      )
    case 11: // bald + beard
      return beard
    case 12: // long wavy, centre part
      return (
        <path
          d="M14 20.4c0-7.4 4.5-12.4 10-12.4s10 5 10 12.4c-1.2-5.2-3.6-7.6-7.2-7.6-1.4 1.9-4.2 1.9-5.6 0-3.6 0-6 2.4-7.2 7.6Z"
          fill={hair}
        />
      )
    default:
      return cap
  }
}

const STYLE_COUNT = 13

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
  color: string
  size?: 'sm' | 'md' | 'lg'
  isVictim?: boolean
  /** Stable id used to pick the portrait. Defaults to `name`. */
  variantKey?: string
  /** Person's index in the case roster — if provided, traits are index-based to prevent collisions. */
  personIndex?: number
  /** Case-level rotation offset to vary appearances across cases. */
  caseRotation?: number
  /** Show initial monogram for colourblind accessibility. */
  showMonogram?: boolean
}) {
  const sizeClasses = { sm: 'h-8 w-8', md: 'h-12 w-12', lg: 'h-20 w-20' }[size]
  const frame = { sm: 'p-[1.5px]', md: 'p-[2px]', lg: 'p-[3px]' }[size]

  let style: number
  let skin: string
  let hair: string
  let garment: string
  let hasGlasses: boolean

  if (personIndex !== undefined) {
    // Index-based trait dealing (Opus fix 1): zero collisions, case rotation to vary appearance.
    const rot = caseRotation
    style = (personIndex + rot) % STYLE_COUNT
    skin = SKIN[(personIndex * 5 + rot) % SKIN.length]  // stride 5, coprime with 6
    hair = HAIR[(personIndex * 3 + rot) % HAIR.length]  // stride 3, coprime with 7
    garment = GARMENT[(personIndex + rot) % GARMENT.length]
    hasGlasses = (personIndex + rot) % 3 === 0  // 1 in 3 chance
  } else {
    // Fallback to hash-based for non-V2 contexts
    const h = hashString(variantKey ?? name)
    style = h % STYLE_COUNT
    skin = pick(SKIN, h, 13)
    hair = pick(HAIR, h, 149)
    garment = pick(GARMENT, h, 1597)
    hasGlasses = Math.floor(h / 20011) % 4 === 0
  }

  return (
    <span
      className={`relative inline-block shrink-0 rounded-[3px] bg-white shadow-[0_2px_0_rgba(36,31,29,0.25)] ${frame} ${sizeClasses}`}
      style={{ outline: `1.5px solid ${INK}`, outlineOffset: '-1.5px' }}
      title={name}
    >
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">
        <rect width="48" height="48" fill={color} />

        {/* bust */}
        <path d="M1 48v-2.8c0-6.9 9.2-10.8 23-10.8s23 3.9 23 10.8V48Z" fill={garment} />
        <path d="M19.9 35.4 24 41.4l4.1-6" fill="none" stroke={INK} strokeWidth="1.5" opacity={0.3} />

        {/* neck */}
        <rect x="20.4" y="26" width="7.2" height="10.4" rx="3" fill={skin} />
        <rect x="20.4" y="26" width="7.2" height="4.4" rx="2.2" fill={INK} opacity={0.16} />

        {hairBack(style, hair)}

        {/* head */}
        <ellipse cx="24" cy="20.6" rx="9.4" ry="11.4" fill={skin} />
        <circle cx="14.7" cy="21.8" r="2" fill={skin} />
        <circle cx="33.3" cy="21.8" r="2" fill={skin} />

        {/* eyes */}
        <ellipse cx="20.5" cy="20.6" rx="1.25" ry="1.6" fill={INK} />
        <ellipse cx="27.5" cy="20.6" rx="1.25" ry="1.6" fill={INK} />

        {hairFront(style, hair)}

        {hasGlasses && (
          <g fill="none" stroke={INK} strokeWidth="1.3">
            <rect x="15.8" y="17.2" width="6.8" height="5.4" rx="2.4" />
            <rect x="25.4" y="17.2" width="6.8" height="5.4" rx="2.4" />
            <path d="M22.6 19.6h2.8M15.8 19.6h-2M32.2 19.6h2" />
          </g>
        )}
      </svg>

      {isVictim && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 48 48" className="h-full w-full">
            <rect width="48" height="48" fill={INK} opacity={0.58} />
            <path
              d="M9 10 39 39M39 10 9 39"
              stroke="#fdf6ec"
              strokeWidth="6.2"
              strokeLinecap="round"
              fill="none"
              opacity={0.9}
            />
            <path d="M9 10 39 39M39 10 9 39" stroke="#c8321f" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          </svg>
        </span>
      )}

      {showMonogram && (
        <span
          aria-hidden
          className="absolute bottom-0.5 left-1/2 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full text-[0.6rem] font-bold text-white ring-1 ring-white"
          style={{ backgroundColor: color }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}
