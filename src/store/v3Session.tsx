import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { cellKey, unoccupiableCells } from '../core3/model/geometry'
import { fullDiscovery, loadPuzzle } from '../core3/model/loadPuzzle'
import type { Assignment, Puzzle, PuzzleDef } from '../core3/model/types'
import { propagate } from '../core3/possibility/propagate'
import { analyzeDifficulty, type PuzzleDifficulty } from '../core3/proof/difficulty'
import { progressFor, type Progress } from '../core3/progress/progress'
import { deriveMurderer } from '../core3/solve/solver'

/**
 * - `investigating` — the building is live.
 * - `verdict` — an accusation has been made; the board is frozen until the
 *   player takes the win or goes back to work.
 * - `gaveUp` — the solution is on the board, nothing left to play.
 */
export type V3Phase = 'investigating' | 'verdict' | 'gaveUp'

/** Clicking a cell either commits someone to it or crosses them out of it. */
export type V3Mode = 'place' | 'cross'

interface V3State {
  placements: Assignment
  exclusions: Record<string, string[]>
  selectedPersonId: string | null
  mode: V3Mode
  phase: V3Phase
  accusedId: string | null
}

type Action =
  | { type: 'SELECT_PERSON'; personId: string }
  | { type: 'SET_MODE'; mode: V3Mode }
  | { type: 'CLICK_CELL'; cell: string }
  | { type: 'PLACE'; personId: string; cell: string }
  | { type: 'ACCUSE'; personId: string }
  | { type: 'RESUME' }
  | { type: 'GIVE_UP'; solution: Assignment }
  | { type: 'RESET' }

const initialState: V3State = {
  placements: {},
  exclusions: {},
  selectedPersonId: null,
  mode: 'place',
  phase: 'investigating',
  accusedId: null,
}

function occupantOf(placements: Assignment, cell: string): string | undefined {
  return Object.entries(placements).find(([, at]) => at === cell)?.[0]
}

function place(state: V3State, personId: string, cell: string): V3State {
  const placements = { ...state.placements }
  const evicted = occupantOf(placements, cell)
  if (evicted && evicted !== personId) delete placements[evicted]
  placements[personId] = cell

  // Committing someone to a cell they had crossed out is a change of mind, not a
  // contradiction to keep on the books.
  const kept = (state.exclusions[personId] ?? []).filter((c) => c !== cell)
  return { ...state, placements, exclusions: { ...state.exclusions, [personId]: kept }, selectedPersonId: null }
}

function reducer(state: V3State, action: Action): V3State {
  switch (action.type) {
    case 'SELECT_PERSON':
      return { ...state, selectedPersonId: action.personId === state.selectedPersonId ? null : action.personId }
    case 'SET_MODE':
      return { ...state, mode: action.mode, selectedPersonId: null }
    case 'PLACE':
      return place(state, action.personId, action.cell)
    case 'CLICK_CELL': {
      if (state.phase !== 'investigating') return state
      const target = state.selectedPersonId ?? occupantOf(state.placements, action.cell)
      if (!target) return state

      if (state.mode === 'cross') {
        const current = state.exclusions[target] ?? []
        const next = current.includes(action.cell) ? current.filter((c) => c !== action.cell) : [...current, action.cell]
        return { ...state, exclusions: { ...state.exclusions, [target]: next } }
      }

      // Clicking the cell someone already occupies lifts them off it.
      if (!state.selectedPersonId && state.placements[target] === action.cell) {
        const placements = { ...state.placements }
        delete placements[target]
        return { ...state, placements, selectedPersonId: target }
      }
      return place(state, target, action.cell)
    }
    case 'ACCUSE':
      return { ...state, accusedId: action.personId, phase: 'verdict' }
    case 'RESUME':
      return { ...state, phase: 'investigating', accusedId: null }
    case 'GIVE_UP':
      return { ...state, placements: action.solution, exclusions: {}, phase: 'gaveUp', selectedPersonId: null }
    case 'RESET':
      return initialState
  }
}

export interface V3Outcome {
  placed: number
  misplaced: number
  allPlaced: boolean
  placementsCorrect: boolean
  accusationCorrect: boolean
  solved: boolean
}

