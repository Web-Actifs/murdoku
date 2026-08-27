import type { ReactNode } from 'react'
import type { DecorType } from '../../engine/types'

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function DecorIcon({ type, className }: { type: DecorType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...common}>
      {renderShape(type)}
    </svg>
  )
}

function renderShape(type: DecorType): ReactNode {
  switch (type) {
    case 'plant':
      return (
        <>
          <path d="M12 21v-8" />
          <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
          <path d="M12 13c3 0 5-2 5-5-3 0-5 2-5 5Z" />
          <path d="M8 21h8" />
        </>
      )
    case 'chair':
      return (
        <>
          <path d="M7 3v18" />
          <path d="M7 7h4" />
          <path d="M7 13h11" />
          <path d="M18 13v8" />
        </>
      )
    case 'sofa':
      return (
        <>
          <path d="M5 12V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
          <path d="M4 12h16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Z" />
          <path d="M5 17v2M19 17v2" />
        </>
      )
    case 'tv':
      return (
        <>
          <rect x="3" y="5" width="18" height="12" rx="1.5" />
          <path d="M9 21h6M12 17v4" />
        </>
      )
    case 'tool-bench':
      return (
        <>
          <rect x="2" y="9" width="20" height="3" rx="1" />
          <path d="M5 12v7M19 12v7" />
          <rect x="15" y="4" width="4" height="4" rx="0.5" />
          <path d="M17 8v1" />
        </>
      )
    case 'toolbox':
      return (
        <>
          <rect x="3" y="9" width="18" height="10" rx="1.5" />
          <path d="M8 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 13h18" />
        </>
      )
    case 'car':
      return (
        <>
          <path d="M4 16v-3l2-4a2 2 0 0 1 2-1h8a2 2 0 0 1 2 1l2 4v3" />
          <path d="M4 16h16" />
          <circle cx="7.5" cy="16.5" r="1.5" />
          <circle cx="16.5" cy="16.5" r="1.5" />
        </>
      )
    case 'tire-stack':
      return (
        <>
          <circle cx="12" cy="7" r="4" />
          <circle cx="12" cy="7" r="1.3" />
          <circle cx="12" cy="16" r="4" />
          <circle cx="12" cy="16" r="1.3" />
        </>
      )
    case 'speaker':
      return (
        <>
          <rect x="6" y="3" width="12" height="18" rx="1.5" />
          <circle cx="12" cy="8" r="2" />
          <circle cx="12" cy="15" r="3" />
        </>
      )
    case 'window':
      return (
        <>
          <rect x="4" y="4" width="16" height="16" rx="1" />
          <path d="M12 4v16M4 12h16" />
        </>
      )
    case 'table':
      return (
        <>
          <rect x="3" y="6" width="18" height="3" rx="1" />
          <path d="M6 9v10M18 9v10" />
        </>
      )
    case 'locker':
      return (
        <>
          <rect x="6" y="3" width="12" height="18" rx="1" />
          <path d="M12 3v18" />
          <circle cx="10" cy="11" r="0.8" fill="currentColor" />
          <circle cx="14" cy="11" r="0.8" fill="currentColor" />
        </>
      )
    case 'punching-bag':
      return (
        <>
          <path d="M12 2v3" />
          <path d="M9 5h6l1 7a4 4 0 0 1-8 0Z" />
          <path d="M10.5 12h3" />
        </>
      )
    case 'dumbbell':
      return (
        <>
          <path d="M7 9v6M17 9v6" />
          <rect x="4" y="10" width="3" height="4" rx="1" />
          <rect x="17" y="10" width="3" height="4" rx="1" />
          <path d="M7 12h10" />
        </>
      )
    case 'trophy':
      return (
        <>
          <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
          <path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" />
          <path d="M12 13v4" />
          <path d="M9 20h6M9.5 20a2.5 2.5 0 0 1 5 0" />
        </>
      )
  }
}
