import { useCallback, useState } from 'react'

/** Same `murdoku-*` namespace the language detector writes under. */
const STORAGE_KEY = 'murdoku-v2-tutorial-seen'

/**
 * Whether this browser has already been walked through the V2 rules, and a way to
 * record that it has. Storage that throws (private mode, blocked cookies) reads as
 * *seen*: an intro that cannot remember it ran would otherwise reopen on every
 * single case the player starts.
 */
export function useTutorialSeen(): [boolean, () => void] {
  const [seen, setSeen] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== null
    } catch {
      return true
    }
  })

  const markSeen = useCallback(() => {
    setSeen(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Nothing to do: the flag is a convenience, never a gate.
    }
  }, [])

  return [seen, markSeen]
}
