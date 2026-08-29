import type { Constraint } from '../constraints/types'
import { loadPuzzle } from '../model/loadPuzzle'
import type { PersonDef, Puzzle, PuzzleDef, SceneObject, Zone } from '../model/types'

/**
 * Deliberate, assumed scope cut: the generator never invents the *building*.
 * Producing a credible plan (shape, connectivity, plausible furniture) is a
 * separate problem from producing a sound puzzle, so the scene stays
 * hand-authored and only the solution and the clues are generated (Claude/claude.md §39).
 */
export interface GeneratorShell {
  id: string
  plan: string
  legend: Record<string, string>
  zones: Zone[]
  objects: SceneObject[]
  peopleIds: string[]
  victimId: string
  /** i18n keys per person; defaults to the person id when absent. */
  nameKeys?: Record<string, string>
}

/** Strips an authored case back down to its scene — the exact input the generator expects. */
export function shellFromDef(def: PuzzleDef): GeneratorShell {
  return {
    id: def.id,
    plan: def.plan,
    legend: def.legend,
    zones: def.zones,
    objects: def.objects,
    peopleIds: def.people.map((p) => p.id),
    victimId: def.victimId,
    nameKeys: Object.fromEntries(def.people.map((p) => [p.id, p.nameKey])),
  }
}

export function shellToDef(shell: GeneratorShell, clues: ReadonlyMap<string, Constraint[]>): PuzzleDef {
  const people: PersonDef[] = shell.peopleIds.map((id) => {
    const person: PersonDef = { id, nameKey: shell.nameKeys?.[id] ?? id, constraints: clues.get(id) ?? [] }
    if (id === shell.victimId) person.isVictim = true
    return person
  })

  return {
    id: shell.id,
    plan: shell.plan,
    legend: shell.legend,
    zones: shell.zones,
    objects: shell.objects,
    people,
    victimId: shell.victimId,
  }
}

/** The clue-less puzzle: a normalized board plus the cast, used as the search's fixed base. */
export function loadShell(shell: GeneratorShell): Puzzle {
  return loadPuzzle(shellToDef(shell, new Map()))
}

/**
 * Re-dresses an already-normalized puzzle with a new clue set. The board never
 * changes during a search, so rebuilding it through loadPuzzle on every one of
 * the hundreds of propagate() calls would only re-parse and re-validate the same
 * plan. The generated def is still round-tripped through loadPuzzle once at the end.
 */
export function puzzleWithClues(base: Puzzle, clues: ReadonlyMap<string, Constraint[]>): Puzzle {
  return { ...base, people: base.people.map((p) => ({ ...p, constraints: clues.get(p.id) ?? [] })) }
}
