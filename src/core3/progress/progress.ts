import type { Assignment, Discovery, Gate, PuzzleDef } from '../model/types'

export interface Progress {
  /** Gates the player's own notebook has opened, in the order they fell. */
  openedGates: string[]
  discovery: Discovery
  /** Gates that are reachable but still shut — what the player is currently working towards. */
  pendingGates: Gate[]
  /** True once every floor and every link is in hand: the point at which an accusation is allowed. */
  fullyExplored: boolean
}

/**
 * The building's response to the player's reasoning.
 *
 * A gate is open when the notebook holds exactly the placement it asks for. That
 * is all: no button, no "validate" step. Put the right person on the right cell
 * and a lock turns somewhere.
 *
 * The one bit of information this leaks is confirmation — a player who guesses
 * the placement learns they were right. That is bounded and deliberate: every
 * gate's fact is *already* entailed by the clues in hand (enforced by the case
 * tests through `entailsPlacement`), so a player who is reading properly learns
 * nothing they had not already proved, and a guesser buys one bit at the cost of
 * a wrong grid to un-tangle later. `requiresGate` stops that one bit from
 * becoming a skipped act.
 */
export function progressFor(def: PuzzleDef, placements: Assignment): Progress {
  const opened: string[] = []
  const openedSet = new Set<string>()

  let changed = true
  while (changed) {
    changed = false
    for (const gate of def.gates) {
      if (openedSet.has(gate.id)) continue
      if (gate.requiresGate && !openedSet.has(gate.requiresGate)) continue
      if (placements[gate.requires.personId] !== gate.requires.cell) continue
      openedSet.add(gate.id)
      opened.push(gate.id)
      changed = true
    }
  }

  const accessibleFloors = new Set<number>(def.startFloors)
  const unlockedLinks = new Set<string>()
  for (const gate of def.gates) {
    if (!openedSet.has(gate.id)) continue
    if (gate.unlocksFloor !== undefined) accessibleFloors.add(gate.unlocksFloor)
    if (gate.unlocksLink !== undefined) unlockedLinks.add(gate.unlocksLink)
  }

  const revealedClues = new Set(def.clues.filter((c) => c.revealedBy === 'start' || openedSet.has(c.revealedBy)).map((c) => c.id))

  const pendingGates = def.gates.filter((g) => !openedSet.has(g.id) && (!g.requiresGate || openedSet.has(g.requiresGate)))

  return {
    openedGates: opened,
    discovery: { revealedClues, unlockedLinks, accessibleFloors },
    pendingGates,
    fullyExplored: accessibleFloors.size === def.floors.length && unlockedLinks.size === def.links.length,
  }
}

/** Which act the player is in — used for headings and for the "you've done all you can here" nudge. */
export function actIndexOf(def: PuzzleDef, openedGates: readonly string[]): number {
  void def
  return openedGates.length
}