interface V3Session {
  def: PuzzleDef
  /** The building as the player currently knows it — volumes reflect discovered links only. */
  puzzle: Puzzle
  /** The finished building. Never rendered; the source of the solution and the verdict. */
  full: Puzzle
  solution: Assignment
  murdererId: string | null
  difficulty: PuzzleDifficulty
  progress: Progress
  state: V3State
  /** What is drawn: the notebook while playing, the truth once it is over. */
  displayed: Assignment
  outcome: V3Outcome
  /** Gates that fell on the last change — drives the lock-click beat. */
  justOpened: string[]
  accessible: (floor: number) => boolean
  blocked: Set<string>
  selectPerson: (personId: string) => void
  setMode: (mode: V3Mode) => void
  clickCell: (cell: string) => void
  placeAtCell: (personId: string, cell: string) => void
  accuse: (personId: string) => void
  resume: () => void
  giveUp: () => void
  reset: () => void
}

const Ctx = createContext<V3Session | null>(null)

export function V3SessionProvider({ def, children }: { def: PuzzleDef; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const full = useMemo(() => loadPuzzle(def, fullDiscovery(def)), [def])
  const solution = useMemo(() => propagate(full).placements, [full])
  const murdererId = useMemo(() => (Object.keys(solution).length ? deriveMurderer(full, solution) : null), [full, solution])
  const difficulty = useMemo(() => analyzeDifficulty(full), [full])

  const progress = useMemo(() => progressFor(def, state.placements), [def, state.placements])
  const puzzle = useMemo(() => loadPuzzle(def, progress.discovery), [def, progress.discovery])
  const blocked = useMemo(() => unoccupiableCells(puzzle.board), [puzzle])

  // A door that falls is an event, not a state: it has to be noticed exactly once
  // so the lock can click and the newly-opened level can announce itself.
  const seen = useRef<string[]>([])
  const [justOpened, setJustOpened] = useState<string[]>([])
  useEffect(() => {
    const fresh = progress.openedGates.filter((id) => !seen.current.includes(id))
    seen.current = progress.openedGates
    if (fresh.length > 0) setJustOpened(fresh)
  }, [progress.openedGates])

  const displayed = state.phase === 'gaveUp' ? solution : state.placements

  const outcome = useMemo<V3Outcome>(() => {
    const people = def.people
    const placed = people.filter((p) => state.placements[p.id] !== undefined).length
    const misplaced = people.filter((p) => state.placements[p.id] !== undefined && state.placements[p.id] !== solution[p.id]).length
    const allPlaced = placed === people.length
    const placementsCorrect = allPlaced && misplaced === 0
    const accusationCorrect = state.accusedId !== null && state.accusedId === murdererId
    return { placed, misplaced, allPlaced, placementsCorrect, accusationCorrect, solved: placementsCorrect && accusationCorrect }
  }, [def.people, state.placements, state.accusedId, solution, murdererId])

  const value: V3Session = {
    def,
    puzzle,
    full,
    solution,
    murdererId,
    difficulty,
    progress,
    state,
    displayed,
    outcome,
    justOpened,
    accessible: (floor) => progress.discovery.accessibleFloors.has(floor),
    blocked,
    selectPerson: (personId) => dispatch({ type: 'SELECT_PERSON', personId }),
    setMode: (mode) => dispatch({ type: 'SET_MODE', mode }),
    clickCell: (cell) => {
      // The engine knows the whole building; the player may only act on the part
      // of it they have reached. This is the only place that rule is enforced.
      const target = puzzle.board.cellsByKey.get(cell)
      if (!target || !progress.discovery.accessibleFloors.has(target.floor)) return
      if (state.mode === 'place' && blocked.has(cell)) return
      dispatch({ type: 'CLICK_CELL', cell })
    },
    placeAtCell: (personId, cell) => {
      const target = puzzle.board.cellsByKey.get(cell)
      if (!target || !progress.discovery.accessibleFloors.has(target.floor) || blocked.has(cell)) return
      dispatch({ type: 'PLACE', personId, cell })
    },
    accuse: (personId) => dispatch({ type: 'ACCUSE', personId }),
    resume: () => dispatch({ type: 'RESUME' }),
    giveUp: () => dispatch({ type: 'GIVE_UP', solution }),
    reset: () => {
      seen.current = []
      setJustOpened([])
      dispatch({ type: 'RESET' })
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useV3Session(): V3Session {
  const value = useContext(Ctx)
  if (!value) throw new Error('useV3Session must be used inside a V3SessionProvider')
  return value
}

export { cellKey }
