import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { getHint } from '../core/hints/getHint'
import { annotate, emptyNotebook, toAssignment, withExclusion } from '../core/hints/notebook'
import type { NotebookAnnotation, PlayerNotebook } from '../core/hints/notebook'
import type { Hint, HintLevel } from '../core/hints/types'
import { loadPuzzle } from '../core/model/loadPuzzle'
import type { Assignment, Puzzle, PuzzleDef } from '../core/model/types'
import type { DeductionStep } from '../core/possibility/journal'
import { propagate } from '../core/possibility/propagate'
import { analyzeDifficulty } from '../core/proof/difficulty'
import type { PuzzleDifficulty } from '../core/proof/difficulty'
import { deriveMurderer, solvePuzzle } from '../core/solve/solver'
import { evaluateGrid, type GridOutcome } from '../game/v2Outcome'

/**
 * - `investigating` — the board is live.
 * - `verdict` — the player submitted; right and wrong cells are showing and the
 *   board is frozen until they either take the win or go back to work.
 * - `gaveUp` — the solution is on the board, nothing left to play.
 */
export type V2Phase = 'investigating' | 'verdict' | 'gaveUp'

/** Clicking a cell either commits someone to it or crosses them out of it. */
export type V2Mode = 'place' | 'cross'

interface V2State {
  notebook: PlayerNotebook
  selectedPersonId: string | null
  mode: V2Mode
  phase: V2Phase
  hint: Hint | null
  hintLevel: HintLevel
  hintsUsed: number
  /** Set only once the player asks for the notebook audit, so it never nags. */
  audited: boolean
}

type Action =
  | { type: 'SELECT_PERSON'; personId: string }
  | { type: 'SET_MODE'; mode: V2Mode }
  | { type: 'PLACE'; personId: string; cell: string }
  | { type: 'CLICK_CELL'; cell: string }
  | { type: 'ASK_HINT'; hint: Hint; level: HintLevel }
  | { type: 'APPLY_HINT' }
  | { type: 'DISMISS_HINT' }
  | { type: 'AUDIT' }
  | { type: 'SUBMIT' }
  | { type: 'RESUME' }
  | { type: 'GIVE_UP' }
  | { type: 'RESET' }

const initialState: V2State = {
  notebook: emptyNotebook(),
  selectedPersonId: null,
  mode: 'place',
  phase: 'investigating',
  hint: null,
  hintLevel: 1,
  hintsUsed: 0,
  audited: false,
}

function occupantOf(notebook: PlayerNotebook, cell: string): string | undefined {
  return Object.entries(notebook.placements).find(([, at]) => at === cell)?.[0]
}

/** No core equivalent: `withExclusion` only ever adds, but a pencil mark has to be erasable. */
function withoutExclusion(notebook: PlayerNotebook, personId: string, cell: string): PlayerNotebook {
  const kept = (notebook.exclusions[personId] ?? []).filter((c) => c !== cell)
  return { ...notebook, exclusions: { ...notebook.exclusions, [personId]: kept } }
}

function isCrossedOut(notebook: PlayerNotebook, personId: string, cell: string): boolean {
  return (notebook.exclusions[personId] ?? []).includes(cell)
}

/** One person per cell on screen, so committing to an occupied cell displaces whoever was there. */
function place(state: V2State, personId: string, cell: string): V2State {
  const placements = { ...state.notebook.placements }
  const evicted = occupantOf(state.notebook, cell)
  if (evicted && evicted !== personId) delete placements[evicted]
  placements[personId] = cell

  // Committing someone to a cell they had crossed out is a change of mind, not a
  // contradiction to keep on the books.
  const notebook = withoutExclusion({ ...state.notebook, placements }, personId, cell)
  return { ...state, notebook, selectedPersonId: null, hint: null }
}

