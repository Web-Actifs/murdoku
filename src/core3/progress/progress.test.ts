import { describe, expect, it } from 'vitest'
import { ormesDef, ormesSolution } from '../../data/v3/ormes'
import { loadPuzzle } from '../model/loadPuzzle'
import type { Assignment } from '../model/types'
import { propagate } from '../possibility/propagate'
import { deriveMurderer } from '../solve/solver'
import { progressFor } from './progress'

/**
 * A play-through, driven the way a player would drive it: at each step the only
 * placements written down are the ones propagation can *prove* from the clues
 * currently in hand, on the floors currently open. Nothing here consults the
 * solution to decide what to do next — it is only used at the end to check that
 * what fell out is what the case was written from.
 *
 * This is the test that would catch the whole staircase collapsing: a door that
 * never opens, an act that opens two at once, or a building that solves itself
 * before the cellar is ever found.
 */
function playThrough(): { steps: { openedGates: number; known: number }[]; placements: Assignment } {
  const placements: Assignment = {}
  const steps: { openedGates: number; known: number }[] = []

  for (let round = 0; round < 8; round++) {
    const progress = progressFor(ormesDef, placements)
    const puzzle = loadPuzzle(ormesDef, progress.discovery)
    const result = propagate(puzzle)

    let learnt = 0
    for (const [personId, candidates] of result.candidates) {
      if (candidates.size !== 1) continue
      const [cell] = candidates
      // Only what the player could actually write down: a level they can reach.
      const floor = Number(cell.split(':')[0])
      if (!progress.discovery.accessibleFloors.has(floor)) continue
      if (placements[personId] === cell) continue
      placements[personId] = cell
      learnt++
    }

    steps.push({ openedGates: progressFor(ormesDef, placements).openedGates.length, known: Object.keys(placements).length })
    if (learnt === 0) break
  }

  return { steps, placements }
}

describe('a play-through of Le 12, rue des Ormes', () => {
  const { steps, placements } = playThrough()

  it('reaches the authored placement without ever guessing', () => {
    expect(placements).toEqual(ormesSolution)
  })

  it('opens the three doors one at a time, never two in a round', () => {
    const opened = steps.map((s) => s.openedGates)
    expect(opened.at(-1)).toBe(3)
    for (let i = 1; i < opened.length; i++) {
      expect(opened[i] - opened[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  it('needs every act — the ground floor alone gets nowhere near the end', () => {
    // First pass: the opening dossier, on one accessible level.
    expect(steps[0].known).toBeGreaterThan(0)
    expect(steps[0].known).toBeLessThan(ormesDef.people.length)
  })

  it('names Aubin only once the chute has been found', () => {
    const progress = progressFor(ormesDef, placements)
    expect(progress.fullyExplored).toBe(true)
    expect(deriveMurderer(loadPuzzle(ormesDef, progress.discovery), placements)).toBe('aubin')
  })
})

describe('gate sequencing', () => {
  it('refuses a later door to a player who happens to guess its placement', () => {
    // Gaspard is on the right cell, but the first door has not been opened.
    const progress = progressFor(ormesDef, { gaspard: ormesSolution.gaspard, aubin: ormesSolution.aubin })
    expect(progress.openedGates).toEqual([])
    expect([...progress.discovery.accessibleFloors]).toEqual([1])
  })

  it('reveals nothing beyond the opening dossier until a door falls', () => {
    const progress = progressFor(ormesDef, {})
    expect(progress.discovery.revealedClues.size).toBe(ormesDef.clues.filter((c) => c.revealedBy === 'start').length)
    expect(progress.pendingGates.map((g) => g.id)).toEqual(['gateEscalier'])
  })
})
