export type Random = () => number

/**
 * mulberry32 — a seeded PRNG, so a generated case is reproducible from its seed
 * alone. Nothing under generate/ ever calls Math.random directly: a puzzle that
 * can't be replayed can't be debugged or regression-tested.
 */
export function makeRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled<T>(items: readonly T[], random: Random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = result[i]
    result[i] = result[j]
    result[j] = swap
  }
  return result
}

/** Picks one item with probability proportional to its weight; null on an empty list. */
export function weightedPick<T>(items: readonly T[], weightOf: (item: T) => number, random: Random): T | null {
  let total = 0
  for (const item of items) total += Math.max(0, weightOf(item))
  if (items.length === 0 || total <= 0) return items.length === 0 ? null : items[Math.floor(random() * items.length)]

  let ticket = random() * total
  for (const item of items) {
    ticket -= Math.max(0, weightOf(item))
    if (ticket <= 0) return item
  }
  return items[items.length - 1]
}