function reducer(state: V2State, action: Action): V2State {
  if (state.phase !== 'investigating' && action.type !== 'RESET' && action.type !== 'RESUME') return state

  switch (action.type) {
    case 'SELECT_PERSON':
      return { ...state, selectedPersonId: state.selectedPersonId === action.personId ? null : action.personId }

    case 'SET_MODE':
      return { ...state, mode: action.mode }

    case 'PLACE':
      return place(state, action.personId, action.cell)

    case 'CLICK_CELL': {
      const { selectedPersonId, mode } = state
      if (mode === 'cross') {
        if (!selectedPersonId) return state
        const notebook = isCrossedOut(state.notebook, selectedPersonId, action.cell)
          ? withoutExclusion(state.notebook, selectedPersonId, action.cell)
          : withExclusion(state.notebook, selectedPersonId, action.cell)
        return { ...state, notebook }
      }

      if (selectedPersonId) return place(state, selectedPersonId, action.cell)

      // Picking someone back up off the board, exactly like V1's grid.
      const occupant = occupantOf(state.notebook, action.cell)
      if (!occupant) return state
      const placements = { ...state.notebook.placements }
      delete placements[occupant]
      return { ...state, notebook: { ...state.notebook, placements }, selectedPersonId: occupant, hint: null }
    }

    case 'ASK_HINT':
      return { ...state, hint: action.hint, hintLevel: action.level, hintsUsed: state.hintsUsed + 1 }

    case 'APPLY_HINT':
      // Not `applyHint`: a level-5 placement still has to displace whoever the
      // player had wrongly put on that cell, which the core helper does not do.
      return state.hint?.apply ? place(state, state.hint.apply.personId, state.hint.apply.cell) : state

    case 'DISMISS_HINT':
      return { ...state, hint: null }

    case 'AUDIT':
      return { ...state, audited: true }

    case 'SUBMIT':
      return { ...state, phase: 'verdict', selectedPersonId: null, hint: null }

    case 'RESUME':
      return state.phase === 'verdict' ? { ...state, phase: 'investigating' } : state

    case 'GIVE_UP':
      return { ...state, phase: 'gaveUp', selectedPersonId: null, hint: null }

    case 'RESET':
      return initialState
  }
}

interface V2SessionValue {
  state: V2State
  puzzle: Puzzle
  journal: DeductionStep[]
  solution: Assignment
  difficulty: PuzzleDifficulty
  /** Derived from the true solution, never authored (Claude/claude.md §15). */
  murdererId: string | null
  outcome: GridOutcome
  /** What the plan should show: the player's own grid, or the solution once they gave up. */
  displayed: Record<string, string | undefined>
  audit: NotebookAnnotation
  selectPerson: (personId: string) => void
  setMode: (mode: V2Mode) => void
  placeAtCell: (personId: string, cell: string) => void
  clickCell: (cell: string) => void
  askHint: (level: HintLevel) => void
  applyCurrentHint: () => void
  dismissHint: () => void
  runAudit: () => void
  submit: () => void
  resume: () => void
  giveUp: () => void
  reset: () => void
}

const V2SessionContext = createContext<V2SessionValue | null>(null)

export function V2SessionProvider({ puzzleDef, children }: { puzzleDef: PuzzleDef; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const puzzle = useMemo(() => loadPuzzle(puzzleDef), [puzzleDef])
  const journal = useMemo(() => propagate(puzzle).journal, [puzzle])
  const difficulty = useMemo(() => analyzeDifficulty(puzzle), [puzzle])
  const solution = useMemo(() => solvePuzzle(puzzle, { limit: 1 })[0], [puzzle])
  const murdererId = useMemo(() => (solution ? deriveMurderer(puzzle, solution) : null), [puzzle, solution])

  const value = useMemo<V2SessionValue>(() => {
    const outcome = evaluateGrid(puzzle, state.notebook, solution)
    return {
      state,
      puzzle,
      journal,
      solution,
      difficulty,
      murdererId,
      outcome,
      displayed: state.phase === 'gaveUp' ? solution : state.notebook.placements,
      audit: annotate(journal, state.notebook),
      selectPerson: (personId) => dispatch({ type: 'SELECT_PERSON', personId }),
      setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
      placeAtCell: (personId, cell) => dispatch({ type: 'PLACE', personId, cell }),
      clickCell: (cell) => dispatch({ type: 'CLICK_CELL', cell }),
      askHint: (level) => dispatch({ type: 'ASK_HINT', hint: getHint(journal, toAssignment(state.notebook), level), level }),
      applyCurrentHint: () => dispatch({ type: 'APPLY_HINT' }),
      dismissHint: () => dispatch({ type: 'DISMISS_HINT' }),
      runAudit: () => dispatch({ type: 'AUDIT' }),
      submit: () => dispatch({ type: 'SUBMIT' }),
      resume: () => dispatch({ type: 'RESUME' }),
      giveUp: () => dispatch({ type: 'GIVE_UP' }),
      reset: () => dispatch({ type: 'RESET' }),
    }
  }, [state, puzzle, journal, difficulty, solution, murdererId])

  return <V2SessionContext.Provider value={value}>{children}</V2SessionContext.Provider>
}

export function useV2Session(): V2SessionValue {
  const ctx = useContext(V2SessionContext)
  if (!ctx) throw new Error('useV2Session must be used within a V2SessionProvider')
  return ctx
}
